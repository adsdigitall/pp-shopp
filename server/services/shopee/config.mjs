/**
 * Configuração do cliente Shopee Affiliate.
 * As credenciais vivem SOMENTE aqui (server-side). Nunca são serializadas
 * para respostas HTTP ou logs — apenas usadas para assinar requisições.
 */

/** Endpoint oficial da Shopee Affiliate Open API (Brasil, GraphQL). */
export const SHOPEE_GRAPHQL_ENDPOINT =
  'https://open-api.affiliate.shopee.com.br/graphql';

export class ShopeeConfigError extends Error {
  /**
   * @param {string[]} missing variáveis ausentes/vazias
   */
  constructor(missing) {
    super(
      `Credenciais da Shopee não configuradas no servidor: faltam ${missing.join(', ')}. ` +
        'Preencha o arquivo .env.local (veja .env.example).'
    );
    this.name = 'ShopeeConfigError';
    this.code = 'MISSING_CREDENTIALS';
    this.missing = missing;
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ appId: string, secret: string, apiUrl: string, timeoutMs: number }}
 */
export function loadShopeeConfig(env = process.env) {
  const appId = (env.SHOPEE_APP_ID || '').trim();
  const secret = (env.SHOPEE_SECRET || '').trim();

  /** @type {string[]} */
  const missing = [];
  if (!appId) missing.push('SHOPEE_APP_ID');
  if (!secret) missing.push('SHOPEE_SECRET');
  if (missing.length > 0) throw new ShopeeConfigError(missing);

  const timeoutRaw = Number.parseInt(env.SHOPEE_TIMEOUT_MS || '', 10);
  return {
    appId,
    secret,
    apiUrl: (env.SHOPEE_API_URL || '').trim() || SHOPEE_GRAPHQL_ENDPOINT,
    timeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 10000,
  };
}
