import { describe, it, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

/**
 * Testes da integração Shopee Affiliate API (backend interno).
 *
 * Cenários cobertos:
 *  1. variável ausente          -> 503 MISSING_CREDENTIALS
 *  2. credencial inválida       -> 401 SHOPEE_AUTH_ERROR
 *  3. autenticação correta      -> mock valida a assinatura SHA256 documentada
 *  4. resposta válida           -> 200 com produtos normalizados
 *  5. timeout                   -> 504 UPSTREAM_TIMEOUT
 *  6. erro da Shopee            -> 502 SHOPEE_ERROR
 *  7. resposta sem produtos     -> 200 products: []
 *  8. normalização              -> testes unitários do normalizer
 *  9. rate limit                -> 429 SHOPEE_RATE_LIMIT
 * (10. frontend consumindo backend -> validado visualmente no dev server)
 *
 * O mock upstream reimplementa INDEPENDENTEMENTE o esquema de assinatura
 * oficial (SHA256(AppId+Timestamp+Payload+Secret)) — se o cliente assinar
 * errado, o mock devolve erro 10020 exatamente como a Shopee faria.
 *
 * Runner: node --test tests/ (sem dependências externas)
 */

const APP_ID = 'test-app-id';
const CORRECT_SECRET = 'correct-secret-123';
const WRONG_SECRET = 'wrong-secret-999';

const FIXTURE_FULL = {
  itemId: 23398164028,
  productName: 'Fone De Ouvido Bluetooth TWS Pro 6',
  productLink: 'https://shopee.com.br/product/933390061/23398164028',
  offerLink: 'https://s.shopee.com.br/2qRLhfwL03',
  imageUrl: 'https://cf.shopee.com.br/file/br-111',
  priceMin: '49.99',
  priceMax: '53.99',
  priceDiscountRate: 37,
  sales: 272,
  ratingStar: '5.0',
  commissionRate: '0.38',
  commission: '18.99',
  shopId: 933390061,
  shopName: 'RK_IMPORTS',
};

const FIXTURE_PARTIAL = {
  itemId: 111,
  productName: 'Produto Sem Extras',
  // sem image/link/preço-desconto/rating/commission
};

function buildOfferPayload(keyword) {
  const nodes =
    keyword === '__empty__'
      ? []
      : [FIXTURE_FULL, FIXTURE_PARTIAL];
  return {
    data: {
      productOfferV2: {
        nodes,
        pageInfo: { page: 1, limit: 12, hasNextPage: nodes.length > 0 },
      },
    },
  };
}

/** Reimplementação independente da assinatura oficial. */
function expectedSignature(appId, timestamp, payload, secret) {
  return createHash('sha256')
    .update(`${appId}${timestamp}${payload}${secret}`, 'utf8')
    .digest('hex');
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Mock upstream (faz o papel da open-api.affiliate.shopee.com.br)
// ---------------------------------------------------------------------------

let mockServer;
let mockPort;
const seenRequests = [];

function startMockUpstream() {
  return new Promise((resolve) => {
    mockServer = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seenRequests.push({ auth: req.headers.authorization || '', body });
        const kwMatch = /keyword:\s*"([^"]*)"/.exec(body);
        const keyword = kwMatch ? kwMatch[1] : '';

        if (keyword === '__timeout__') {
          return; // nunca responde -> força timeout no cliente
        }

        const authMatch =
          /^SHA256 Credential=([^,]+), Timestamp=(\d+), Signature=([a-f0-9]{64})$/.exec(
            req.headers.authorization || ''
          );
        const authOk =
          !!authMatch &&
          authMatch[1] === APP_ID &&
          Number(authMatch[2]) >= Math.floor(Date.now() / 1000) - 300 &&
          authMatch[3] ===
            expectedSignature(authMatch[1], authMatch[2], body, CORRECT_SECRET);

        if (!authOk) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              errors: [
                {
                  message: 'Invalid Signature',
                  extensions: { code: 10020 },
                },
              ],
            })
          );
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (keyword === '__shopee_error__') {
          res.end(
            JSON.stringify({
              errors: [
                { message: 'System Error', extensions: { code: 10000 } },
              ],
            })
          );
          return;
        }
        if (keyword === '__rate_limit__') {
          res.end(
            JSON.stringify({
              errors: [
                { message: 'Too Many Requests', extensions: { code: 10030 } },
              ],
            })
          );
          return;
        }
        res.end(JSON.stringify(buildOfferPayload(keyword)));
      });
    });
    mockServer.listen(0, '127.0.0.1', () => {
      mockPort = mockServer.address().port;
      resolve(mockPort);
    });
  });
}

// ---------------------------------------------------------------------------
// Instâncias do backend interno (processos reais `node server/index.mjs`)
// ---------------------------------------------------------------------------

const tempDir = mkdtempSync(path.join(tmpdir(), 'ppshopp-test-'));
const envOkFile = path.join(tempDir, 'env-ok');
writeFileSync(
  envOkFile,
  `SHOPEE_APP_ID=${APP_ID}\nSHOPEE_SECRET=${CORRECT_SECRET}\n`
);
const envWrongFile = path.join(tempDir, 'env-wrong');
writeFileSync(
  envWrongFile,
  `SHOPEE_APP_ID=${APP_ID}\nSHOPEE_SECRET=${WRONG_SECRET}\n`
);
const envMissingFile = path.join(tempDir, 'env-inexistente');

/** @type {Record<string, import('node:child_process').ChildProcess>} */
const procs = {};
const ports = {};

async function startInstance(name, { envFile, stripCreds = false }) {
  const port = await getFreePort();
  ports[name] = port;
  const env = {
    ...process.env,
    PORT: String(port),
    SHOPEE_API_URL: `http://127.0.0.1:${mockPort}/graphql`,
    SHOPEE_TIMEOUT_MS: '300',
    ENV_FILE: envFile,
    ...(stripCreds ? { SHOPEE_APP_ID: '', SHOPEE_SECRET: '' } : {}),
  };
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (d) => process.stderr.write(`[srv:${name}] ${d}`));
  procs[name] = child;

  // espera health ficar pronto
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return;
    } catch {
      /* ainda não subiu */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`instância ${name} não subiu`);
}

beforeAll(async () => {
  await startMockUpstream();
  await startInstance('ok', { envFile: envOkFile });
  await startInstance('wrong', { envFile: envWrongFile });
  await startInstance('missing', {
    envFile: envMissingFile,
    stripCreds: true,
  });
}, 20000);

afterAll(() => {
  for (const child of Object.values(procs)) child.kill();
  if (mockServer) mockServer.close();
});

const api = (name) => `http://127.0.0.1:${ports[name]}`;

// ---------------------------------------------------------------------------
// Unitários
// ---------------------------------------------------------------------------

describe('signature.mjs', () => {
  it('gera SHA256(AppId+Timestamp+Payload+Secret) hex lowercase (vetor fixo)', async () => {
    const { buildSignature } = await import(
      '../server/services/shopee/signature.mjs'
    );
    assert.equal(
      buildSignature({
        appId: '123',
        timestamp: '1704067200',
        payload: '{}',
        secret: 'abc',
      }),
      '61b4c0a9614742c1817a4a3fa8ed40279f732388b845e83b2d59a2a86fa1828a'
    );
  });

  it('monta header Authorization no formato oficial', async () => {
    const { buildAuthorizationHeader } = await import(
      '../server/services/shopee/signature.mjs'
    );
    const { header, timestamp } = buildAuthorizationHeader({
      appId: '123',
      secret: 'abc',
      payload: '{}',
      timestamp: 1704067200,
    });
    assert.equal(timestamp, 1704067200);
    assert.equal(
      header,
      'SHA256 Credential=123, Timestamp=1704067200, Signature=61b4c0a9614742c1817a4a3fa8ed40279f732388b845e83b2d59a2a86fa1828a'
    );
  });
});

describe('normalizer.mjs', () => {
  it('normaliza nó completo (comissão "0.38" -> 38%)', async () => {
    const { normalizeProductOffer } = await import(
      '../server/services/shopee/normalizer.mjs'
    );
    assert.deepStrictEqual(normalizeProductOffer(FIXTURE_FULL), {
      id: '23398164028',
      title: 'Fone De Ouvido Bluetooth TWS Pro 6',
      imageUrl: 'https://cf.shopee.com.br/file/br-111',
      currentPrice: 49.99,
      originalPrice: 79.35, // 49.99 / (1 - 0.37), fórmula documentada
      discountPercentage: 37,
      commissionRate: 38,
      commissionAmount: 18.99,
      productUrl: 'https://shopee.com.br/product/933390061/23398164028',
      affiliateUrl: 'https://s.shopee.com.br/2qRLhfwL03',
      rating: 5,
      soldCount: 272,
    });
  });

  it('NÃO inventa valores quando a API não traz campos (null)', async () => {
    const { normalizeProductOffer } = await import(
      '../server/services/shopee/normalizer.mjs'
    );
    const p = normalizeProductOffer(FIXTURE_PARTIAL);
    assert.equal(p.id, '111');
    assert.equal(p.title, 'Produto Sem Extras');
    for (const field of [
      'currentPrice',
      'originalPrice',
      'discountPercentage',
      'commissionRate',
      'commissionAmount',
      'productUrl',
      'affiliateUrl',
      'rating',
      'soldCount',
    ]) {
      assert.equal(p[field], null, `${field} deveria ser null`);
    }
  });
});

// ---------------------------------------------------------------------------
// Integração HTTP (backend real x mock upstream)
// ---------------------------------------------------------------------------

describe('GET /api/products (integração)', () => {
  it('retorna 503 MISSING_CREDENTIALS quando variáveis ausentes', async () => {
    const res = await fetch(`${api('missing')}/api/products`);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error.code, 'MISSING_CREDENTIALS');
    assert.match(body.error.message, /SHOPEE_APP_ID[\s\S]*SHOPEE_SECRET/);
  });

  it('retorna 401 SHOPEE_AUTH_ERROR com credencial inválida', async () => {
    const res = await fetch(`${api('wrong')}/api/products?keyword=fone`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'SHOPEE_AUTH_ERROR');
    assert.equal(body.error.providerCode, 10020);
  });

  it('autentica e retorna produtos válidos normalizados', async () => {
    const res = await fetch(`${api('ok')}/api/products?keyword=fone`);
    assert.equal(res.status, 200);
    const body = await res.json();

    // o mock só aceita assinatura correta => se chegou aqui, auth OK
    assert.ok(seenRequests.length > 0);

    assert.ok(Array.isArray(body.products));
    assert.equal(body.products.length, 2);

    assert.deepStrictEqual(body.products[0], {
      id: '23398164028',
      title: 'Fone De Ouvido Bluetooth TWS Pro 6',
      imageUrl: 'https://cf.shopee.com.br/file/br-111',
      currentPrice: 49.99,
      originalPrice: 79.35,
      discountPercentage: 37,
      commissionRate: 38,
      commissionAmount: 18.99,
      productUrl: 'https://shopee.com.br/product/933390061/23398164028',
      affiliateUrl: 'https://s.shopee.com.br/2qRLhfwL03',
      rating: 5,
      soldCount: 272,
    });

    assert.equal(body.meta.source, 'shopee-affiliate-api');
    assert.equal(body.meta.operation, 'productOfferV2');
    assert.equal(typeof body.meta.hasNextPage, 'boolean');

    // nenhum secret pode vazar na resposta
    const raw = JSON.stringify(body);
    assert.ok(!raw.includes(CORRECT_SECRET), 'vazou CORRECT_SECRET');
    assert.ok(!raw.includes(WRONG_SECRET), 'vazou WRONG_SECRET');
  });

  it('resposta sem produtos -> 200 com lista vazia', async () => {
    const res = await fetch(`${api('ok')}/api/products?keyword=__empty__`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.products, []);
    assert.equal(body.meta.hasNextPage, false);
  });

  it('timeout da Shopee -> 504 UPSTREAM_TIMEOUT', async () => {
    const res = await fetch(`${api('ok')}/api/products?keyword=__timeout__`);
    assert.equal(res.status, 504);
    const body = await res.json();
    assert.equal(body.error.code, 'UPSTREAM_TIMEOUT');
  });

  it('erro genérico da Shopee (10000) -> 502 SHOPEE_ERROR', async () => {
    const res = await fetch(`${api('ok')}/api/products?keyword=__shopee_error__`);
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error.code, 'SHOPEE_ERROR');
    assert.equal(body.error.providerCode, 10000);
  });

  it('rate limit da Shopee (10030) -> 429 SHOPEE_RATE_LIMIT', async () => {
    const res = await fetch(`${api('ok')}/api/products?keyword=__rate_limit__`);
    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.error.code, 'SHOPEE_RATE_LIMIT');
    assert.equal(body.error.providerCode, 10030);
  });

  it('/api/health informa credenciais configuradas', async () => {
    const okHealth = await (await fetch(`${api('ok')}/api/health`)).json();
    assert.deepEqual(okHealth, { status: 'ok', shopeeConfigured: true });

    const missingHealth = await (
      await fetch(`${api('missing')}/api/health`)
    ).json();
    assert.equal(missingHealth.shopeeConfigured, false);
  });
});
