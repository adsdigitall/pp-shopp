/**
 * Configuração do Mercado Livre (server-side only).
 * Credenciais do APP (client_id, client_secret) ficam apenas no backend.
 */

export class MercadoLivreConfigError extends Error {
  constructor(missing) {
    super(
      `Credenciais do Mercado Livre não configuradas no servidor: faltam ${missing.join(', ')}. ` +
      'Preencha o arquivo .env.local (veja .env.example).'
    );
    this.name = 'MercadoLivreConfigError';
    this.code = 'MISSING_CREDENTIALS';
    this.missing = missing;
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ clientId: string, clientSecret: string, redirectUri: string, siteId: string }}
 */
export function loadMercadoLivreConfig(env = process.env) {
  const clientId = (env.MERCADO_LIVRE_CLIENT_ID || '').trim();
  const clientSecret = (env.MERCADO_LIVRE_CLIENT_SECRET || '').trim();
  const redirectUri = (env.MERCADO_LIVRE_REDIRECT_URI || '').trim();
  const siteId = (env.MERCADO_LIVRE_SITE_ID || 'MLB').trim();

  const missing = [];
  if (!clientId) missing.push('MERCADO_LIVRE_CLIENT_ID');
  if (!clientSecret) missing.push('MERCADO_LIVRE_CLIENT_SECRET');
  if (!redirectUri) missing.push('MERCADO_LIVRE_REDIRECT_URI');
  if (missing.length > 0) throw new MercadoLivreConfigError(missing);

  return {
    clientId,
    clientSecret,
    redirectUri,
    siteId,
  };
}

/**
 * Gera URL de autorização OAuth do Mercado Livre
 * @param {{ clientId: string, redirectUri: string, state: string }} config
 * @returns {string}
 */
export function buildMercadoLivreAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    scope: 'read write offline_access',
  });

  return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
}