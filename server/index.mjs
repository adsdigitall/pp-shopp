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

const isDirectRun =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  initEnv();
  const port = Number.parseInt(process.env.PORT || '8787', 10) || 8787;
  const app = createApp();
  app.listen(port, () => {
    logLine(`Backend interno rodando em http://localhost:${port}`);
    try {
      loadShopeeConfig();
      logLine('Credenciais Shopee carregadas (valor oculto).');
    } catch (err) {
      logLine(`AVISO: ${/** @type {any} */ (err).message}`);
    }
  });
}
