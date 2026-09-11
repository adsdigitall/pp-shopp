/**
 * Credenciais Shopee EFETIVAS por usuário.
 *
 * Precedência:
 *   1. Credenciais salvas pela UI (CredentialsStore, marketplace 'shopee', ativas)
 *   2. Registro inativo na store = usuário desconectou pelo painel -> SEM fallback
 *   3. Variáveis de ambiente do servidor (SHOPEE_APP_ID/SHOPEE_SECRET)
 *
 * O Secret NUNCA sai daqui: status e respostas expõem só o App ID mascarado.
 */
import { loadShopeeConfig, ShopeeConfigError } from './config.mjs';
import { CredentialsStore, dataStore } from '../storage/DataStore.mjs';

export function maskAppId(appId) {
  const s = String(appId || '').trim();
  if (!s) return '';
  if (s.length <= 8) return `••••${s.slice(-2)}`;
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

function serverEnvConfig() {
  const timeoutRaw = Number.parseInt(process.env.SHOPEE_TIMEOUT_MS || '', 10);
  const env = loadShopeeConfig();
  return {
    ...env,
    timeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : env.timeoutMs,
    source: 'env',
  };
}

/**
 * @param {string} [userId]
 * @returns {Promise<{ appId: string, secret: string, apiUrl: string, timeoutMs: number, source: 'stored'|'env' }>}
 * @throws {ShopeeConfigError} quando desconectado ou sem credenciais
 */
export async function loadShopeeConfigForUser(userId = 'default_user') {
  let stored = null;
  try {
    stored = await CredentialsStore.getByUserAndMarketplace(userId, 'shopee');
  } catch {
    stored = null;
  }
  if (stored && String(stored.appId || '').trim() && String(stored.secret || '').trim()) {
    const env = serverEnvConfigSafe();
    return {
      appId: String(stored.appId).trim(),
      secret: String(stored.secret).trim(),
      apiUrl: env?.apiUrl,
      timeoutMs: env?.timeoutMs,
      source: 'stored',
    };
  }

  // Registro existe mas inativo = desconectado pela UI. Não usa o .env.
  let any = null;
  try {
    any = await dataStore.findOne('credentials', { userId, marketplace: 'shopee' });
  } catch {
    any = null;
  }
  if (any) {
    throw new ShopeeConfigError(['shopee (conta desconectada pelo painel)']);
  }

  return serverEnvConfig();
}

function serverEnvConfigSafe() {
  try {
    const timeoutRaw = Number.parseInt(process.env.SHOPEE_TIMEOUT_MS || '', 10);
    const env = loadShopeeConfig();
    return {
      apiUrl: env.apiUrl,
      timeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : env.timeoutMs,
    };
  } catch {
    return undefined;
  }
}

/**
 * Status público da integração (sem segredos).
 * @param {string} [userId]
 */
export async function getShopeeIntegrationStatus(userId = 'default_user') {
  try {
    const cfg = await loadShopeeConfigForUser(userId);
    let lastValidatedAt = null;
    try {
      const rec = await CredentialsStore.getByUserAndMarketplace(userId, 'shopee');
      lastValidatedAt = rec?.lastValidatedAt || null;
    } catch {
      lastValidatedAt = null;
    }
    return {
      connected: true,
      source: cfg.source,
      appIdMasked: maskAppId(cfg.appId),
      lastValidatedAt,
    };
  } catch {
    return { connected: false, source: 'none', appIdMasked: '', lastValidatedAt: null };
  }
}
