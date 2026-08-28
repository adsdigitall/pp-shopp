import { buildAuthorizationHeader } from './signature.mjs';

/**
 * Cliente HTTP isolado para a Shopee Affiliate Open API.
 * Única responsabilidade: enviar GraphQL assinado e traduzir erros.
 * O secret NUNCA aparece em mensagens de erro, logs ou respostas.
 */

/** @typedef {'AUTH'|'NO_ACCESS'|'RATE_LIMIT'|'PARAMS'|'TIMEOUT'|'NETWORK'|'UPSTREAM'} ShopeeErrorKind */

const KIND_BY_PROVIDER_CODE = {
  10020: 'AUTH',
  10031: 'AUTH',
  10032: 'AUTH',
  10033: 'AUTH',
  10034: 'AUTH',
  10035: 'NO_ACCESS',
  10030: 'RATE_LIMIT',
  11001: 'PARAMS',
};

export class ShopeeApiError extends Error {
  /**
   * @param {string} message mensagem SEGURA (sem secret/header)
   * @param {{ kind?: ShopeeErrorKind, providerCode?: number|null, httpStatus?: number|null }} [opts]
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = 'ShopeeApiError';
    this.kind = opts.kind || 'UPSTREAM';
    this.providerCode = opts.providerCode ?? null;
    this.httpStatus = opts.httpStatus ?? null;
  }
}

/** @param {any} err */
function isAbortLike(err) {
  return (
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    err?.code === 'ABORT_ERR'
  );
}

/**
 * Executa uma operação GraphQL na Shopee Affiliate API.
 *
 * @param {{
 *   query: string,
 *   variables?: Record<string, unknown>|null,
 *   config: { appId: string, secret: string, apiUrl: string, timeoutMs: number }
 * }} p
 * @returns {Promise<any>} campo `data` da resposta GraphQL
 */
export async function shopeeGraphqlRequest({ query, variables = null, config }) {
  // O payload precisa ser idêntico byte a byte entre assinatura e body.
  const payload = JSON.stringify(
    variables ? { query, variables } : { query }
  );

  const { header } = buildAuthorizationHeader({
    appId: config.appId,
    secret: config.secret,
    payload,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  /** @type {Response} */
  let response;
  try {
    response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: header,
      },
      body: payload,
      signal: controller.signal,
    });
  } catch (err) {
    if (isAbortLike(err)) {
      throw new ShopeeApiError(
        'Tempo limite excedido ao consultar a Shopee.',
        { kind: 'TIMEOUT' }
      );
    }
    const causeCode = /** @type {any} */ (err)?.cause?.code || err?.code;
    throw new ShopeeApiError(
      `Falha de rede ao contatar a Shopee${causeCode ? ` (${causeCode})` : ''}.`,
      { kind: 'NETWORK' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok && response.status === 401) {
    throw new ShopeeApiError('Shopee rejeitou as credenciais (HTTP 401).', {
      kind: 'AUTH',
      httpStatus: 401,
    });
  }
  if (!response.ok && response.status === 403) {
    throw new ShopeeApiError('Acesso negado pela Shopee (HTTP 403).', {
      kind: 'NO_ACCESS',
      httpStatus: 403,
    });
  }

  /** @type {any} */
  let json;
  try {
    json = await response.json();
  } catch {
    throw new ShopeeApiError('Resposta não-JSON da Shopee.', {
      kind: 'UPSTREAM',
      httpStatus: response.status,
    });
  }

  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    const first = json.errors[0];
    const providerCode = Number(first?.extensions?.code ?? NaN);
    const providerMessage = String(first?.message || 'Erro desconhecido da Shopee.');
    const kind =
      Number.isFinite(providerCode) && KIND_BY_PROVIDER_CODE[providerCode]
        ? KIND_BY_PROVIDER_CODE[providerCode]
        : 'UPSTREAM';
    throw new ShopeeApiError(`Erro da Shopee: ${providerMessage}`, {
      kind,
      providerCode: Number.isFinite(providerCode) ? providerCode : null,
      httpStatus: response.status,
    });
  }

  if (json?.data === undefined || json?.data === null) {
    throw new ShopeeApiError('Resposta da Shopee sem campo data.', {
      kind: 'UPSTREAM',
      httpStatus: response.status,
    });
  }

  return json.data;
}
