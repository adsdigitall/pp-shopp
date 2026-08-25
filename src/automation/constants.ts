import type { RetryPolicy } from './types.ts';

/** Hard lock: etapa 1 must never send to WhatsApp, groups, webhooks or MCP. */
export const REAL_DISPATCH_ENABLED = false as const;

export const RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMsAfterAttempt: [1_000, 5_000],
};

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
  'appid',
  'app_id',
  'accesstoken',
  'refreshtoken',
  'token',
  'apikey',
  'partnerkey',
  'partner_key',
] as const;

export const COMMISSION_MESSAGE_PATTERNS = [
  /comiss[aã]o/i,
  /commission/i,
] as const;

export const FORBIDDEN_INPUT_KEYS = [
  'commissionRate',
  'commissionAmount',
  'privateCommission',
  'commission',
  'shopeeSecret',
  'secret',
  'appId',
  'app_id',
  'accessToken',
  'refreshToken',
  'token',
  'apiKey',
  'partnerKey',
] as const;
