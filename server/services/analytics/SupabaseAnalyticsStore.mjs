/**
 * Persistência server-side dos eventos de analytics.
 * Usa a REST API do Supabase para não expor a service_role no frontend.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function configFromEnv(env = process.env) {
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const userId = String(env.SUPABASE_DEFAULT_USER_ID || '').trim();
  return { url, key, userId, enabled: Boolean(url && key && UUID_RE.test(userId)) };
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

export class SupabaseAnalyticsStore {
  constructor({ env = process.env, fetchImpl = fetch } = {}) {
    this.config = configFromEnv(env);
    this.fetch = fetchImpl;
  }

  get enabled() {
    return this.config.enabled;
  }

  async list({ marketplace = 'all', since, userId = this.config.userId } = {}) {
    if (!this.enabled || !UUID_RE.test(String(userId))) return null;
    const params = new URLSearchParams({
      select: '*',
      user_id: `eq.${userId}`,
      occurred_at: `gte.${new Date(since || Date.now() - 7 * 86_400_000).toISOString()}`,
      order: 'occurred_at.desc',
      limit: '1000',
    });
    if (marketplace && marketplace !== 'all') params.set('marketplace', `eq.${marketplace}`);
    const response = await this.fetch(`${this.config.url}/rest/v1/analytics_events?${params}`, {
      headers: headers(this.config.key),
    });
    if (!response.ok) throw new Error(`Supabase analytics HTTP ${response.status}`);
    return response.json();
  }

  async insert(event, { userId = this.config.userId } = {}) {
    if (!this.enabled || !UUID_RE.test(String(userId))) return false;
    const response = await this.fetch(`${this.config.url}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: { ...headers(this.config.key), Prefer: 'return=minimal,resolution=merge-duplicates' },
      body: JSON.stringify({ ...event, user_id: userId }),
    });
    if (!response.ok) throw new Error(`Supabase analytics HTTP ${response.status}`);
    return true;
  }
}

export function createSupabaseAnalyticsStore(options) {
  return new SupabaseAnalyticsStore(options);
}
