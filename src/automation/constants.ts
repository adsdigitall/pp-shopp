import type { RetryPolicy } from './types';

/**
 * Hard lock: etapa 1 must never send to WhatsApp, groups, stories,
 * webhooks or MCP. Only architecture + contracts.
 */
export const REAL_DISPATCH_ENABLED = false as const;

export const RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMsAfterAttempt: [1_000, 5_000],
};

/**
 * Substrings proibidas em QUALQUER chave de um payload público
 * (comparação case-insensitive, recursiva).
 */
export const SENSITIVE_PUBLIC_KEYS = [
  'commission',
  'commissionrate',
  'commissionamount',
  'privatecommission',
  'estimatedvalue',
  'comissao',
  'comissão',
  'secret',
  'shopeesecret',
  'shopee_secret',
  'openai',
  'openai_api_key',
  'apikey',
  'api_key',
  'appid',
  'app_id',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'token',
  'partnerkey',
  'partner_key',
  'credential',
  'password',
] as const;

/** Padrões proibidos no TEXTO da copy (não só nas chaves). */
export const COMMISSION_MESSAGE_PATTERNS = [
  /comiss[aã]o/i,
  /commission/i,
] as const;

/** Padrões de secret que nunca podem aparecer no texto público. */
export const SECRET_VALUE_PATTERNS = [
  /sk-[A-Za-z0-9]{16,}/,
  /SHOPEE_SECRET/i,
  /OPENAI_API_KEY/i,
  /Bearer\s+[A-Za-z0-9._-]{16,}/i,
] as const;

/** Chaves rejeitadas se enviadas no input de criação. */
export const FORBIDDEN_INPUT_KEYS = [
  'commissionRate',
  'commissionAmount',
  'privateCommission',
  'commission',
  'shopeeSecret',
  'SHOPEE_SECRET',
  'secret',
  'openaiApiKey',
  'OPENAI_API_KEY',
  'apiKey',
  'appId',
  'app_id',
  'accessToken',
  'refreshToken',
  'token',
  'partnerKey',
] as const;
