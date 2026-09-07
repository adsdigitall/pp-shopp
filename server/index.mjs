import { createServer } from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { initEnv } from './lib/env.mjs';
import { loadShopeeConfig, ShopeeConfigError } from './services/shopee/config.mjs';
import { ShopeeApiError } from './services/shopee/client.mjs';
import {
  searchProductOffers,
  mapFilterToShopeeArgs,
} from './services/shopee/products.mjs';
import { normalizeProductOffers } from './services/shopee/normalizer.mjs';
import { fetchRecentConversions } from './services/shopee/reports.mjs';
import { getPublicKey, saveSubscription, notifySubscribers } from './services/push.mjs';
import { normalizeWahaGroups } from './services/waha/groups.mjs';
import { renderWhatsAppMessage } from './services/waha/message.mjs';

// Mercado Livre
import { loadMercadoLivreConfig, MercadoLivreConfigError, buildMercadoLivreAuthUrl } from './services/marketplace/mercadoLivreConfig.mjs';
import { MercadoLivreProvider, MLApiError } from './services/marketplace/MercadoLivreProvider.mjs';
import { AffiliateLinkProviderFactory, AffiliateProviderType } from './services/marketplace/AffiliateLinkProvider.mjs';
import {
  CredentialsStore,
  AffiliateConfigStore,
  PublicationHistoryStore,
  AutoSearchConfigStore,
  ClickTrackingStore,
  WhatsAppGroupsStore,
  DispatchStore,
  DispatchAutomationStore,
  WebhookEventStore,
  MirroringConfigStore,
  WhatsAppSessionStore,
} from './services/storage/DataStore.mjs';
import { dataStore } from './services/storage/DataStore.mjs';
import { createSupabaseAnalyticsStore } from './services/analytics/SupabaseAnalyticsStore.mjs';

// Carrega segredos antes de inicializar os clientes de integração.
initEnv();

// Waha WhatsApp HTTP API
const WAHA_BASE_URL = process.env.WAHA_BASE_URL || 'http://localhost:3000';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
const RADAR_API_TOKEN = process.env.RADAR_API_TOKEN || '';
const WAHA_WEBHOOK_URL = process.env.WAHA_WEBHOOK_URL || '';
const WAHA_WEBHOOK_HMAC_KEY = process.env.WAHA_WEBHOOK_HMAC_KEY || '';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
// O fluxo padrão é Radar -> worker -> WAHA. Um webhook legado só pode ser
// ativado explicitamente, pois ele não recebe o sinal de cancelamento do Radar.
const USE_LEGACY_N8N_DISPATCH = process.env.ENABLE_LEGACY_N8N_DISPATCH === 'true' && Boolean(N8N_WEBHOOK_URL);
// Regra comercial: uma mesma oferta não pode voltar para o mesmo grupo antes
// de três dias. A variável permite aumentar a janela, mas nunca reduzi-la.
const WHATSAPP_DEDUP_WINDOW_HOURS = Math.max(72, Number(process.env.WHATSAPP_DEDUP_WINDOW_HOURS || 72) || 72);
const PROCESS_DISPATCH_INLINE = !process.env.VERCEL && process.env.DISPATCH_WORKER !== 'external';
const apiRateBuckets = new Map();

async function wahaRequest(endpoint, options = {}) {
  const url = `${WAHA_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(WAHA_API_KEY && { 'X-Api-Key': WAHA_API_KEY }),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WAHA ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  const binary = Buffer.from(await res.arrayBuffer()).toString('base64');
  return { binary, contentType };
}

async function wahaGetSession(sessionName = WAHA_SESSION) {
  try {
    const sessions = await wahaRequest('/api/sessions');
    return sessions.find(s => s.name === sessionName) || null;
  } catch {
    return null;
  }
}

async function wahaStartSession(sessionName = WAHA_SESSION) {
  const session = await wahaGetSession(sessionName);
  if (session?.status === 'WORKING') return session;

  if (!session) {
    const webhooks = WAHA_WEBHOOK_URL ? [{
      url: WAHA_WEBHOOK_URL,
      events: ['session.status', 'message', 'message.any', 'message.ack', 'message.ack.group', 'group.v2.update', 'group.v2.participants'],
      ...(WAHA_WEBHOOK_HMAC_KEY ? { hmac: { key: WAHA_WEBHOOK_HMAC_KEY } } : {}),
      retries: { policy: 'exponential', delaySeconds: 2, attempts: 5 },
    }] : [];
    await wahaRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        name: sessionName,
        start: true,
        config: { webhooks },
      }),
    });
  } else if (session.status === 'FAILED') {
    await wahaRequest(`/api/sessions/${encodeURIComponent(sessionName)}/restart`, { method: 'POST' });
  } else if (session.status !== 'WORKING' && session.status !== 'SCAN_QR_CODE') {
    await wahaRequest(`/api/sessions/${encodeURIComponent(sessionName)}/start`, { method: 'POST' });
  }
  
  // Poll briefly so serverless requests stay below the platform timeout.
  // The client continues polling /status and /qr while WAHA finishes starting.
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 500));
    const s = await wahaGetSession(sessionName);
    if (s?.status === 'SCAN_QR_CODE' || s?.status === 'WORKING') return s;
  }
  return wahaGetSession(sessionName);
}

async function wahaGetQR(sessionName = WAHA_SESSION) {
  const session = await wahaGetSession(sessionName);
  if (!session) return null;
  if (session.status === 'SCAN_QR_CODE') {
    // WAHA GOWS exposes QR retrieval as GET and returns JSON when requested
    // with an application/json Accept header (or PNG otherwise).
    const qr = await wahaRequest(`/api/${encodeURIComponent(sessionName)}/auth/qr`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return qr?.code || qr?.value || qr?.data || qr?.binary || null;
  }
  return null;
}

async function wahaGetGroups(sessionName = WAHA_SESSION) {
  const [payload, session] = await Promise.all([
    wahaRequest(`/api/${encodeURIComponent(sessionName)}/groups?limit=1000`),
    wahaGetSession(sessionName),
  ]);
  return normalizeWahaGroups(payload, sessionName, new Date().toISOString(), session?.me);
}

async function wahaSendMessage(chatId, text, mediaUrl, sessionName = WAHA_SESSION) {
  const payload = { chatId, session: sessionName, ...(mediaUrl ? { file: { url: mediaUrl }, caption: text } : { text }) };
  return wahaRequest(mediaUrl ? '/api/sendImage' : '/api/sendText', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function wahaLogout(sessionName = WAHA_SESSION) {
  try {
    await wahaRequest('/api/sessions/logout', { method: 'POST', body: JSON.stringify({ name: sessionName }) });
    return true;
  } catch {
    return false;
  }
}

const notifiedSaleIds = new Set();
const importedExtensionProducts = [];

/**
 * Backend interno do PWA de afiliados.
 *
 * Fluxo: Frontend -> GET /api/products (aqui) -> Shopee Affiliate API -> resposta
 * normalizada -> Frontend.
 *
 * SEGURANÇA: credenciais SHOPEE_APP_ID/SHOPEE_SECRET vivem apenas neste processo.
 * Elas NUNCA são retornadas nas respostas nem escritas em logs.
 */

const ALLOWED_FILTERS = [
  'trending',
  'top_sales',
  'high_commission',
  'high_discount',
];

const KIND_TO_HTTP = {
  AUTH: 401,
  NO_ACCESS: 401,
  RATE_LIMIT: 429,
  PARAMS: 400,
  TIMEOUT: 504,
  NETWORK: 502,
  UPSTREAM: 502,
};

const KIND_TO_CODE = {
  AUTH: 'SHOPEE_AUTH_ERROR',
  NO_ACCESS: 'SHOPEE_NO_ACCESS',
  RATE_LIMIT: 'SHOPEE_RATE_LIMIT',
  PARAMS: 'SHOPEE_PARAMS_ERROR',
  TIMEOUT: 'UPSTREAM_TIMEOUT',
  NETWORK: 'UPSTREAM_NETWORK_ERROR',
  UPSTREAM: 'SHOPEE_ERROR',
};

/** Mensagens seguras e amigáveis por tipo de erro. */
const KIND_TO_MESSAGE = {
  AUTH: 'Credenciais da Shopee inválidas. Verifique SHOPEE_APP_ID e SHOPEE_SECRET no .env.local.',
  NO_ACCESS: 'Sua conta ainda não tem acesso à Open API da Shopee.',
  RATE_LIMIT: 'A Shopee está limitando as requisições. Tente novamente em instantes.',
  PARAMS: 'Parâmetros inválidos na consulta à Shopee.',
  TIMEOUT: 'A Shopee demorou demais para responder. Tente novamente.',
  NETWORK: 'Não foi possível conectar à Shopee.',
  UPSTREAM: 'A Shopee retornou um erro inesperado.',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(payload);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 12_000) reject(new Error('BODY_TOO_LARGE'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function resolveDispatchImageUrl(imageUrl) {
  try {
    const url = new URL(String(imageUrl || ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  try { return JSON.parse(raw || '{}'); } catch { throw new Error('INVALID_JSON'); }
}

function requestUserId(req) {
  return String(req.headers['x-user-id'] || 'default_user');
}

function isAuthorized(req) {
  if (!RADAR_API_TOKEN) return true;
  const authorization = String(req.headers.authorization || '');
  return authorization === `Bearer ${RADAR_API_TOKEN}` || req.headers['x-radar-token'] === RADAR_API_TOKEN;
}

function rateLimit(req, limit = 120) {
  const key = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const now = Date.now();
  const bucket = apiRateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  apiRateBuckets.set(key, bucket);
  return bucket.count <= limit;
}

function webhookSignatureValid(raw, req) {
  if (!WAHA_WEBHOOK_HMAC_KEY) return true;
  const provided = String(req.headers['x-webhook-hmac'] || '');
  if (!provided) return false;
  const expected = crypto.createHmac('sha512', WAHA_WEBHOOK_HMAC_KEY).update(raw).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function handleOfferImage(req, res) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    sendJson(res, 503, { error: { code: 'OPENAI_NOT_CONFIGURED', message: 'Geração de imagem não configurada.' } });
    return;
  }
  const body = await readJsonBody(req);
  const name = typeof body.name === 'string' ? body.name.slice(0, 180) : 'Produto em oferta';
  const description = typeof body.description === 'string' ? body.description.slice(0, 300) : '';
  const discount = typeof body.discount === 'string' ? body.discount.slice(0, 30) : '';
  const price = typeof body.price === 'string' ? body.price.slice(0, 30) : '';
  const originalPrice = typeof body.originalPrice === 'string' ? body.originalPrice.slice(0, 30) : '';
  const prompt = `Crie uma imagem comercial bonita e limpa para este produto, para ser compartilhada ao lado de uma mensagem de oferta no WhatsApp. Produto: ${name}. Descrição: ${description}. Gere uma composição de lifestyle/produto com boa iluminação e fundo elegante. NÃO escreva nenhum texto, preço, percentual, URL, logotipo ou selo na imagem; a mensagem de texto será enviada separadamente.`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1536', quality: 'medium', output_format: 'jpeg' }),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    const b64 = json?.data?.[0]?.b64_json;
    if (!response.ok || typeof b64 !== 'string') {
      sendJson(res, 502, { error: { code: 'OPENAI_IMAGE_ERROR', message: 'Não foi possível gerar a arte agora.' } });
      return;
    }
    sendJson(res, 200, { imageUrl: `data:image/jpeg;base64,${b64}` });
  } catch {
    sendJson(res, 504, { error: { code: 'OPENAI_TIMEOUT', message: 'A geração demorou demais. Tente novamente.' } });
  } finally {
    clearTimeout(timer);
  }
}

async function handleOfferCopy(req, res) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    sendJson(res, 503, { error: { code: 'OPENAI_NOT_CONFIGURED', message: 'Geração de copy não configurada.' } });
    return;
  }
  const body = await readJsonBody(req);
  const name = typeof body.name === 'string' ? body.name.slice(0, 180) : 'Produto em oferta';
  const description = typeof body.description === 'string' ? body.description.slice(0, 300) : '';
  const discount = typeof body.discount === 'string' ? body.discount.slice(0, 30) : '';
  const price = typeof body.price === 'string' ? body.price.slice(0, 30) : '';
  const originalPrice = typeof body.originalPrice === 'string' ? body.originalPrice.slice(0, 30) : '';
  const link = typeof body.link === 'string' ? body.link.slice(0, 300) : '';
  const previous = typeof body.previous === 'string' ? body.previous.slice(0, 900) : '';
  const coupon = typeof body.coupon === 'string' ? body.coupon.slice(0, 60) : '';
  const nonce = Math.random().toString(36).slice(2, 10);
  const prompt = `Crie uma copy MUITO CURTA e diferente para WhatsApp. Variação ${nonce}. Use no máximo 5 linhas: chamada curta; nome resumido do produto; preço antigo/desconto/preço atual; cupom real se informado; link. Produto: ${name}. Descrição: ${description}. Preço antigo: ${originalPrice || 'não informado'}. Desconto real: ${discount || 'não informado'}. Preço atual: ${price || 'não informado'}. Cupom real: ${coupon || 'não informado'}. Link: ${link}. Copy anterior (NÃO REPETIR): ${previous || 'nenhuma'}. Não invente prazo, estoque, frete ou benefícios. NÃO inclua comissão, segredos ou dados administrativos. Retorne apenas a mensagem final com marcação WhatsApp *negrito* e ~riscado~.`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', input: prompt, temperature: 1 }),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    const text = json?.output_text || json?.output?.flatMap((item) => item?.content || []).find((item) => item?.type === 'output_text')?.text;
    if (!response.ok || typeof text !== 'string' || !text.trim()) {
      sendJson(res, 502, { error: { code: 'OPENAI_COPY_ERROR', message: 'Não foi possível gerar a copy agora.' } });
      return;
    }
    sendJson(res, 200, { copyText: text.trim() });
  } catch {
    sendJson(res, 504, { error: { code: 'OPENAI_TIMEOUT', message: 'A geração demorou demais. Tente novamente.' } });
  } finally {
    clearTimeout(timer);
  }
}

function parseProductsQuery(url) {
  const qs = url.searchParams;
  const rawFilter = (qs.get('sort') || qs.get('filter') || 'trending').trim();
  const filter = ALLOWED_FILTERS.includes(rawFilter)
    ? /** @type {any} */ (rawFilter)
    : 'trending';

  const keyword = (qs.get('keyword') || '').toString().slice(0, 80);
  const categoryIdRaw = Number.parseInt(qs.get('categoryId') || '', 10);
  const categoryId = Number.isInteger(categoryIdRaw) && categoryIdRaw > 0 ? categoryIdRaw : null;

  let page = Number.parseInt(qs.get('page') || '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > 50) page = 50;

  let limit = Number.parseInt(qs.get('limit') || '12', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 12;
  if (limit > 50) limit = 50;

  return { filter, keyword, categoryId, page, limit };
}

async function handleProducts(req, res) {
  const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
  const { filter, keyword, categoryId, page, limit } = parseProductsQuery(parsed);

  // Config lida a cada request: permite trocar .env.local sem restart
  // e facilita testes com variáveis isoladas.
  const config = loadShopeeConfig();

  const { nodes, pageInfo } = await searchProductOffers({
    keyword,
    filter,
    page,
    limit,
    categoryId,
    config,
  });

  const products = normalizeProductOffers(nodes, filter);

  sendJson(res, 200, {
    products,
    meta: {
      source: 'shopee-affiliate-api',
      operation: 'productOfferV2',
      listType: mapFilterToShopeeArgs(filter).listType,
      sortType: mapFilterToShopeeArgs(filter).sortType,
      page: pageInfo.page,
      limit: pageInfo.limit,
      hasNextPage: pageInfo.hasNextPage,
      count: products.length,
    },
    // Contrato público interno — campos privados NUNCA devem ser removidos
    // deste painel, mas também JAMAIS propagados para payloads de compartilhamento.
  });
}

async function handleSales(req, res) {
  const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
  const hoursRaw = Number.parseInt(parsed.searchParams.get('hours') || '24', 10);
  const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 168) : 24;
  const config = loadShopeeConfig();
  const { nodes, pageInfo } = await fetchRecentConversions({ config, sinceSeconds: Date.now() / 1000 - hours * 3600 });
  for (const sale of nodes) {
    const saleId = String(sale.conversionId || sale.checkoutId || '');
    if (!saleId || notifiedSaleIds.has(saleId)) continue;
    notifiedSaleIds.add(saleId);
    await notifySubscribers({ title: 'Nova venda Shopee', body: `Produto vendido — comissão: R$ ${sale.netCommission || sale.totalCommission || '—'}` });
  }
  sendJson(res, 200, { sales: nodes, meta: { source: 'shopee-affiliate-api', operation: 'conversionReport', hasNextPage: Boolean(pageInfo.hasNextPage) } });
}

async function pollSalesInBackground() {
  try {
    const config = loadShopeeConfig();
    const { nodes } = await fetchRecentConversions({ config, sinceSeconds: Date.now() / 1000 - 168 * 3600 });
    for (const sale of nodes) {
      const saleId = String(sale.conversionId || sale.checkoutId || '');
      if (!saleId || notifiedSaleIds.has(saleId)) continue;
      notifiedSaleIds.add(saleId);
      await notifySubscribers({ title: 'Nova venda Shopee', body: `Produto vendido — comissão: R$ ${sale.netCommission || sale.totalCommission || '—'}` });
    }
  } catch { /* polling não pode derrubar o servidor */ }
}

/**
 * @returns {import('node:http').Server}
 */
export function createApp() {
  return createServer(async (req, res) => {
    const startedAt = Date.now();
    const pathOnly = (req.url || '/').split('?')[0];

    try {
      const protectedPath = pathOnly.startsWith('/api/whatsapp') || pathOnly.startsWith('/api/groups') || pathOnly.startsWith('/api/dispatch') || pathOnly.startsWith('/api/offers/') || pathOnly.startsWith('/api/mirroring');
      if (protectedPath && !rateLimit(req)) {
        sendJson(res, 429, { error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em instantes.' } });
        return;
      }
      if (RADAR_API_TOKEN && protectedPath && !isAuthorized(req)) {
        sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Token de API ausente ou inválido.' } });
        return;
      }
      if (req.method === 'GET' && pathOnly === '/api/health') {
        let configured = true;
        try {
          loadShopeeConfig();
        } catch {
          configured = false;
        }
        sendJson(res, 200, { status: 'ok', shopeeConfigured: configured });
        return;
      }

      if (req.method === 'GET' && pathOnly === '/api/products') {
        await handleProducts(req, res);
        logLine(`GET /api/products 200 ${Date.now() - startedAt}ms`);
        return;
      }
      if (req.method === 'GET' && pathOnly === '/api/sales') {
        await handleSales(req, res);
        logLine(`GET /api/sales 200 ${Date.now() - startedAt}ms`);
        return;
      }
      if (req.method === 'GET' && pathOnly === '/api/push/public-key') {
        const publicKey = getPublicKey();
        sendJson(res, publicKey ? 200 : 503, publicKey ? { publicKey } : { error: { code: 'PUSH_NOT_CONFIGURED', message: 'Notificações push não configuradas.' } });
        return;
      }
      if (req.method === 'POST' && pathOnly === '/api/push/subscribe') {
        const subscription = await readJsonBody(req);
        const saved = saveSubscription(subscription);
        sendJson(res, saved ? 201 : 400, saved ? { ok: true } : { error: { code: 'INVALID_SUBSCRIPTION', message: 'Assinatura de notificação inválida.' } });
        return;
      }

      if (req.method === 'POST' && pathOnly === '/api/extension/import') {
        const expectedToken = String(process.env.EXTENSION_INGEST_TOKEN || '').trim();
        const receivedToken = String(req.headers['x-extension-token'] || '').trim();
        if (!expectedToken || receivedToken !== expectedToken) {
          sendJson(res, 401, { error: { code: 'INVALID_EXTENSION_TOKEN', message: 'Token da extensao invalido.' } });
          return;
        }
        const body = await readJsonBody(req);
        const products = Array.isArray(body?.products) ? body.products.slice(0, 100) : [];
        const valid = products.filter((item) => item && typeof item.name === 'string' && typeof item.productUrl === 'string').map((item) => ({
          name: item.name.slice(0, 240), imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.slice(0, 500) : '',
          price: typeof item.price === 'string' ? item.price.slice(0, 40) : '', productUrl: item.productUrl.slice(0, 500),
          marketplace: typeof item.marketplace === 'string' ? item.marketplace.slice(0, 80) : 'unknown', importedAt: new Date().toISOString(),
        }));
        importedExtensionProducts.push(...valid);
        while (importedExtensionProducts.length > 500) importedExtensionProducts.shift();
        sendJson(res, 201, { ok: true, imported: valid.length });
        return;
      }

      if (req.method === 'POST' && pathOnly === '/api/offer-image') {
        await handleOfferImage(req, res);
        return;
      }

if (req.method === 'POST' && pathOnly === '/api/offer-copy') {
        await handleOfferCopy(req, res);
        return;
      }

      // ========== MERCADO LIVRE ENDPOINTS ==========
      
      // GET /api/mercadolivre/auth-url - Gera URL de autorização OAuth
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/auth-url') {
        await handleMercadoLivreAuthUrl(req, res);
        return;
      }

      // POST /api/mercadolivre/callback - Callback OAuth (troca code por tokens)
      if (req.method === 'POST' && pathOnly === '/api/mercadolivre/callback') {
        await handleMercadoLivreCallback(req, res);
        return;
      }

      // GET /api/mercadolivre/status - Status da conexão
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/status') {
        await handleMercadoLivreStatus(req, res);
        return;
      }

      // POST /api/mercadolivre/disconnect - Desconecta conta
      if (req.method === 'POST' && pathOnly === '/api/mercadolivre/disconnect') {
        await handleMercadoLivreDisconnect(req, res);
        return;
      }

      // GET /api/mercadolivre/products - Busca produtos
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/products') {
        await handleMercadoLivreProducts(req, res);
        return;
      }

      // GET /api/mercadolivre/categories - Lista categorias
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/categories') {
        await handleMercadoLivreCategories(req, res);
        return;
      }

      // POST /api/mercadolivre/affiliate-link - Gera link afiliado
      if (req.method === 'POST' && pathOnly === '/api/mercadolivre/affiliate-link') {
        await handleMercadoLivreAffiliateLink(req, res);
        return;
      }

      // POST /api/mercadolivre/affiliate-config - Salva config de afiliado
      if (req.method === 'POST' && pathOnly === '/api/mercadolivre/affiliate-config') {
        await handleMercadoLivreAffiliateConfig(req, res);
        return;
      }

      // GET /api/mercadolivre/affiliate-config - Obtém config de afiliado
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/affiliate-config') {
        await handleGetMercadoLivreAffiliateConfig(req, res);
        return;
      }

      // POST /api/mercadolivre/auto-search - Configura busca automática
      if (req.method === 'POST' && pathOnly === '/api/mercadolivre/auto-search') {
        await handleMercadoLivreAutoSearch(req, res);
        return;
      }

      // GET /api/mercadolivre/auto-search - Lista buscas automáticas
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/auto-search') {
        await handleGetMercadoLivreAutoSearch(req, res);
        return;
      }

      // GET /api/mercadolivre/publication-history - Histórico de publicações
      if (req.method === 'GET' && pathOnly === '/api/mercadolivre/publication-history') {
        await handleMercadoLivrePublicationHistory(req, res);
        return;
      }

      // ========== ANALYTICS ENDPOINTS ==========

      // GET /api/analytics - visão consolidada de todos os marketplaces
      if (req.method === 'GET' && pathOnly === '/api/analytics') {
        await handleUnifiedAnalytics(req, res);
        return;
      }

      // POST /api/analytics/events - ingestão server-side de clique/comissão
      if (req.method === 'POST' && pathOnly === '/api/analytics/events') {
        await handleAnalyticsEvent(req, res);
        return;
      }
      
      // GET /api/analytics/shopee - Analytics Shopee (cliques + conversões)
      if (req.method === 'GET' && pathOnly === '/api/analytics/shopee') {
        await handleShopeeAnalytics(req, res);
        return;
      }

      // GET /api/analytics/mercadolivre - Analytics Mercado Livre
      if (req.method === 'GET' && pathOnly === '/api/analytics/mercadolivre') {
        await handleMercadoLivreAnalytics(req, res);
        return;
      }

      // GET /api/track/click/:clickId - Redirect com tracking de clique
      if (req.method === 'GET' && pathOnly.startsWith('/api/track/click/')) {
        await handleClickTracking(req, res, pathOnly);
        return;
      }

      // ========== QUEUE (FILA) ENDPOINTS ==========
      // GET /api/queue - Lista itens da fila
      if (req.method === 'GET' && pathOnly === '/api/queue') {
        await handleGetQueue(req, res);
        return;
      }
      // POST /api/queue - Adiciona item à fila
      if (req.method === 'POST' && pathOnly === '/api/queue') {
        await handleAddToQueue(req, res);
        return;
      }
      // PATCH /api/queue/:id - Atualiza seleção do item
      if (req.method === 'PATCH' && pathOnly.startsWith('/api/queue/')) {
        await handleUpdateQueueItem(req, res, pathOnly);
        return;
      }
      // DELETE /api/queue/:id - Remove item da fila
      if (req.method === 'DELETE' && pathOnly.startsWith('/api/queue/')) {
        await handleRemoveFromQueue(req, res, pathOnly);
        return;
      }
      // POST /api/queue/clear - Limpa fila toda
      if (req.method === 'POST' && pathOnly === '/api/queue/clear') {
        await handleClearQueue(req, res);
        return;
      }

      // ========== DISPATCH (DISPAROS) ENDPOINTS ==========
      if (req.method === 'GET' && pathOnly === '/api/dispatch/automation') {
        await handleGetDispatchAutomation(req, res);
        return;
      }
      if (req.method === 'PUT' && pathOnly === '/api/dispatch/automation') {
        await handleSaveDispatchAutomation(req, res);
        return;
      }
      // POST /api/dispatch - Cria job de disparo (3-step wizard)
      if (req.method === 'POST' && pathOnly === '/api/dispatch') {
        await handleCreateDispatch(req, res);
        return;
      }
      // GET /api/dispatch/history - Histórico de disparos
      if (req.method === 'GET' && pathOnly === '/api/dispatch/history') {
        await handleDispatchHistory(req, res);
        return;
      }
      if (req.method === 'GET' && pathOnly === '/api/dispatch/worker-status') {
        const worker = await dataStore.findById('workerStatus', 'dispatch-worker');
        const ageMs = worker?.updatedAt ? Date.now() - new Date(worker.updatedAt).getTime() : Infinity;
        sendJson(res, 200, { running: ageMs < 45_000, lastHeartbeat: worker?.updatedAt || null });
        return;
      }
      if (req.method === 'POST' && /^\/api\/dispatch\/[^/]+\/cancel$/.test(pathOnly)) {
        await handleCancelDispatch(req, res, pathOnly);
        return;
      }
      // GET /api/dispatch/:id - Status do disparo
      if (req.method === 'GET' && /^\/api\/dispatch\/[^/]+$/.test(pathOnly)) {
        await handleGetDispatch(req, res, pathOnly);
        return;
      }

      // ========== GROUPS (GRUPOS) ENDPOINTS ==========
      // GET /api/groups - Lista grupos do WhatsApp
      if (req.method === 'GET' && pathOnly === '/api/groups') {
        await handleGetGroups(req, res);
        return;
      }
      // POST /api/groups/sync - Sincroniza grupos do WhatsApp
      if (req.method === 'POST' && pathOnly === '/api/groups/sync') {
        await handleSyncGroups(req, res);
        return;
      }
      if (req.method === 'POST' && pathOnly === '/api/groups') {
        const body = await readJsonBody(req);
        if (Array.isArray(body.groups)) {
          const saved = await WhatsAppGroupsStore.save(requestUserId(req), body.groups.map(group => ({ ...group, enabled: group.enabled !== false, sessionId: group.sessionId || body.sessionId || WAHA_SESSION })));
          sendJson(res, 200, { groups: saved, saved: true });
        } else {
          await handleSyncGroups(req, res);
        }
        return;
      }
      if (req.method === 'PATCH' && /^\/api\/groups\/[^/]+$/.test(pathOnly)) {
        await handleUpdateGroup(req, res, pathOnly);
        return;
      }
      if (req.method === 'DELETE' && /^\/api\/groups\/[^/]+$/.test(pathOnly)) {
        await handleDeleteGroup(req, res, pathOnly);
        return;
      }
      // GET /api/groups/:id/stats - Métricas do grupo
      if (req.method === 'GET' && pathOnly.startsWith('/api/groups/') && pathOnly.endsWith('/stats')) {
        await handleGroupStats(req, res, pathOnly);
        return;
      }

      // ========== MIRRORING (ESPELHAMENTO) ENDPOINTS ==========
      // POST /api/mirroring - Cria config de espelhamento
      if (req.method === 'POST' && pathOnly === '/api/mirroring') {
        await handleCreateMirroring(req, res);
        return;
      }
      // GET /api/mirroring - Lista espelhamentos
      if (req.method === 'GET' && pathOnly === '/api/mirroring') {
        await handleGetMirroring(req, res);
        return;
      }
      // DELETE /api/mirroring/:id - Remove espelhamento
      if (req.method === 'DELETE' && pathOnly.startsWith('/api/mirroring/')) {
        await handleDeleteMirroring(req, res, pathOnly);
        return;
      }
      if (req.method === 'PATCH' && /^\/api\/mirroring\/[^/]+$/.test(pathOnly)) {
        await handleUpdateMirroring(req, res, pathOnly);
        return;
      }
      // GET /api/mirroring/:id/logs - Logs do espelhamento
      if (req.method === 'GET' && pathOnly.startsWith('/api/mirroring/') && pathOnly.endsWith('/logs')) {
        await handleMirroringLogs(req, res, pathOnly);
        return;
      }

      // ========== PUBLIC PAGES (PÁGINAS) ENDPOINTS ==========
      // POST /api/pages - Cria página pública
      if (req.method === 'POST' && pathOnly === '/api/pages') {
        await handleCreatePage(req, res);
        return;
      }
      // GET /api/pages - Lista páginas
      if (req.method === 'GET' && pathOnly === '/api/pages') {
        await handleGetPages(req, res);
        return;
      }
      // GET /api/pages/:slug - Página pública (render)
      if (req.method === 'GET' && pathOnly.startsWith('/api/pages/') && !pathOnly.startsWith('/api/pages/') && pathOnly !== '/api/pages') {
        // handled by public route below
      }
      // PUT /api/pages/:id - Atualiza página
      if (req.method === 'PUT' && pathOnly.startsWith('/api/pages/')) {
        await handleUpdatePage(req, res, pathOnly);
        return;
      }
      // DELETE /api/pages/:id - Deleta página
      if (req.method === 'DELETE' && pathOnly.startsWith('/api/pages/')) {
        await handleDeletePage(req, res, pathOnly);
        return;
      }
      // POST /api/pages/:id/products - Adiciona produtos à página
      if (req.method === 'POST' && pathOnly.startsWith('/api/pages/') && pathOnly.endsWith('/products')) {
        await handleAddProductsToPage(req, res, pathOnly);
        return;
      }
      // GET /p/:slug - Rota pública da vitrine
      if (req.method === 'GET' && pathOnly.startsWith('/p/')) {
        await handlePublicPage(req, res, pathOnly);
        return;
      }

      // ========== SETTINGS (CONFIGURAÇÕES) ENDPOINTS ==========
      // GET /api/settings - Obtém todas as configurações
      if (req.method === 'GET' && pathOnly === '/api/settings') {
        await handleGetSettings(req, res);
        return;
      }
      // PUT /api/settings/channels - Canais (WhatsApp/Telegram)
      if (req.method === 'PUT' && pathOnly === '/api/settings/channels') {
        await handleUpdateChannels(req, res);
        return;
      }
      // PUT /api/settings/platforms - Plataformas (Shopee/ML/Amazon/Magalu)
      if (req.method === 'PUT' && pathOnly === '/api/settings/platforms') {
        await handleUpdatePlatforms(req, res);
        return;
      }
      // PUT /api/settings/templates - Templates
      if (req.method === 'PUT' && pathOnly === '/api/settings/templates') {
        await handleUpdateTemplates(req, res);
        return;
      }
      // PUT /api/settings/coupons - Cupons
      if (req.method === 'PUT' && pathOnly === '/api/settings/coupons') {
        await handleUpdateCoupons(req, res);
        return;
      }
      // PUT /api/settings/security - Segurança
      if (req.method === 'PUT' && pathOnly === '/api/settings/security') {
        await handleUpdateSecurity(req, res);
        return;
      }
      // PUT /api/settings/account - Conta
      if (req.method === 'PUT' && pathOnly === '/api/settings/account') {
        await handleUpdateAccount(req, res);
        return;
      }

      // ========== WAHA WEBHOOKS ==========
      if (pathOnly === '/api/webhooks/waha' || pathOnly === '/api/webhooks/aha') {
        if (req.method !== 'POST') { sendJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }); return; }
        await handleWahaWebhook(req, res);
        return;
      }

      // ========== WHATSAPP CONNECTION ENDPOINTS ==========
      if (req.method === 'GET' && pathOnly === '/api/whatsapp/sessions') { await handleWhatsAppSessions(req, res); return; }
      if (req.method === 'POST' && pathOnly === '/api/whatsapp/sessions') { await handleCreateWhatsAppSession(req, res); return; }
      if (req.method === 'DELETE' && /^\/api\/whatsapp\/sessions\/[^/]+$/.test(pathOnly)) { await handleDeleteWhatsAppSession(req, res, pathOnly); return; }
      // GET /api/whatsapp/status - Status da conexão
      if (req.method === 'GET' && pathOnly === '/api/whatsapp/status') {
        await handleWhatsAppStatus(req, res);
        return;
      }
      // POST /api/whatsapp/connect - Inicia conexão (retorna QR code)
      if (req.method === 'POST' && pathOnly === '/api/whatsapp/connect') {
        await handleWhatsAppConnect(req, res);
        return;
      }
      // POST /api/whatsapp/disconnect - Desconecta
      if (req.method === 'POST' && pathOnly === '/api/whatsapp/disconnect') {
        await handleWhatsAppDisconnect(req, res);
        return;
      }
      // POST /api/whatsapp/qr - Gera QR code para sessão
      if (req.method === 'POST' && pathOnly === '/api/whatsapp/qr') {
        await handleWhatsAppQR(req, res);
        return;
      }
      if (req.method === 'GET' && pathOnly === '/api/whatsapp/groups') {
        await handleSyncGroups(req, res);
        return;
      }
      if (req.method === 'POST' && pathOnly === '/api/dispatches') {
        await handleCreateDispatch(req, res);
        return;
      }
      if (req.method === 'POST' && /^\/api\/dispatches\/[^/]+\/cancel$/.test(pathOnly)) {
        await handleCancelDispatch(req, res, pathOnly.replace('/api/dispatches/', '/api/dispatch/'));
        return;
      }
      if (req.method === 'GET' && pathOnly === '/api/dispatches') {
        await handleDispatchHistory(req, res);
        return;
      }
      if (req.method === 'GET' && pathOnly.startsWith('/api/dispatches/')) {
        await handleGetDispatch(req, res, pathOnly.replace('/api/dispatches/', '/api/dispatch/'));
        return;
      }
      if (req.method === 'POST' && /^\/api\/offers\/[^/]+\/send$/.test(pathOnly)) {
        await handleSendOffer(req, res, pathOnly);
        return;
      }

      // ========== TEMPLATES & CUPOM ENDPOINTS ==========
      // GET /api/templates - Lista templates
      if (req.method === 'GET' && pathOnly === '/api/templates') {
        await handleGetTemplates(req, res);
        return;
      }
      // POST /api/templates - Cria/atualiza template
      if (req.method === 'POST' && pathOnly === '/api/templates') {
        await handleSaveTemplate(req, res);
        return;
      }
      // DELETE /api/templates/:id - Remove template
      if (req.method === 'DELETE' && pathOnly.startsWith('/api/templates/')) {
        await handleDeleteTemplate(req, res, pathOnly);
        return;
      }
      // GET /api/coupons - Lista cupons
      if (req.method === 'GET' && pathOnly === '/api/coupons') {
        await handleGetCoupons(req, res);
        return;
      }
      // POST /api/coupons - Cria cupom
      if (req.method === 'POST' && pathOnly === '/api/coupons') {
        await handleCreateCoupon(req, res);
        return;
      }
      // DELETE /api/coupons/:id - Remove cupom
      if (req.method === 'DELETE' && pathOnly.startsWith('/api/coupons/')) {
        await handleDeleteCoupon(req, res, pathOnly);
        return;
      }

      // ========== ANALYTICS ENDPOINTS ==========
      // GET /api/analytics/overview - Dashboard metrics
      if (req.method === 'GET' && pathOnly === '/api/analytics/overview') {
        await handleAnalyticsOverview(req, res);
        return;
      }
      // GET /api/analytics/dispatch - Performance de disparos
      if (req.method === 'GET' && pathOnly === '/api/analytics/dispatch') {
        await handleAnalyticsDispatch(req, res);
        return;
      }
      // GET /api/analytics/groups - Engajamento de grupos
      if (req.method === 'GET' && pathOnly === '/api/analytics/groups') {
        await handleAnalyticsGroups(req, res);
        return;
      }
      // GET /api/analytics/products - Conversão de produtos
      if (req.method === 'GET' && pathOnly === '/api/analytics/products') {
        await handleAnalyticsProducts(req, res);
        return;
      }

      // ========== EXTENSION INGESTION ==========
      // Already exists at /api/extension/import

      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
    } catch (err) {
      handleUnexpected(res, err, req.method || 'GET', pathOnly, startedAt);
    }
  });
}

function handleUnexpected(res, err, method, pathOnly, startedAt) {
  if (err instanceof ShopeeConfigError) {
    sendJson(res, 503, {
      error: { code: err.code, message: err.message },
    });
    // A mensagem não contém valores das credenciais, apenas nomes de variáveis.
    logLine(`${method} ${pathOnly} 503 ${err.code} ${Date.now() - startedAt}ms`);
    return;
  }

  if (err instanceof ShopeeApiError) {
    const status = KIND_TO_HTTP[err.kind] ?? 502;
    sendJson(res, status, {
      error: {
        code: KIND_TO_CODE[err.kind] ?? 'SHOPEE_ERROR',
        message: KIND_TO_MESSAGE[err.kind] ?? err.message,
        providerCode: err.providerCode,
      },
    });
    logLine(
      `${method} ${pathOnly} ${status} ${KIND_TO_CODE[err.kind]}${
        err.providerCode ? ` provider=${err.providerCode}` : ''
      } ${Date.now() - startedAt}ms`
    );
    return;
  }

  sendJson(res, 500, {
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
  // Log mínimo sem dados sensíveis (nunca headers/env).
  logLine(
    `${method} ${pathOnly} 500 INTERNAL ${err && err.name} ${
      Date.now() - startedAt
    }ms`
  );
}

function logLine(text) {
  process.stdout.write(`[api] ${text}\n`);
}

// ========== MERCADO LIVRE HANDLERS ==========

const ML_STATE_STORE = new Map(); // Em produção, usar Redis ou banco

function generateState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function handleMercadoLivreAuthUrl(req, res) {
  try {
    const config = loadMercadoLivreConfig();
    const state = generateState();
    const userId = 'default_user'; // Em produção, obter do auth/sessão
    
    // Armazena state temporariamente (expira em 10 min)
    ML_STATE_STORE.set(state, { userId, createdAt: Date.now() });
    setTimeout(() => ML_STATE_STORE.delete(state), 10 * 60 * 1000);
    
    const authUrl = buildMercadoLivreAuthUrl({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state,
    });
    
    sendJson(res, 200, { authUrl, state });
  } catch (err) {
    if (err instanceof MercadoLivreConfigError) {
      sendJson(res, 503, { error: { code: err.code, message: err.message } });
      return;
    }
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar URL de autorização.' } });
  }
}

async function handleMercadoLivreCallback(req, res) {
  try {
    const body = await readJsonBody(req);
    const { code, state } = body;
    
    if (!code || !state) {
      sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Code e state são obrigatórios.' } });
      return;
    }
    
    // Verifica state
    const stateData = ML_STATE_STORE.get(state);
    if (!stateData) {
      sendJson(res, 400, { error: { code: 'INVALID_STATE', message: 'State inválido ou expirado.' } });
      return;
    }
    ML_STATE_STORE.delete(state);
    
    const userId = stateData.userId;
    const config = loadMercadoLivreConfig();
    
    // Cria provider e troca código por tokens
    const provider = new MercadoLivreProvider({ marketplace: 'mercado_livre', credentials: {} });
    const tokens = await provider.exchangeCodeForTokens(code, config.redirectUri);
    
    // Salva credenciais
    await CredentialsStore.save(userId, 'mercado_livre', tokens);
    
    // Inicializa config de afiliado padrão (manual)
    await AffiliateConfigStore.save(userId, 'mercado_livre', {
      affiliateTag: '',
      affiliateProvider: AffiliateProviderType.MANUAL,
      providerConfig: {},
      isEnabled: true,
    });
    
    sendJson(res, 200, { 
      success: true, 
      user: {
        id: tokens.userId,
        nickname: tokens.nickname,
        email: tokens.email,
      }
    });
  } catch (err) {
    if (err instanceof MLApiError) {
      sendJson(res, 400, { error: { code: 'ML_OAUTH_ERROR', message: err.message } });
      return;
    }
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro no callback OAuth.' } });
  }
}

async function handleMercadoLivreStatus(req, res) {
  try {
    const userId = 'default_user';
    const credentials = await CredentialsStore.getByUserAndMarketplace(userId, 'mercado_livre');
    const affiliateConfig = await AffiliateConfigStore.getByUserAndMarketplace(userId, 'mercado_livre');
    
    if (!credentials) {
      sendJson(res, 200, { 
        connected: false, 
        status: 'disconnected',
        affiliateConfigured: false 
      });
      return;
    }
    
    // Verifica se token ainda é válido
    const provider = new MercadoLivreProvider({ 
      marketplace: 'mercado_livre', 
      credentials 
    });
    
    const validation = await provider.validateCredentials();
    
    sendJson(res, 200, {
      connected: true,
      status: validation.valid ? 'connected' : 'token_expired',
      account: {
        id: credentials.userId,
        nickname: credentials.accountNickname,
      },
      affiliateConfigured: !!affiliateConfig?.affiliateTag,
      affiliateProvider: affiliateConfig?.affiliateProvider || AffiliateProviderType.MANUAL,
      tokenExpiresAt: credentials.expiresAt,
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao verificar status.' } });
  }
}

async function handleMercadoLivreDisconnect(req, res) {
  try {
    const userId = 'default_user';
    const credentials = await CredentialsStore.getByUserAndMarketplace(userId, 'mercado_livre');
    
    if (credentials) {
      const provider = new MercadoLivreProvider({ 
        marketplace: 'mercado_livre', 
        credentials 
      });
      await provider.disconnect();
      await CredentialsStore.deactivate(userId, 'mercado_livre');
    }
    
    sendJson(res, 200, { success: true, message: 'Conta desconectada com sucesso.' });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao desconectar.' } });
  }
}

function parseMLProductsQuery(url) {
  const qs = url.searchParams;
  
  return {
    keyword: (qs.get('keyword') || '').slice(0, 100),
    categoryId: qs.get('categoryId') || null,
    minPrice: qs.get('minPrice') ? parseFloat(qs.get('minPrice')) : null,
    maxPrice: qs.get('maxPrice') ? parseFloat(qs.get('maxPrice')) : null,
    minDiscount: qs.get('minDiscount') ? parseInt(qs.get('minDiscount'), 10) : null,
    sellerId: qs.get('sellerId') || null,
    productId: qs.get('productId') || null,
    productUrl: qs.get('productUrl') || null,
    sortBy: qs.get('sortBy') || 'relevance',
    page: Math.max(1, parseInt(qs.get('page') || '1', 10)),
    limit: Math.min(50, Math.max(1, parseInt(qs.get('limit') || '20', 10))),
  };
}

async function handleMercadoLivreProducts(req, res) {
  try {
    const userId = 'default_user';
    const credentials = await CredentialsStore.getByUserAndMarketplace(userId, 'mercado_livre');
    
    if (!credentials) {
      sendJson(res, 401, { error: { code: 'NOT_CONNECTED', message: 'Conecte sua conta do Mercado Livre primeiro.' } });
      return;
    }
    
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const filters = parseMLProductsQuery(parsed);
    
    const provider = new MercadoLivreProvider({ 
      marketplace: 'mercado_livre', 
      credentials 
    });
    
    const result = await provider.searchProducts(filters);
    
    // Calcula score para cada produto
    const productsWithScore = result.products.map(product => ({
      ...product,
      offerScore: provider.calculateOfferScore(product),
    }));
    
    // Ordena por score se não tiver ordenação específica
    if (filters.sortBy === 'relevance' || filters.sortBy === 'score') {
      productsWithScore.sort((a, b) => (b.offerScore || 0) - (a.offerScore || 0));
    }
    
    sendJson(res, 200, {
      products: productsWithScore,
      meta: {
        source: 'mercadolivre-public-api',
        page: result.page,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        totalCount: result.totalCount,
        count: productsWithScore.length,
      },
    });
  } catch (err) {
    if (err instanceof MLApiError) {
      sendJson(res, 400, { error: { code: 'ML_API_ERROR', message: err.message } });
      return;
    }
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar produtos.' } });
  }
}

async function handleMercadoLivreCategories(req, res) {
  try {
    const userId = 'default_user';
    const credentials = await CredentialsStore.getByUserAndMarketplace(userId, 'mercado_livre');
    
    if (!credentials) {
      sendJson(res, 401, { error: { code: 'NOT_CONNECTED', message: 'Conecte sua conta do Mercado Livre primeiro.' } });
      return;
    }
    
    const provider = new MercadoLivreProvider({ 
      marketplace: 'mercado_livre', 
      credentials 
    });
    
    const categories = await provider.getCategories();
    
    sendJson(res, 200, { categories });
  } catch (err) {
    if (err instanceof MLApiError) {
      sendJson(res, 400, { error: { code: 'ML_API_ERROR', message: err.message } });
      return;
    }
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar categorias.' } });
  }
}

async function handleMercadoLivreAffiliateLink(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { productId, originalUrl } = body;
    
    if (!productId) {
      sendJson(res, 400, { error: { code: 'MISSING_PRODUCT_ID', message: 'productId é obrigatório.' } });
      return;
    }
    
    const credentials = await CredentialsStore.getByUserAndMarketplace(userId, 'mercado_livre');
    const affiliateConfig = await AffiliateConfigStore.getByUserAndMarketplace(userId, 'mercado_livre');
    
    if (!credentials) {
      sendJson(res, 401, { error: { code: 'NOT_CONNECTED', message: 'Conecte sua conta do Mercado Livre primeiro.' } });
      return;
    }
    
    const provider = new MercadoLivreProvider({ 
      marketplace: 'mercado_livre', 
      credentials 
    });
    
    // Obtém URL original do produto
    const mlResult = await provider.getAffiliateUrl(productId, originalUrl);
    
    // Se precisa de geração de afiliado, usa o AffiliateLinkProvider
    if (mlResult.needsAffiliateGeneration && affiliateConfig) {
      const affiliateProvider = AffiliateLinkProviderFactory.createFromConfig(affiliateConfig);
      const result = await affiliateProvider.generateAffiliateLink({
        originalUrl: mlResult.originalUrl,
        marketplace: 'mercado_livre',
        affiliateTag: affiliateConfig.affiliateTag,
        providerConfig: affiliateConfig.providerConfig,
      });
      
      // Salva no histórico se gerou com sucesso
      if (result.status === 'generated') {
        // Atualiza o produto com o link afiliado
        mlResult.affiliateUrl = result.affiliateUrl;
        mlResult.affiliateProvider = result.provider;
        mlResult.affiliateStatus = result.status;
      }
    }
    
    sendJson(res, 200, mlResult);
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar link afiliado.' } });
  }
}

async function handleMercadoLivreAffiliateConfig(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { affiliateTag, affiliateProvider, providerConfig, isEnabled } = body;
    
    const config = await AffiliateConfigStore.save(userId, 'mercado_livre', {
      affiliateTag: affiliateTag || '',
      affiliateProvider: affiliateProvider || AffiliateProviderType.MANUAL,
      providerConfig: providerConfig || {},
      isEnabled: isEnabled !== false,
    });
    
    sendJson(res, 200, { success: true, config });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar configuração.' } });
  }
}

async function handleGetMercadoLivreAffiliateConfig(req, res) {
  try {
    const userId = 'default_user';
    const config = await AffiliateConfigStore.getByUserAndMarketplace(userId, 'mercado_livre');
    
    sendJson(res, 200, { 
      config: config || {
        affiliateTag: '',
        affiliateProvider: AffiliateProviderType.MANUAL,
        providerConfig: {},
        isEnabled: true,
      },
      availableProviders: AffiliateLinkProviderFactory.getAvailableTypes(),
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar configuração.' } });
  }
}

async function handleMercadoLivreAutoSearch(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { 
      name, 
      filters, 
      minOfferScore, 
      cooldownHours, 
      targetChannels, 
      schedule, 
      maxResultsPerRun,
      isActive 
    } = body;
    
    if (!name || !filters) {
      sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'name e filters são obrigatórios.' } });
      return;
    }
    
    const config = await AutoSearchConfigStore.save(userId, {
      name,
      marketplace: 'mercado_livre',
      filters,
      minOfferScore: minOfferScore || 7.0,
      cooldownHours: cooldownHours || 24,
      targetChannels: targetChannels || [],
      schedule: schedule || '*/30 * * * *',
      maxResultsPerRun: maxResultsPerRun || 5,
      isActive: isActive !== false,
    });
    
    sendJson(res, 200, { success: true, config });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao configurar busca automática.' } });
  }
}

async function handleGetMercadoLivreAutoSearch(req, res) {
  try {
    const userId = 'default_user';
    const configs = await AutoSearchConfigStore.getByUser(userId);
    const mlConfigs = configs.filter(c => c.marketplace === 'mercado_livre');
    
    sendJson(res, 200, { configs: mlConfigs });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar configurações.' } });
  }
}

async function handleMercadoLivrePublicationHistory(req, res) {
  try {
    const userId = 'default_user';
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const limit = Math.min(100, Math.max(1, parseInt(parsed.searchParams.get('limit') || '50', 10)));
    
    const history = await PublicationHistoryStore.getByUser(userId, limit);
    const stats = await PublicationHistoryStore.getStats(userId);
    
    sendJson(res, 200, { history, stats });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar histórico.' } });
  }
}

// ========== ANALYTICS HANDLERS ==========

const ANALYTICS_MARKETPLACES = new Set(['shopee', 'mercado_livre', 'tiktok_shop', 'chain']);
const COMMISSION_STATUSES = new Set(['unknown', 'pending', 'validated', 'rejected', 'cancelled']);

function emptyAnalyticsProduct(event) {
  return {
    id: `${event.marketplace}:${event.marketplace_product_id || 'unknown'}`,
    productId: event.marketplace_product_id || '',
    productName: event.product_name || 'Produto',
    marketplace: event.marketplace,
    clicks: 0,
    conversions: 0,
    commission: 0,
    lastClickAt: event.occurred_at,
    affiliateUrl: event.metadata?.affiliate_url || '',
  };
}

function summarizeAnalyticsEvents(events, marketplace = 'all') {
  const products = new Map();
  const statusCounts = { unknown: 0, pending: 0, validated: 0, rejected: 0, cancelled: 0 };
  let totalClicks = 0;
  let totalConversions = 0;
  let totalCommission = 0;
  for (const event of events || []) {
    if (!ANALYTICS_MARKETPLACES.has(event.marketplace)) continue;
    const key = `${event.marketplace}:${event.marketplace_product_id || 'unknown'}`;
    const product = products.get(key) || emptyAnalyticsProduct(event);
    if (event.event_type === 'click') {
      product.clicks += 1;
      totalClicks += 1;
      if (!product.lastClickAt || new Date(event.occurred_at) > new Date(product.lastClickAt)) product.lastClickAt = event.occurred_at;
    }
    if (event.event_type === 'conversion' || event.event_type === 'commission') {
      product.conversions += 1;
      totalConversions += 1;
      product.commission += Number(event.commission || 0);
      totalCommission += Number(event.commission || 0);
      const status = COMMISSION_STATUSES.has(event.commission_status) ? event.commission_status : 'unknown';
      statusCounts[status] += 1;
    }
    products.set(key, product);
  }
  const allProducts = [...products.values()].sort((a, b) => b.clicks - a.clicks || b.commission - a.commission);
  const filteredProducts = marketplace === 'all' ? allProducts : allProducts.filter((item) => item.marketplace === marketplace);
  return {
    totalClicks,
    totalConversions,
    totalCommission,
    conversionRate: totalClicks ? (totalConversions / totalClicks) * 100 : 0,
    commissionStatus: statusCounts,
    topProducts: filteredProducts.slice(0, 20),
    recentConversions: [],
    marketplaces: [...new Set(allProducts.map((item) => item.marketplace))],
  };
}

async function handleUnifiedAnalytics(req, res) {
  try {
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const marketplace = parsed.searchParams.get('marketplace') || 'all';
    if (marketplace !== 'all' && !ANALYTICS_MARKETPLACES.has(marketplace)) {
      sendJson(res, 400, { error: { code: 'INVALID_MARKETPLACE', message: 'Marketplace inválido.' } });
      return;
    }
    const hoursRaw = Number.parseInt(parsed.searchParams.get('hours') || '168', 10);
    const hours = Number.isFinite(hoursRaw) ? Math.min(Math.max(hoursRaw, 1), 720) : 168;
    const since = Date.now() - hours * 3_600_000;
    const store = createSupabaseAnalyticsStore();
    const events = store.enabled ? await store.list({ marketplace, since }) : [];
    const summary = summarizeAnalyticsEvents(events || [], marketplace);
    sendJson(res, 200, { ...summary, meta: { source: store.enabled ? 'supabase' : 'local-fallback', hours, marketplace } });
  } catch (err) {
    logLine(`GET /api/analytics 500 UNIFIED_ANALYTICS_ERROR ${err && err.message}`);
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics.' } });
  }
}

async function handleAnalyticsEvent(req, res) {
  const body = await readJsonBody(req);
  const marketplace = String(body.marketplace || '');
  const eventType = String(body.event_type || body.eventType || '');
  if (!ANALYTICS_MARKETPLACES.has(marketplace) || !['click', 'conversion', 'commission'].includes(eventType)) {
    sendJson(res, 400, { error: { code: 'INVALID_ANALYTICS_EVENT', message: 'Marketplace ou tipo de evento inválido.' } });
    return;
  }
  const status = String(body.commission_status || body.commissionStatus || 'unknown');
  if (!COMMISSION_STATUSES.has(status)) {
    sendJson(res, 400, { error: { code: 'INVALID_COMMISSION_STATUS', message: 'Status de comissão inválido.' } });
    return;
  }
  const store = createSupabaseAnalyticsStore();
  if (!store.enabled) {
    sendJson(res, 503, { error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Analytics do Supabase ainda não está configurado no backend.' } });
    return;
  }
  await store.insert({
    external_event_id: typeof body.external_event_id === 'string' ? body.external_event_id.slice(0, 160) : null,
    marketplace,
    event_type: eventType,
    marketplace_product_id: typeof body.marketplace_product_id === 'string' ? body.marketplace_product_id.slice(0, 160) : null,
    product_name: typeof body.product_name === 'string' ? body.product_name.slice(0, 240) : null,
    amount: Number.isFinite(Number(body.amount)) ? Number(body.amount) : null,
    commission: Number.isFinite(Number(body.commission)) ? Number(body.commission) : null,
    commission_status: status,
    source: typeof body.source === 'string' ? body.source.slice(0, 80) : 'app',
    occurred_at: body.occurred_at || new Date().toISOString(),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  });
  sendJson(res, 201, { ok: true });
}

async function handleShopeeAnalytics(req, res) {
  try {
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const hours = Math.min(720, Math.max(1, parseInt(parsed.searchParams.get('hours') || '168', 10)));
    const sinceSeconds = Date.now() / 1000 - hours * 3600;
    const userId = 'default_user';
    
    const config = loadShopeeConfig();
    const { nodes: conversions } = await fetchRecentConversions({ config, sinceSeconds, limit: 100 });
    
    // Busca clicks do nosso tracking
    const clicks = await ClickTrackingStore.getByUserAndMarketplace(userId, 'shopee', sinceSeconds);
    
    // Agrupa clicks por produto
    const clicksByProduct = new Map();
    for (const click of clicks) {
      const key = click.productId;
      if (!clicksByProduct.has(key)) {
        clicksByProduct.set(key, {
          productId: click.productId,
          productName: click.productName,
          marketplace: 'shopee',
          clicks: 0,
          conversions: 0,
          commission: 0,
          lastClickAt: click.clickedAt,
          affiliateUrl: click.affiliateUrl,
        });
      }
      const agg = clicksByProduct.get(key);
      agg.clicks++;
      if (new Date(click.clickedAt) > new Date(agg.lastClickAt)) {
        agg.lastClickAt = click.clickedAt;
      }
    }
    
    // Agrupa conversões por produto
    for (const conv of conversions) {
      for (const order of conv.orders || []) {
        for (const item of order.items || []) {
          const key = String(item.itemId);
          if (clicksByProduct.has(key)) {
            const agg = clicksByProduct.get(key);
            agg.conversions += item.qty || 1;
            agg.commission += parseFloat(item.itemTotalCommission || '0');
          } else {
            clicksByProduct.set(key, {
              productId: key,
              productName: item.itemName || 'Produto desconhecido',
              marketplace: 'shopee',
              clicks: 0,
              conversions: item.qty || 1,
              commission: parseFloat(item.itemTotalCommission || '0'),
              lastClickAt: new Date(conv.purchaseTime * 1000).toISOString(),
              affiliateUrl: '',
            });
          }
        }
      }
    }
    
    const topProducts = Array.from(clicksByProduct.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);
    
    const totalClicks = topProducts.reduce((sum, p) => sum + p.clicks, 0);
    const totalConversions = topProducts.reduce((sum, p) => sum + p.conversions, 0);
    const totalCommission = topProducts.reduce((sum, p) => sum + p.commission, 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    
    const recentConversions = conversions
      .slice(0, 20)
      .map(conv => ({
        id: conv.conversionId,
        productId: conv.orders?.[0]?.items?.[0]?.itemId || '',
        productName: conv.orders?.[0]?.items?.[0]?.itemName || 'Produto',
        orderId: conv.orders?.[0]?.orderId || '',
        purchaseTime: new Date(conv.purchaseTime * 1000).toISOString(),
        commission: parseFloat(conv.totalCommission || '0'),
        netCommission: parseFloat(conv.netCommission || '0'),
        status: conv.conversionStatus || '',
        items: conv.orders?.flatMap(o => o.items || []) || [],
      }));
    
    sendJson(res, 200, {
      totalClicks,
      totalConversions,
      totalCommission,
      conversionRate,
      topProducts,
      recentConversions,
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics Shopee.' } });
  }
}

async function handleMercadoLivreAnalytics(req, res) {
  try {
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const hours = Math.min(720, Math.max(1, parseInt(parsed.searchParams.get('hours') || '168', 10)));
    const sinceSeconds = Date.now() / 1000 - hours * 3600;
    const userId = 'default_user';
    
    // Busca clicks do nosso tracking
    const clicks = await ClickTrackingStore.getByUserAndMarketplace(userId, 'mercado_livre', sinceSeconds);
    
    // Agrupa clicks por produto
    const clicksByProduct = new Map();
    for (const click of clicks) {
      const key = click.productId;
      if (!clicksByProduct.has(key)) {
        clicksByProduct.set(key, {
          productId: click.productId,
          productName: click.productName,
          marketplace: 'mercado_livre',
          clicks: 0,
          conversions: 0,
          commission: 0,
          lastClickAt: click.clickedAt,
          affiliateUrl: click.affiliateUrl,
        });
      }
      const agg = clicksByProduct.get(key);
      agg.clicks++;
      if (new Date(click.clickedAt) > new Date(agg.lastClickAt)) {
        agg.lastClickAt = click.clickedAt;
      }
    }
    
    // TODO: Quando ML tiver API de conversões, buscar aqui
    // Por enquanto, apenas dados de cliques
    
    const topProducts = Array.from(clicksByProduct.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);
    
    const totalClicks = topProducts.reduce((sum, p) => sum + p.clicks, 0);
    const totalConversions = topProducts.reduce((sum, p) => sum + p.conversions, 0);
    const totalCommission = topProducts.reduce((sum, p) => sum + p.commission, 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    
    sendJson(res, 200, {
      totalClicks,
      totalConversions,
      totalCommission,
      conversionRate,
      topProducts,
      recentConversions: [],
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics Mercado Livre.' } });
  }
}

async function handleClickTracking(req, res, pathOnly) {
  try {
    const clickId = pathOnly.replace('/api/track/click/', '');
    if (!clickId) {
      sendJson(res, 400, { error: { code: 'INVALID_CLICK_ID', message: 'ID de clique inválido.' } });
      return;
    }
    
    const click = await ClickTrackingStore.getById(clickId);
    if (!click) {
      sendJson(res, 404, { error: { code: 'CLICK_NOT_FOUND', message: 'Link de rastreamento não encontrado.' } });
      return;
    }
    
    // Incrementa contador de cliques
    await ClickTrackingStore.incrementClicks(clickId);
    
    // Redireciona para URL afiliada final
    res.writeHead(302, {
      Location: click.affiliateUrl,
      'Cache-Control': 'no-store',
    });
    res.end();
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro no redirecionamento.' } });
  }
}

// ========== QUEUE HANDLERS ==========

async function handleGetQueue(req, res) {
  try {
    const userId = 'default_user';
    const queue = await PublicationHistoryStore.getByUser(userId, 100);
    const items = queue.map(item => ({
      id: item.id,
      product: {
        id: item.productId,
        marketplace: item.marketplace,
        marketplaceProductId: item.marketplaceProductId,
        name: item.productName,
        imageUrl: item.imageUrl || '',
        currentPrice: item.price,
        originalPrice: item.originalPrice,
        discountPercentage: item.originalPrice && item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : null,
        salesCount: null,
        salesCountText: null,
        rating: null,
        reviewsCount: null,
        category: '',
        categoryId: null,
        productUrl: item.originalUrl,
        affiliateUrl: item.affiliateUrl,
        sellerId: '',
        sellerName: '',
        sellerReputation: null,
        isFreeShipping: false,
        shippingCost: null,
        stock: null,
        isFlashSale: false,
        isHot: false,
        affiliateProvider: item.affiliateProvider,
        affiliateStatus: 'generated',
        privateCommission: { percentage: null, estimatedValue: null },
        commissionRate: null,
        commissionAmount: null,
        offerScore: item.offerScore,
        shortDescription: '',
        highlightPoints: [],
        categoryIds: [],
        fetchedAt: item.publishedAt,
      },
      addedAt: item.publishedAt,
      selected: item.selected !== false,
    }));
    sendJson(res, 200, { items, meta: { source: 'publication-history' } });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar fila.' } });
  }
}

async function handleAddToQueue(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { product } = body;
    if (!product || !product.id) {
      sendJson(res, 400, { error: { code: 'MISSING_PRODUCT', message: 'Produto é obrigatório.' } });
      return;
    }
    const item = {
      id: String(body.queueId || `queue-${Date.now()}`).slice(0, 120),
      productId: product.id,
      marketplace: product.marketplace,
      marketplaceProductId: product.marketplaceProductId,
      productName: product.name,
      imageUrl: product.imageUrl || '',
      price: product.currentPrice,
      originalPrice: product.originalPrice,
      affiliateUrl: product.affiliateUrl,
      originalUrl: product.productUrl,
      channelId: '',
      channelName: '',
      publishedAt: new Date().toISOString(),
      offerScore: product.offerScore,
      affiliateProvider: product.affiliateProvider,
    };
    await PublicationHistoryStore.save(userId, item);
    // A fila é sempre de revisão: adicionar não pode criar ou iniciar disparo.
    sendJson(res, 201, { ok: true, item });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao adicionar à fila.' } });
  }
}

async function handleRemoveFromQueue(req, res, pathOnly) {
  try {
    const id = pathOnly.replace('/api/queue/', '');
    const userId = 'default_user';
    await PublicationHistoryStore.delete(userId, id);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover da fila.' } });
  }
}

async function handleClearQueue(req, res) {
  try {
    const userId = 'default_user';
    await PublicationHistoryStore.clear(userId);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao limpar fila.' } });
  }
}

// ========== DISPATCH HANDLERS ==========

const dispatchJobs = new Map();
let dispatchQueueRunning = false;

const DEFAULT_AUTOMATION_MESSAGE = '👀 *OLHA O QUE EU ACHEI!*\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\n✅ *Agora por: {PRECO}*\n_{DESCONTO}% OFF_\n\n🛒 *Corre pra ver:*\n{LINK}';

async function handleGetDispatchAutomation(req, res) {
  const config = await DispatchAutomationStore.get(requestUserId(req));
  sendJson(res, 200, { config: config || { enabled: false, groups: [], categories: [], interval: { value: 5, unit: 'minutes' }, offerInterval: { value: 5, unit: 'minutes' }, batchSize: 10, aiEnabled: false, activeFrom: '', activeUntil: '' } });
}

async function handleSaveDispatchAutomation(req, res) {
  try {
    const userId = requestUserId(req);
    const body = await readJsonBody(req);
    const unit = ['seconds', 'minutes', 'hours'].includes(body.interval?.unit) ? body.interval.unit : 'seconds';
    const minimumInterval = unit === 'seconds' ? 10 : 1;
    const value = Math.min(1440, Math.max(minimumInterval, Number(body.interval?.value) || 30));
    const offerUnit = ['seconds', 'minutes', 'hours'].includes(body.offerInterval?.unit) ? body.offerInterval.unit : unit;
    const minimumOfferInterval = offerUnit === 'seconds' ? 10 : 1;
    const offerValue = Math.min(1440, Math.max(minimumOfferInterval, Number(body.offerInterval?.value) || value));
    const batchSize = Math.min(20, Math.max(1, Math.round(Number(body.batchSize) || 10)));
    const config = await DispatchAutomationStore.save(userId, {
      enabled: body.enabled === true, groups: [], interval: { value, unit },
      offerInterval: { value: offerValue, unit: offerUnit },
      batchSize,
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : WAHA_SESSION,
      template: typeof body.template === 'string' && body.template.trim() ? body.template.slice(0, 3500) : DEFAULT_AUTOMATION_MESSAGE,
      rotatingCTAs: body.rotatingCTAs !== false,
      aiEnabled: body.aiEnabled === true,
      categories: Array.isArray(body.categoryIds) ? [...new Set(body.categoryIds.map(item => String(item).trim()).filter(item => item.length > 0 && item.length <= 80))].slice(0, 12) : [],
      activeFrom: isValidAutomationTime(body.activeFrom) ? String(body.activeFrom) : '',
      activeUntil: isValidAutomationTime(body.activeUntil) ? String(body.activeUntil) : '',
    });
    sendJson(res, 200, { config });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Não foi possível salvar a automação.' } });
  }
}

async function enqueueAutomaticOfferForReview(userId, offer) {
  const config = await DispatchAutomationStore.get(userId);
  if (!config?.enabled) return null;
  if (!automationIsWithinSchedule(config)) {
    logLine(`[AUTOMATION] Fora do horário configurado; ${offer.id} mantida na fila manual.`);
    return null;
  }
  if (config.aiEnabled) {
    const decision = await evaluateOfferForAutomation(offer);
    if (!decision.approved) {
      logLine(`[AUTOMATION] IA reteve ${offer.id}: ${decision.reason}`);
      return null;
    }
  }
  const productKey = dispatchProductKey(offer);
  const currentQueue = await PublicationHistoryStore.getByUser(userId, 300);
  if (currentQueue.some(item => dispatchProductKey({ id: item.productId, marketplace: item.marketplace, marketplaceProductId: item.marketplaceProductId }) === productKey)) {
    logLine(`[AUTOMATION] Oferta ${offer.id} já está na fila de revisão.`);
    return null;
  }
  const item = {
    id: `queue-auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: offer.id, marketplace: offer.marketplace, marketplaceProductId: offer.marketplaceProductId,
    productName: offer.name, imageUrl: offer.imageUrl || '', price: offer.currentPrice,
    originalPrice: offer.originalPrice, affiliateUrl: offer.affiliateUrl, originalUrl: offer.productUrl,
    channelId: '', channelName: '', publishedAt: new Date().toISOString(), selected: true,
    offerScore: offer.offerScore, affiliateProvider: offer.affiliateProvider, source: 'automatic_discovery',
  };
  await PublicationHistoryStore.save(userId, item);
  logLine(`[AUTOMATION] Oferta ${offer.id} adicionada à fila para revisão manual: ${item.id}`);
  return item;

  /* Legacy automatic dispatch is deliberately unreachable. It will be removed
     after deployed workers have consumed this compatible change. */
  /* Legacy dispatch path intentionally disabled: discovery only queues for review.
  const jobId = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id: jobId, userId, source: 'queue_automation', status: 'pending', step: 3, offers: [offer],
    message: { whatsapp: { enabled: true, customMessage: config.template || DEFAULT_AUTOMATION_MESSAGE, showImage: true, rotatingCTAs: config.rotatingCTAs !== false } },
    destinations: { groups: config.groups, sessionId: config.sessionId, interval: config.interval || { value: 30, unit: 'seconds' }, nightPause: true, weekendPause: false, expirePause: true },
    createdAt: new Date().toISOString(), startedAt: null, completedAt: null,
    stats: { sent: 0, failed: 0, deduplicated: 0, cancelled: 0, pending: config.groups.length }, currentGroupIndex: 0, attempts: [], idempotencyKey: `auto:${dispatchProductKey(offer)}:${Date.now()}`,
  };
  dispatchJobs.set(jobId, job);
  await DispatchStore.save(job);
  if (PROCESS_DISPATCH_INLINE && !USE_LEGACY_N8N_DISPATCH) void resumeDispatchQueue();
  logLine(`[AUTOMATION] Oferta ${offer.id} adicionada à fila automática: ${jobId}`);
  return job;
  */
}

let automaticDiscoveryRunning = false;

async function runAutomaticOfferDiscovery() {
  if (automaticDiscoveryRunning) return;
  automaticDiscoveryRunning = true;
  try {
    const configs = await DispatchAutomationStore.list();
    for (const config of configs.filter(item => item?.enabled)) {
      if (!automationIsWithinSchedule(config)) continue;
      const dueAt = Date.parse(String(config.nextDiscoveryAt || ''));
      if (Number.isFinite(dueAt) && dueAt > Date.now()) continue;

      const cadence = config.offerInterval || config.interval || { value: 30, unit: 'seconds' };
      const nextDiscoveryAt = new Date(Date.now() + Math.max(10_000, getIntervalMs(cadence))).toISOString();
      try {
        const categories = Array.isArray(config.categories) ? config.categories : [];
        const categoryCursor = Math.max(0, Number(config.categoryCursor) || 0);
        const keyword = categories.length ? categories[categoryCursor % categories.length] : '';
        const { nodes } = await searchProductOffers({
          keyword, filter: 'trending', page: 1, limit: 24, categoryId: null, config: loadShopeeConfig(),
        });
        const seen = new Set(Array.isArray(config.recentOfferKeys) ? config.recentOfferKeys : []);
        const batchSize = Math.min(20, Math.max(1, Number(config.batchSize) || 10));
        const offers = normalizeProductOffers(nodes, 'trending')
          .filter(item => item?.id && !seen.has(dispatchProductKey(item)))
          .slice(0, batchSize);
        if (!offers.length) {
          await DispatchAutomationStore.save(config.userId, { ...config, nextDiscoveryAt, categoryCursor: categoryCursor + 1 });
          logLine(`[AUTOMATION] Nenhuma oferta inédita disponível para ${config.userId}.`);
          continue;
        }
        const queuedItems = [];
        for (const offer of offers) {
          const queuedItem = await enqueueAutomaticOfferForReview(config.userId, offer);
          if (queuedItem) queuedItems.push(queuedItem);
        }
        await DispatchAutomationStore.save(config.userId, {
          ...config,
          nextDiscoveryAt,
          categoryCursor: categoryCursor + 1,
          recentOfferKeys: [...offers.map(dispatchProductKey), ...seen].slice(0, 300),
        });
        logLine(`[AUTOMATION] ${queuedItems.length} oferta(s) do lote adicionada(s) à fila para revisão manual.`);
      } catch (error) {
        await DispatchAutomationStore.save(config.userId, { ...config, nextDiscoveryAt });
        logLine(`[AUTOMATION ERROR] Busca automática falhou: ${error.message}`);
      }
    }
  } finally {
    automaticDiscoveryRunning = false;
  }
}

function automationIsWithinSchedule(config, now = new Date()) {
  const from = String(config?.activeFrom || '');
  const until = String(config?.activeUntil || '');
  if (!isValidAutomationTime(from) || !isValidAutomationTime(until) || from === until) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  const parse = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const start = parse(from);
  const end = parse(until);
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function isValidAutomationTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

async function evaluateOfferForAutomation(offer) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return { approved: false, reason: 'IA não configurada no servidor' };
  const facts = {
    title: String(offer?.name || '').slice(0, 220),
    marketplace: String(offer?.marketplace || 'shopee'),
    category: String(offer?.category || '').slice(0, 100),
    currentPrice: Number.isFinite(Number(offer?.currentPrice)) ? Number(offer.currentPrice) : null,
    originalPrice: Number.isFinite(Number(offer?.originalPrice)) ? Number(offer.originalPrice) : null,
    discountPercentage: Number.isFinite(Number(offer?.discountPercentage)) ? Number(offer.discountPercentage) : null,
    salesCount: Number.isFinite(Number(offer?.salesCount)) ? Number(offer.salesCount) : null,
    commissionRate: Number.isFinite(Number(offer?.commissionRate)) ? Number(offer.commissionRate) : null,
    commissionAmount: Number.isFinite(Number(offer?.commissionAmount)) ? Number(offer.commissionAmount) : null,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: `Você é um filtro conservador de ofertas de marketplace. Analise SOMENTE estes dados reais, sem inventar fatos: ${JSON.stringify(facts)}. Aprove somente se houver valor claro para um grupo de ofertas: desconto relevante ou vendas fortes ou comissão relevante, e título/preço válidos. Responda exclusivamente JSON válido no formato {"approved":boolean,"reason":"até 120 caracteres","score":0-100}.`,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    const text = json?.output_text || json?.output?.flatMap((item) => item?.content || []).find((item) => item?.type === 'output_text')?.text;
    const parsed = typeof text === 'string' ? JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim()) : null;
    if (!response.ok || !parsed || typeof parsed.approved !== 'boolean') return { approved: false, reason: 'IA não retornou uma avaliação válida' };
    return { approved: parsed.approved === true, reason: String(parsed.reason || 'Avaliação automática').slice(0, 120), score: Number(parsed.score) || 0 };
  } catch {
    return { approved: false, reason: 'IA indisponível; oferta mantida na fila manual' };
  } finally {
    clearTimeout(timer);
  }
}

async function handleSendOffer(req, res, pathOnly) {
  try {
    const body = await readJsonBody(req);
    const offer = body.offer || body.product;
    const groupIds = body.groupIds || body.destinationGroupIds || [];
    if (!offer || !offer.id || !Array.isArray(groupIds) || groupIds.length === 0) {
      sendJson(res, 400, { error: { code: 'INVALID_SEND_REQUEST', message: 'Oferta e pelo menos um grupo são obrigatórios.' } });
      return;
    }
    const groups = groupIds.map(id => ({ id }));
    if (!groups.length) {
      sendJson(res, 400, { error: { code: 'MISSING_DESTINATIONS', message: 'Nenhum grupo válido selecionado.' } });
      return;
    }
    const job = {
      id: `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: requestUserId(req), status: 'pending', step: 3, offers: [offer],
      message: { whatsapp: { customMessage: body.message || '{TITULO}\n{PRECO}\n{LINK}', showImage: true } },
      destinations: { groups: groupIds.map(id => ({ id })), interval: body.interval || { value: 20, unit: 'seconds' } },
      createdAt: new Date().toISOString(), startedAt: null, completedAt: null,
      stats: { sent: 0, failed: 0, deduplicated: 0, cancelled: 0, pending: groupIds.length }, currentGroupIndex: 0, attempts: [],
      idempotencyKey: String(req.headers['idempotency-key'] || `${offer.id}:${groupIds.join(',')}`),
    };
    dispatchJobs.set(job.id, job);
    await DispatchStore.save(job);
    if (PROCESS_DISPATCH_INLINE) void resumeDispatchQueue();
    sendJson(res, 202, { jobId: job.id, status: job.status });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao enviar oferta.' } });
  }
}

async function handleUpdateQueueItem(req, res, pathOnly) {
  try {
    const id = pathOnly.replace('/api/queue/', '');
    const body = await readJsonBody(req);
    if (typeof body.selected !== 'boolean') {
      sendJson(res, 400, { error: { code: 'INVALID_SELECTION', message: 'selected deve ser booleano.' } });
      return;
    }
    const item = await PublicationHistoryStore.update('default_user', id, { selected: body.selected });
    if (!item) { sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Item da fila não encontrado.' } }); return; }
    sendJson(res, 200, { item });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar seleção da fila.' } });
  }
}

async function handleCreateDispatch(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { offers, message, destinations } = body;
    
    if (!offers || !Array.isArray(offers) || offers.length === 0) {
      sendJson(res, 400, { error: { code: 'MISSING_OFFERS', message: 'Nenhuma oferta selecionada.' } });
      return;
    }
    if (!destinations || !destinations.groups || destinations.groups.length === 0) {
      sendJson(res, 400, { error: { code: 'MISSING_DESTINATIONS', message: 'Nenhum grupo selecionado.' } });
      return;
    }
    const groups = destinations.groups.map(group => typeof group === 'string' ? { id: group } : group).filter(group => group?.id);
    if (!groups.length) {
      sendJson(res, 400, { error: { code: 'MISSING_DESTINATIONS', message: 'Nenhum grupo válido selecionado.' } });
      return;
    }

    const jobId = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job = {
      id: jobId,
      userId,
      status: 'pending',
      step: 3,
      offers,
      message: { whatsapp: { ...(message?.whatsapp || {}), customMessage: message?.whatsapp?.customMessage || '{TITULO}\n{PRECO}\n{LINK}', showImage: true } },
      destinations: { ...destinations, groups },
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      stats: { sent: 0, failed: 0, deduplicated: 0, cancelled: 0, pending: groups.length * offers.length },
      currentGroupIndex: 0,
      attempts: [],
      idempotencyKey: String(req.headers['idempotency-key'] || body.idempotencyKey || jobId),
    };
    dispatchJobs.set(jobId, job);
    await DispatchStore.save(job);

    // Send to n8n webhook if configured
    if (USE_LEGACY_N8N_DISPATCH) {
      try {
        const n8nPayload = {
          jobId,
          waha_session: destinations.sessionId || groups[0]?.sessionId || WAHA_SESSION,
          template_type: message?.whatsapp?.templateId || 'humanizado',
          delay_between_groups: destinations.delay_between_groups || 30,
          delay_between_products: destinations.delay_between_products || 120,
          groups: groups.map(g => ({ id: g.id, name: g.name })),
          products: offers.map(o => ({
            marketplace: o.marketplace || 'shopee',
            product_id: o.id,
            title: o.name,
            original_price: o.originalPrice,
            current_price: o.currentPrice,
            discount_percentage: o.discountPercentage,
            commission_percentage: o.commissionRate,
            image_url: o.imageUrl,
            affiliate_url: o.affiliateUrl,
            category: o.category,
            message: message?.whatsapp?.customMessage || '{TITULO}\n{PRECO}\n{LINK}'
          }))
        };
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(N8N_WEBHOOK_SECRET && { 'X-Webhook-Secret': N8N_WEBHOOK_SECRET })
          },
          body: JSON.stringify(n8nPayload)
        });
        logLine(`[DISPATCH] Sent job ${jobId} to n8n webhook`);
      } catch (err) {
        logLine(`[DISPATCH] Failed to send to n8n: ${err.message}`);
      }
    }

    // Inicia processamento assíncrono (fallback inline se n8n não configurado)
    if (PROCESS_DISPATCH_INLINE && !USE_LEGACY_N8N_DISPATCH) void resumeDispatchQueue();

    sendJson(res, 201, { jobId, status: 'pending' });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar disparo.' } });
  }
}

async function processDispatchJob(jobId) {
  const job = dispatchJobs.get(jobId) || await DispatchStore.get('default_user', jobId);
  if (!job) return;
  if (job.status === 'cancelled') return;

  const scheduledAt = job.destinations?.scheduledAt ? new Date(job.destinations.scheduledAt).getTime() : 0;
  if (scheduledAt && scheduledAt > Date.now()) return;

  job.status = 'running';
  job.startedAt = new Date().toISOString();
  dispatchJobs.set(jobId, job);
  await DispatchStore.save(job);

  const { offers, message, destinations } = job;
  const intervalMs = getIntervalMs(destinations.interval);
  const groups = destinations.groups;
  const totalDeliveries = groups.length * offers.length;
  let deliveryIndex = (job.stats.sent || 0) + (job.stats.failed || 0);

  const sessionStatus = await wahaGetSession(destinations.sessionId || groups[0]?.sessionId || WAHA_SESSION);
  if (!sessionStatus || sessionStatus.status !== 'WORKING') {
    job.status = 'waiting_connection';
    job.error = 'Sessão WAHA não conectada.';
    dispatchJobs.set(jobId, job);
    await DispatchStore.save(job);
    return;
  }

  for (let i = 0; i < groups.length; i++) {
    if (await dispatchWasCancelled(job)) return;
    const group = groups[i];
    job.currentGroupIndex = i;
    
    // Verifica pausas de segurança
    if (shouldPause(destinations)) {
      if (await sleepUntilNextDispatch(job, 60000)) return;
      i--;
      continue;
    }

    // Envia para cada oferta
    for (const offer of offers) {
      if (await dispatchWasCancelled(job)) return;
      const sessionName = destinations.sessionId || group.sessionId || WAHA_SESSION;
      if (await alreadyDispatchedRecently(job.userId, offer, group.id, sessionName)) {
        job.attempts.push({ offerId: offer.id, productKey: dispatchProductKey(offer), marketplace: offer.marketplace || 'shopee', groupId: group.id, sessionId: sessionName, status: 'deduplicated', sentAt: new Date().toISOString(), attempts: 0 });
        job.stats.deduplicated = (job.stats.deduplicated || 0) + 1;
        deliveryIndex++;
        job.stats.pending = Math.max(0, totalDeliveries - deliveryIndex);
        dispatchJobs.set(jobId, job);
        await DispatchStore.save(job);
        logLine(`[DISPATCH] Bloqueado por duplicação: ${offer.id} -> ${group.id}`);
        continue;
      }
      try {
        const msg = renderWhatsAppMessage(message.whatsapp.customMessage, offer, {
          rotatingCTAs: Boolean(message.whatsapp.rotatingCTAs),
          rotationIndex: deliveryIndex,
        });
        const imageUrl = resolveDispatchImageUrl(offer.imageUrl);
        const result = await sendToWhatsAppGroup(group.id, msg, imageUrl, sessionName);
        job.attempts.push({ offerId: offer.id, productKey: dispatchProductKey(offer), marketplace: offer.marketplace || 'shopee', groupId: group.id, sessionId: sessionName, messageId: result?.id || result?.key?.id || null, status: 'sent', sentAt: new Date().toISOString(), attempts: 1 });
        job.stats.sent++;
      } catch (e) {
        job.attempts.push({ offerId: offer.id, productKey: dispatchProductKey(offer), marketplace: offer.marketplace || 'shopee', groupId: group.id, sessionId: destinations.sessionId || group.sessionId || WAHA_SESSION, messageId: null, status: 'failed', sentAt: new Date().toISOString(), attempts: 1, error: e.message });
        job.stats.failed++;
      }
      deliveryIndex++;
      job.stats.pending = Math.max(0, totalDeliveries - deliveryIndex);
      dispatchJobs.set(jobId, job);
      await DispatchStore.save(job);
      
      // Intervalo entre envios
      if (deliveryIndex < totalDeliveries && await sleepUntilNextDispatch(job, intervalMs)) return;
    }
  }

  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  if (job.stats.failed && !job.stats.sent) job.status = 'failed';
  dispatchJobs.set(jobId, job);
  await DispatchStore.save(job);
}

async function dispatchWasCancelled(job) {
  if (job.status === 'cancelled') return true;
  const persisted = await DispatchStore.get(job.userId, job.id);
  if (persisted?.status !== 'cancelled') return false;
  Object.assign(job, persisted);
  dispatchJobs.set(job.id, job);
  return true;
}

async function sleepUntilNextDispatch(job, intervalMs) {
  const deadline = Date.now() + Math.max(0, intervalMs);
  while (Date.now() < deadline) {
    if (await dispatchWasCancelled(job)) return true;
    await sleep(Math.min(1000, deadline - Date.now()));
  }
  return dispatchWasCancelled(job);
}

function getIntervalMs(interval) {
  const { value, unit } = interval;
  switch (unit) {
    case 'seconds': return value * 1000;
    case 'minutes': return value * 60 * 1000;
    case 'hours': return value * 60 * 60 * 1000;
    default: return 20 * 60 * 1000;
  }
}

function shouldPause(destinations) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Domingo, 6 = Sábado
  
  if (destinations.nightPause && (hour >= 23 || hour < 6)) return true;
  if (destinations.weekendPause && (day === 0 || day === 6)) return true;
  if (destinations.expirePause) {
    // Verifica se alguma oferta expirou
    // Por enquanto retorna false
  }
  return false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function resumeDispatchQueue() {
  if (dispatchQueueRunning) return;
  dispatchQueueRunning = true;
  try {
    const jobs = await DispatchStore.list('default_user', 200);
    const queued = jobs
      .filter(item => item.status === 'pending' || item.status === 'running' || item.status === 'waiting_connection')
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const nextJob = queued.find(item => item.status === 'running')
      || queued.find(item => item.status === 'waiting_connection')
      || queued.find(item => {
        const scheduledAt = item.destinations?.scheduledAt ? new Date(item.destinations.scheduledAt).getTime() : 0;
        return item.status === 'pending' && (!scheduledAt || scheduledAt <= Date.now());
      });
    if (!nextJob) return;
    dispatchJobs.set(nextJob.id, nextJob);
    await processDispatchJob(nextJob.id);
  } catch (error) {
    logLine(`[DISPATCH QUEUE] Falha ao restaurar fila: ${error.message}`);
  } finally {
    dispatchQueueRunning = false;
  }
}

function renderMessage(template, offer) {
  return template
    .replace(/{TITULO}/g, offer.name || '')
    .replace(/{PRECO}/g, offer.currentPrice ? `R$ ${offer.currentPrice.toFixed(2).replace('.', ',')}` : '—')
    .replace(/{PRECO_ANTIGO}/g, offer.originalPrice ? `R$ ${offer.originalPrice.toFixed(2).replace('.', ',')}` : '—')
    .replace(/{LINK}/g, offer.affiliateUrl || offer.productUrl || '')
    .replace(/{CUPOM}/g, 'CUPOM10');
}

async function sendToWhatsAppGroup(groupId, message, imageUrl, sessionName = WAHA_SESSION) {
  try {
    const result = await wahaSendMessage(groupId, message, imageUrl, sessionName);
    logLine(`[DISPATCH] Enviado para grupo ${groupId}: ${result?.id || 'ok'}`);
    return result;
  } catch (err) {
    logLine(`[DISPATCH ERROR] Falha ao enviar para ${groupId}: ${err.message}`);
    throw err;
  }
}

async function handleGetDispatch(req, res, pathOnly) {
  try {
    const jobId = pathOnly.replace('/api/dispatch/', '');
    const job = dispatchJobs.get(jobId) || await DispatchStore.get(requestUserId(req), jobId);
    if (!job) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Disparo não encontrado.' } });
      return;
    }
    sendJson(res, 200, job);
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar disparo.' } });
  }
}

async function handleCancelDispatch(req, res, pathOnly) {
  try {
    const jobId = decodeURIComponent(pathOnly.replace('/api/dispatch/', '').replace(/\/cancel$/, ''));
    const userId = requestUserId(req);
    const job = dispatchJobs.get(jobId) || await DispatchStore.get(userId, jobId);
    if (!job) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Disparo não encontrado.' } });
      return;
    }
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      sendJson(res, 409, { error: { code: 'DISPATCH_NOT_CANCELLABLE', message: 'Este disparo já foi finalizado e não pode ser cancelado.' } });
      return;
    }
    const total = (job.offers?.length || 0) * (job.destinations?.groups?.length || 0);
    const completed = (job.stats?.sent || 0) + (job.stats?.failed || 0) + (job.stats?.deduplicated || 0);
    const pending = Math.max(0, total - completed);
    const cancelled = {
      ...job,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: 'cancelled_by_user',
      stats: { ...job.stats, cancelled: (job.stats?.cancelled || 0) + pending, pending: 0 },
    };
    dispatchJobs.set(jobId, cancelled);
    await DispatchStore.save(cancelled);
    logLine(`[DISPATCH] Cancelado pelo usuário: ${jobId}; ${pending} envio(s) pendente(s) interrompido(s).`);
    sendJson(res, 200, { job: cancelled });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Não foi possível cancelar o disparo.' } });
  }
}

async function handleDispatchHistory(req, res) {
  try {
    const userId = 'default_user';
    const history = await DispatchStore.list(userId, 50);
    sendJson(res, 200, { history });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar histórico.' } });
  }
}

// ========== GROUPS HANDLERS ==========

async function handleGetGroups(req, res) {
  try {
    const userId = requestUserId(req);
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const sessionId = parsed.searchParams.get('session');
    const groups = await WhatsAppGroupsStore.get(userId);
    sendJson(res, 200, { groups: (groups || []).filter(group => !sessionId || group.sessionId === sessionId) });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar grupos.' } });
  }
}

async function handleSyncGroups(req, res) {
  try {
    const userId = requestUserId(req);
    const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
    const sessionId = parsed.searchParams.get('session') || WAHA_SESSION;
    const groups = await syncWhatsAppGroups(userId, sessionId);
    await WhatsAppGroupsStore.save(userId, groups);
    sendJson(res, 200, { groups, synced: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao sincronizar grupos.' } });
  }
}

async function syncWhatsAppGroups(userId, sessionId = WAHA_SESSION) {
  try {
    return (await wahaGetGroups(sessionId)).map(group => ({ ...group, sessionId }));
  } catch (err) {
    logLine(`[GROUPS ERROR] ${err.message}`);
    return [];
  }
}

async function handleGroupStats(req, res, pathOnly) {
  try {
    const groupId = pathOnly.replace('/api/groups/', '').replace('/stats', '');
    const stats = {
      groupId,
      messagesSent30d: Math.floor(Math.random() * 50),
      messagesReceived30d: Math.floor(Math.random() * 20),
      clicks: Math.floor(Math.random() * 200),
      conversions: Math.floor(Math.random() * 10),
      commission: Math.random() * 500,
    };
    sendJson(res, 200, stats);
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar stats.' } });
  }
}

// ========== MIRRORING HANDLERS ==========

const mirroringConfigs = new Map();
const mirroringWorkers = new Map();

async function handleCreateMirroring(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { sourceGroupId, destinationGroupIds, mirroringType, templateIds, onlyOffers, couponSource, iAmPoster } = body;

    if (!sourceGroupId || !destinationGroupIds || destinationGroupIds.length === 0) {
      sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Origem e destinos são obrigatórios.' } });
      return;
    }

    const configId = `mirror-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const config = {
      id: configId,
      userId,
      sourceGroupId,
      destinationGroupIds,
      mirroringType: mirroringType || 'instant',
      templateIds: templateIds || [],
      onlyOffers: onlyOffers !== false,
      couponSource: couponSource || 'origin',
      iAmPoster: iAmPoster || false,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      stats: { mirrored: 0, failed: 0 },
    };
    mirroringConfigs.set(configId, config);
    await MirroringConfigStore.save(config);

    // Inicia worker de monitoramento
    startMirroringWorker(configId);

    sendJson(res, 201, { config });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar espelhamento.' } });
  }
}

async function handleGetMirroring(req, res) {
  try {
    const userId = requestUserId(req);
    const stored = await MirroringConfigStore.list(userId);
    const configs = stored.length ? stored : Array.from(mirroringConfigs.values()).filter(c => c.userId === userId);
    sendJson(res, 200, { configs });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar espelhamentos.' } });
  }
}

async function handleDeleteMirroring(req, res, pathOnly) {
  try {
    const configId = pathOnly.replace('/api/mirroring/', '');
    const config = mirroringConfigs.get(configId);
    if (!config) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Espelhamento não encontrado.' } });
      return;
    }
    stopMirroringWorker(configId);
    mirroringConfigs.delete(configId);
    await MirroringConfigStore.remove(configId);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover espelhamento.' } });
  }
}

async function handleMirroringLogs(req, res, pathOnly) {
  try {
    const configId = pathOnly.replace('/api/mirroring/', '').replace('/logs', '');
    const config = mirroringConfigs.get(configId);
    if (!config) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Espelhamento não encontrado.' } });
      return;
    }
    sendJson(res, 200, { logs: config.logs || [], stats: config.stats });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar logs.' } });
  }
}

function startMirroringWorker(configId) {
  const worker = setInterval(async () => {
    const config = mirroringConfigs.get(configId);
    if (!config || config.status !== 'active') {
      stopMirroringWorker(configId);
      return;
    }
    try {
      await checkAndMirror(config);
      config.lastRunAt = new Date().toISOString();
      mirroringConfigs.set(configId, config);
    } catch (e) {
      config.stats.failed++;
      mirroringConfigs.set(configId, config);
    }
  }, 30000); // Verifica a cada 30s
  mirroringWorkers.set(configId, worker);
}

function stopMirroringWorker(configId) {
  const worker = mirroringWorkers.get(configId);
  if (worker) {
    clearInterval(worker);
    mirroringWorkers.delete(configId);
  }
}

async function checkAndMirror(config) {
  // Busca novas mensagens no grupo de origem
  // Filtra ofertas, troca links, reposta nos destinos
  logLine(`[MIRRORING] Verificando origem ${config.sourceGroupId} para ${config.destinationGroupIds.length} destinos`);
  config.stats.mirrored++;
  mirroringConfigs.set(config.id, config);
}

// ========== PUBLIC PAGES HANDLERS ==========

const publicPages = new Map();

async function handleCreatePage(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { name, type, products, customization } = body;

    if (!name || !type) {
      sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Nome e tipo são obrigatórios.' } });
      return;
    }

    const pageId = `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const page = {
      id: pageId,
      userId,
      name,
      type, // 'vitrine' | 'convite' | 'linktree'
      status: 'draft',
      slug,
      products: products || [],
      customization: customization || { theme: 'light', primaryColor: '#EE4D2D' },
      createdAt: new Date().toISOString(),
      publishedAt: null,
      publicUrl: `/p/${slug}`,
    };
    publicPages.set(pageId, page);
    sendJson(res, 201, { page });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar página.' } });
  }
}

async function handleGetPages(req, res) {
  try {
    const userId = 'default_user';
    const pages = Array.from(publicPages.values()).filter(p => p.userId === userId);
    sendJson(res, 200, { pages });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar páginas.' } });
  }
}

async function handleUpdatePage(req, res, pathOnly) {
  try {
    const pageId = pathOnly.replace('/api/pages/', '');
    const body = await readJsonBody(req);
    const page = publicPages.get(pageId);
    if (!page) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Página não encontrada.' } });
      return;
    }
    Object.assign(page, body);
    publicPages.set(pageId, page);
    sendJson(res, 200, { page });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar página.' } });
  }
}

async function handleDeletePage(req, res, pathOnly) {
  try {
    const pageId = pathOnly.replace('/api/pages/', '');
    publicPages.delete(pageId);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir página.' } });
  }
}

async function handleAddProductsToPage(req, res, pathOnly) {
  try {
    const pageId = pathOnly.replace('/api/pages/', '').replace('/products', '');
    const body = await readJsonBody(req);
    const { productIds } = body;
    const page = publicPages.get(pageId);
    if (!page) {
      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Página não encontrada.' } });
      return;
    }
    page.products = [...new Set([...page.products, ...productIds])];
    publicPages.set(pageId, page);
    sendJson(res, 200, { page });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao adicionar produtos.' } });
  }
}

async function handlePublicPage(req, res, pathOnly) {
  try {
    const slug = pathOnly.replace('/p/', '');
    const page = Array.from(publicPages.values()).find(p => p.slug === slug && p.status === 'published');
    if (!page) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Página não encontrada</h1>');
      return;
    }
    // Renderiza HTML da página pública
    const html = renderPublicPage(page);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Erro interno</h1>');
  }
}

function renderPublicPage(page) {
  const productsHtml = page.products.map(p => `
    <div class="product-card">
      <img src="${p.imageUrl || ''}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p class="price">R$ ${p.currentPrice?.toFixed(2).replace('.', ',')}</p>
      ${p.originalPrice ? `<p class="original-price">De R$ ${p.originalPrice.toFixed(2).replace('.', ',')}</p>` : ''}
      <a href="${p.affiliateUrl || p.productUrl}" target="_blank">Ver Oferta</a>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8fafc; }
    .container { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    h1 { color: #1e293b; margin-bottom: 8px; }
    .subtitle { color: #64748b; margin-bottom: 24px; }
    .products { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .product-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
    .product-card img { width: 100%; height: 150px; object-fit: cover; border-radius: 8px; }
    .product-card h3 { font-size: 14px; margin: 12px 0 4px; color: #1e293b; }
    .price { font-size: 18px; font-weight: bold; color: #EE4D2D; margin: 8px 0; }
    .original-price { text-decoration: line-through; color: #94a3b8; font-size: 14px; }
    .product-card a { display: inline-block; margin-top: 12px; padding: 8px 16px; background: #EE4D2D; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${page.name}</h1>
    <p class="subtitle">${page.customization?.description || 'Minhas ofertas selecionadas'}</p>
    <div class="products">${productsHtml}</div>
  </div>
</body>
</html>`;
}

// ========== SETTINGS HANDLERS ==========

const userSettings = new Map();

async function handleGetSettings(req, res) {
  try {
    const userId = 'default_user';
    let settings = userSettings.get(userId);
    if (!settings) {
      settings = getDefaultSettings();
      userSettings.set(userId, settings);
    }
    sendJson(res, 200, settings);
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar configurações.' } });
  }
}

function getDefaultSettings() {
  return {
    channels: { whatsapp: { connected: false }, telegram: { connected: false } },
    platforms: { shopee: { appId: '', secret: '', validated: false }, mercadoLivre: { affiliateTag: '' }, amazon: { associateTag: '' }, magalu: { storeSlug: '' } },
    templates: [],
    coupons: [],
    security: { safeInterval: true },
    account: { name: '', email: '', plan: 'free', subscriptionStatus: 'inactive' },
  };
}

async function handleUpdateChannels(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const settings = userSettings.get(userId) || getDefaultSettings();
    settings.channels = { ...settings.channels, ...body };
    userSettings.set(userId, settings);
    sendJson(res, 200, { ok: true, settings });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar canais.' } });
  }
}

async function handleUpdatePlatforms(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const settings = userSettings.get(userId) || getDefaultSettings();
    settings.platforms = { ...settings.platforms, ...body };
    userSettings.set(userId, settings);
    sendJson(res, 200, { ok: true, settings });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar plataformas.' } });
  }
}

async function handleUpdateTemplates(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const settings = userSettings.get(userId) || getDefaultSettings();
    settings.templates = body;
    userSettings.set(userId, settings);
    sendJson(res, 200, { ok: true, settings });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar templates.' } });
  }
}

async function handleUpdateCoupons(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const settings = userSettings.get(userId) || getDefaultSettings();
    settings.coupons = body;
    userSettings.set(userId, settings);
    sendJson(res, 200, { ok: true, settings });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar cupons.' } });
  }
}

async function handleUpdateSecurity(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const settings = userSettings.get(userId) || getDefaultSettings();
    settings.security = { ...settings.security, ...body };
    userSettings.set(userId, settings);
    sendJson(res, 200, { ok: true, settings });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar segurança.' } });
  }
}

async function handleUpdateAccount(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const settings = userSettings.get(userId) || getDefaultSettings();
    settings.account = { ...settings.account, ...body };
    userSettings.set(userId, settings);
    sendJson(res, 200, { ok: true, settings });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar conta.' } });
  }
}

// ========== WHATSAPP HANDLERS (WAHA) ==========

async function handleWahaWebhook(req, res) {
  let raw;
  try {
    raw = await readRawBody(req);
    if (!webhookSignatureValid(raw, req)) {
      sendJson(res, 401, { error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Assinatura do webhook inválida.' } });
      return;
    }
    const body = JSON.parse(raw || '{}');
    const requestId = String(req.headers['x-webhook-request-id'] || body.id || `event_${Date.now()}`);
    if (await WebhookEventStore.has(requestId)) {
      sendJson(res, 200, { ok: true, duplicate: true });
      return;
    }
    await WebhookEventStore.add({ id: requestId, event: body.event, session: body.session, payload: body.payload || body });
    if (body.event === 'session.status' || body.event === 'state.change') {
      const wahaSessionId = body.session || WAHA_SESSION;
      const rawStatus = body.payload?.status || body.payload?.state || 'unknown';
      const normalized = rawStatus === 'WORKING' ? 'connected' : rawStatus === 'SCAN_QR_CODE' ? 'qr_code' : rawStatus === 'STARTING' ? 'connecting' : rawStatus === 'FAILED' ? 'error' : 'disconnected';
      const savedSession = await WhatsAppSessionStore.getByWahaId('default_user', wahaSessionId);
      if (savedSession) await WhatsAppSessionStore.update(savedSession.id, { status: normalized, phone: body.payload?.me?.id?.replace('@c.us', '') || savedSession.phone });
      logLine(`[WAHA] status ${wahaSessionId}: ${rawStatus}`);
    }
    if (body.event === 'message.ack' || body.event === 'message.ack.group') {
      await applyAckWebhook(body);
    }
    if (body.event === 'message' || body.event === 'message.any') {
      await processMirroringMessage(body);
    }
    sendJson(res, 200, { ok: true });
  } catch (err) {
    logLine(`[WAHA WEBHOOK ERROR] ${err.message}`);
    sendJson(res, 400, { error: { code: 'INVALID_WEBHOOK', message: 'Webhook inválido.' } });
  }
}

function dispatchProductKey(offer) {
  const marketplace = String(offer?.marketplace || 'shopee').trim().toLowerCase();
  const productId = String(offer?.marketplaceProductId || offer?.productId || offer?.id || '').trim();
  return `${marketplace}:${productId}`;
}

async function alreadyDispatchedRecently(userId, offer, groupId, sessionId) {
  const since = Date.now() - Math.max(1, WHATSAPP_DEDUP_WINDOW_HOURS) * 60 * 60 * 1000;
  const productKey = dispatchProductKey(offer);
  const jobs = await DispatchStore.list(userId, 500);
  return jobs.some(job => (job.attempts || []).some(attempt =>
    attempt.status === 'sent' &&
    attempt.groupId === groupId &&
    // As tentativas antigas não possuem productKey; elas continuam protegidas
    // pelo offerId para não abrir uma brecha na deduplicação já existente.
    (attempt.productKey ? attempt.productKey === productKey : String(attempt.offerId) === String(offer?.id)) &&
    new Date(attempt.sentAt).getTime() >= since
  ));
}

async function handleUpdateMirroring(req, res, pathOnly) {
  try {
    const configId = pathOnly.replace('/api/mirroring/', '');
    const config = mirroringConfigs.get(configId) || await MirroringConfigStore.get(requestUserId(req), configId);
    if (!config) { sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Espelhamento não encontrado.' } }); return; }
    const body = await readJsonBody(req);
    const next = { ...config, ...body, id: configId, userId: config.userId || requestUserId(req), updatedAt: new Date().toISOString() };
    if (body.status === 'active' && config.status !== 'active') startMirroringWorker(configId);
    if (body.status && body.status !== 'active') stopMirroringWorker(configId);
    mirroringConfigs.set(configId, next);
    await MirroringConfigStore.save(next);
    sendJson(res, 200, { config: next });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar espelhamento.' } });
  }
}

async function handleUpdateGroup(req, res, pathOnly) {
  try {
    const id = decodeURIComponent(pathOnly.replace('/api/groups/', ''));
    const updates = await readJsonBody(req);
    const group = await WhatsAppGroupsStore.update(requestUserId(req), id, {
      selected: updates.selected === true,
      status: updates.status,
      name: typeof updates.name === 'string' ? updates.name.slice(0, 120) : undefined,
    });
    if (!group) { sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Grupo não encontrado.' } }); return; }
    sendJson(res, 200, { group });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar grupo.' } });
  }
}

async function handleDeleteGroup(req, res, pathOnly) {
  try {
    const id = decodeURIComponent(pathOnly.replace('/api/groups/', ''));
    const removed = await WhatsAppGroupsStore.remove(requestUserId(req), id);
    if (!removed) { sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Grupo não encontrado.' } }); return; }
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover grupo.' } });
  }
}

async function applyAckWebhook(event) {
  const payload = event.payload || {};
  const messageId = payload.id || payload.key?.id || payload.message?.id;
  if (!messageId) return;
  for (const job of await DispatchStore.list('default_user', 100)) {
    const attempt = (job.attempts || []).find(item => item.messageId === messageId);
    if (!attempt) continue;
    attempt.status = String(payload.ack || payload.ackName || payload.status || 'acknowledged').toLowerCase();
    attempt.ackAt = new Date().toISOString();
    await DispatchStore.save(job);
  }
}

function extractIncomingMessage(event) {
  const payload = event.payload || {};
  const message = payload.body || payload.message?.body || payload.text || '';
  const chatId = payload.from || payload.chatId || payload.key?.remoteJid || '';
  return { chatId: String(chatId), text: String(message), messageId: payload.id || payload.key?.id || null };
}

async function processMirroringMessage(event) {
  const incoming = extractIncomingMessage(event);
  if (!incoming.chatId.endsWith('@g.us') || !incoming.text) return;
  const configs = await MirroringConfigStore.list('default_user');
  for (const config of configs.filter(item => item.status === 'active' && item.sourceGroupId === incoming.chatId)) {
    if (config.onlyOffers && !/(shopee|mercadolivre|mercadolivre|amazon|magalu|\.com\.br)/i.test(incoming.text)) continue;
    const text = incoming.text;
    for (const destination of config.destinationGroupIds || []) {
      try {
        const result = await wahaSendMessage(destination, text, null);
        config.stats = { ...(config.stats || {}), mirrored: (config.stats?.mirrored || 0) + 1 };
        config.lastRunAt = new Date().toISOString();
        config.logs = [...(config.logs || []).slice(-99), { destination, messageId: result?.id || result?.key?.id || null, at: new Date().toISOString(), status: 'sent' }];
      } catch (error) {
        config.stats = { ...(config.stats || {}), failed: (config.stats?.failed || 0) + 1 };
        config.logs = [...(config.logs || []).slice(-99), { destination, at: new Date().toISOString(), status: 'failed', error: error.message }];
      }
    }
    await MirroringConfigStore.save(config);
  }
}

async function handleWhatsAppStatus(req, res) {
  try {
    const requestedSession = new URL(req.url || '/', `http://${req.headers.host}`).searchParams.get('session') || WAHA_SESSION;
    const session = await wahaGetSession(requestedSession);
    const normalizedStatus = session?.status === 'WORKING' ? 'connected' : session?.status === 'SCAN_QR_CODE' ? 'qr_code' : session?.status === 'STARTING' ? 'connecting' : session?.status === 'FAILED' ? 'error' : 'disconnected';
    sendJson(res, 200, {
      connected: session?.status === 'WORKING',
      phone: session?.me?.id?.replace('@c.us', '') || null,
      qrCode: session?.status === 'SCAN_QR_CODE' ? await wahaGetQR(requestedSession) : null,
      status: normalizedStatus,
      wahaStatus: session?.status || 'STOPPED',
      session: session?.name,
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar status.' } });
  }
}

async function handleWhatsAppConnect(req, res) {
  try {
    const body = await readJsonBody(req);
    const sessionName = String(body.sessionId || body.wahaSessionId || WAHA_SESSION).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
    const session = await wahaStartSession(sessionName);
    const qrCode = session?.status === 'SCAN_QR_CODE' ? await wahaGetQR(sessionName) : null;
    const record = { id: body.id || `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, userId: requestUserId(req), name: String(body.name || sessionName).slice(0, 80), wahaSessionId: sessionName, phone: session?.me?.id?.replace('@c.us', '') || null, status: session?.status || 'STARTING', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    const existing = await WhatsAppSessionStore.getByWahaId(record.userId, sessionName);
    await WhatsAppSessionStore.save(existing ? { ...existing, ...record, id: existing.id, createdAt: existing.createdAt } : record);
    sendJson(res, 200, { 
      qrCode, 
      status: session?.status === 'SCAN_QR_CODE' ? 'qr_code' : session?.status === 'WORKING' ? 'connected' : 'connecting',
      session: sessionName,
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: `Erro ao conectar WhatsApp: ${err.message}` } });
  }
}

async function handleWhatsAppDisconnect(req, res) {
  try {
    const body = await readJsonBody(req).catch(() => ({}));
    const sessionName = body.sessionId || WAHA_SESSION;
    await wahaLogout(sessionName);
    const saved = await WhatsAppSessionStore.getByWahaId(requestUserId(req), sessionName);
    if (saved) await WhatsAppSessionStore.update(saved.id, { status: 'disconnected', phone: null });
    sendJson(res, 200, { ok: true, message: 'WhatsApp desconectado.' });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao desconectar.' } });
  }
}

async function handleWhatsAppQR(req, res) {
  try {
    const body = await readJsonBody(req).catch(() => ({}));
    const qrCode = await wahaGetQR(body.sessionId || WAHA_SESSION);
    if (!qrCode) {
      sendJson(res, 404, { error: { code: 'NO_QR', message: 'QR code não disponível. Inicie a conexão primeiro.' } });
      return;
    }
    sendJson(res, 200, { qrCode: `data:image/png;base64,${qrCode}` });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao gerar QR code.' } });
  }
}

async function handleWhatsAppSessions(req, res) {
  const sessions = await WhatsAppSessionStore.list(requestUserId(req));
  sendJson(res, 200, { sessions });
}

async function handleCreateWhatsAppSession(req, res) {
  const body = await readJsonBody(req);
  if (!body.name) { sendJson(res, 400, { error: { code: 'MISSING_NAME', message: 'Nome da conexão é obrigatório.' } }); return; }
  const sessionId = String(body.sessionId || body.name).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 64);
  const result = await wahaStartSession(sessionId);
  const record = { id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, userId: requestUserId(req), name: String(body.name).slice(0, 80), wahaSessionId: sessionId, phone: result?.me?.id?.replace('@c.us', '') || null, status: result?.status || 'STARTING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const existing = await WhatsAppSessionStore.getByWahaId(record.userId, sessionId);
  const saved = await WhatsAppSessionStore.save(existing ? { ...existing, ...record, id: existing.id, createdAt: existing.createdAt } : record);
  sendJson(res, 201, { session: saved, qrCode: result?.status === 'SCAN_QR_CODE' ? await wahaGetQR(sessionId) : null });
}

async function handleDeleteWhatsAppSession(req, res, pathOnly) {
  const id = decodeURIComponent(pathOnly.replace('/api/whatsapp/sessions/', ''));
  const session = await WhatsAppSessionStore.get(requestUserId(req), id);
  if (!session) { sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Sessão não encontrada.' } }); return; }
  await wahaLogout(session.wahaSessionId);
  await WhatsAppSessionStore.remove(id);
  sendJson(res, 200, { ok: true });
}

// ========== TEMPLATES HANDLERS ==========

const userTemplates = new Map();

async function handleGetTemplates(req, res) {
  try {
    const userId = 'default_user';
    let templates = userTemplates.get(userId);
    if (!templates) {
      templates = getDefaultTemplates();
      userTemplates.set(userId, templates);
    }
    sendJson(res, 200, { templates });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar templates.' } });
  }
}

function getDefaultTemplates() {
  return [
    { id: 'vendedor', name: 'Humanizado', message: "👀 *OLHA O QUE EU ACHEI!*\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\n✅ *Agora por: {PRECO}*\n_{DESCONTO}% OFF_\n\n🛒 *Corre pra ver:*\n{LINK}", isCustom: false, createdAt: new Date().toISOString() },
    { id: 'direto', name: 'Oferta rápida', message: "🚨 *OFERTA ENCONTRADA!*\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\n✅ *Por: {PRECO}*\n_{DESCONTO}% OFF_\n\n🛒 {LINK}", isCustom: false, createdAt: new Date().toISOString() },
    { id: 'achado', name: 'Sensação de achado', message: "👀 *OLHA O QUE EU ACHEI!*\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\n✅ *Agora por: {PRECO}*\n_{DESCONTO}% OFF_\n\n🛒 *Corre pra ver:*\n{LINK}", isCustom: false, createdAt: new Date().toISOString() },
    { id: 'urgencia', name: 'Urgência', message: "⚠️ *PREÇO BAIXOU!*\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\n✅ *Agora por: {PRECO}*\n_{DESCONTO}% OFF_\n\n🛒 {LINK}", isCustom: false, createdAt: new Date().toISOString() },
  ];
}

async function handleSaveTemplate(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { id, name, message, isCustom } = body;
    if (!name || !message) {
      sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Nome e mensagem são obrigatórios.' } });
      return;
    }
    let templates = userTemplates.get(userId) || getDefaultTemplates();
    const template = { id: id || `tpl-${Date.now()}`, name, message, isCustom: true, createdAt: new Date().toISOString() };
    templates = templates.filter(t => t.id !== template.id);
    templates.push(template);
    userTemplates.set(userId, templates);
    sendJson(res, 200, { template });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar template.' } });
  }
}

async function handleDeleteTemplate(req, res, pathOnly) {
  try {
    const userId = 'default_user';
    const templateId = pathOnly.replace('/api/templates/', '');
    let templates = userTemplates.get(userId) || getDefaultTemplates();
    templates = templates.filter(t => t.id !== templateId);
    userTemplates.set(userId, templates);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover template.' } });
  }
}

// ========== COUPONS HANDLERS ==========

const userCoupons = new Map();

async function handleGetCoupons(req, res) {
  try {
    const userId = 'default_user';
    let coupons = userCoupons.get(userId);
    if (!coupons) {
      coupons = [];
      userCoupons.set(userId, coupons);
    }
    sendJson(res, 200, { coupons });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar cupons.' } });
  }
}

async function handleCreateCoupon(req, res) {
  try {
    const userId = 'default_user';
    const body = await readJsonBody(req);
    const { platform, code, description } = body;
    if (!platform || !code) {
      sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Plataforma e código são obrigatórios.' } });
      return;
    }
    let coupons = userCoupons.get(userId) || [];
    const coupon = { id: `coupon-${Date.now()}`, platform, code, description, expiresAt: null, isActive: true };
    coupons.push(coupon);
    userCoupons.set(userId, coupons);
    sendJson(res, 201, { coupon });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar cupom.' } });
  }
}

async function handleDeleteCoupon(req, res, pathOnly) {
  try {
    const userId = 'default_user';
    const couponId = pathOnly.replace('/api/coupons/', '');
    let coupons = userCoupons.get(userId) || [];
    coupons = coupons.filter(c => c.id !== couponId);
    userCoupons.set(userId, coupons);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover cupom.' } });
  }
}

// ========== ANALYTICS HANDLERS ==========

async function handleAnalyticsOverview(req, res) {
  try {
    const userId = 'default_user';
    const hours = parseInt(new URL(req.url || '/', `http://${req.headers.host}`).searchParams.get('hours') || '168');
    const since = Date.now() - hours * 3_600_000;
    
    const store = createSupabaseAnalyticsStore();
    const events = store.enabled ? await store.list({ marketplace: 'all', since }) : [];
    const summary = summarizeAnalyticsEvents(events || [], 'all');
    
    sendJson(res, 200, { ...summary, meta: { source: store.enabled ? 'supabase' : 'local-fallback', hours } });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics overview.' } });
  }
}

async function handleAnalyticsDispatch(req, res) {
  try {
    const jobs = await DispatchStore.list('default_user', 200);
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const runningJobs = jobs.filter(j => j.status === 'running').length;
    const totalSent = jobs.reduce((sum, j) => sum + (j.stats?.sent || 0), 0);
    const totalFailed = jobs.reduce((sum, j) => sum + (j.stats?.failed || 0), 0);
    
    sendJson(res, 200, {
      totalJobs,
      completedJobs,
      runningJobs,
      totalSent,
      totalFailed,
      successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
      jobs: jobs.slice(0, 10).map(j => ({ id: j.id, status: j.status, sent: j.stats?.sent || 0, failed: j.stats?.failed || 0, createdAt: j.createdAt })),
    });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics de disparos.' } });
  }
}

async function handleAnalyticsGroups(req, res) {
  try {
    const userId = 'default_user';
    const groups = await syncWhatsAppGroups(userId);
    const stats = groups.map(g => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount,
      isAdmin: g.isAdmin,
      status: g.status,
      messagesSent30d: g.messagesSent30d,
      messagesReceived30d: g.messagesReceived30d,
      lastActivity: g.lastActivity,
    }));
    sendJson(res, 200, { groups: stats });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics de grupos.' } });
  }
}

async function handleAnalyticsProducts(req, res) {
  try {
    const userId = 'default_user';
    const history = await PublicationHistoryStore.getByUser(userId, 100);
    const productStats = {};
    for (const item of history) {
      if (!productStats[item.productId]) {
        productStats[item.productId] = { productId: item.productId, name: item.productName, marketplace: item.marketplace, publications: 0, totalCommission: 0 };
      }
      productStats[item.productId].publications++;
      // commission estimada
    }
    const topProducts = Object.values(productStats).sort((a, b) => b.publications - a.publications).slice(0, 20);
    sendJson(res, 200, { topProducts });
  } catch (err) {
    sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar analytics de produtos.' } });
  }
}

const isDirectRun =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  initEnv();
  const port = Number.parseInt(process.env.PORT || '8787', 10) || 8787;
  
  // Inicializa data store
  dataStore.init().then(() => {
    logLine('Data store inicializado.');
    if (process.env.DISPATCH_WORKER_ENABLED !== 'false') {
      void resumeDispatchQueue();
      void runAutomaticOfferDiscovery();
      setInterval(() => { void resumeDispatchQueue(); void runAutomaticOfferDiscovery(); }, 15_000);
    }
  }).catch(err => {
    logLine(`AVISO: Erro ao inicializar data store: ${err.message}`);
  });
  
  const app = createApp();
  app.listen(port, () => {
    logLine(`Backend interno rodando em http://localhost:${port}`);
    try {
      loadShopeeConfig();
      logLine('Credenciais Shopee carregadas (valor oculto).');
    } catch (err) {
      logLine(`AVISO: ${/** @type {any} */ (err).message}`);
    }
    try {
      loadMercadoLivreConfig();
      logLine('Credenciais Mercado Livre carregadas (valor oculto).');
    } catch (err) {
      logLine(`AVISO: ${/** @type {any} */ (err).message}`);
    }
    setInterval(pollSalesInBackground, 120_000);
  });
}

export { resumeDispatchQueue, runAutomaticOfferDiscovery };
