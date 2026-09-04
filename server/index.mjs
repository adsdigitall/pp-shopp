import { createServer } from 'node:http';
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
} from './services/storage/DataStore.mjs';
import { dataStore } from './services/storage/DataStore.mjs';

const notifiedSaleIds = new Set();

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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 12_000) reject(new Error('BODY_TOO_LARGE'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
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

const isDirectRun =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  initEnv();
  const port = Number.parseInt(process.env.PORT || '8787', 10) || 8787;
  
  // Inicializa data store
  dataStore.init().then(() => {
    logLine('Data store inicializado.');
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
