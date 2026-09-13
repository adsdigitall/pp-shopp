/**
 * Login do painel (e-mail + senha) via Supabase Auth, com sessão em cookie
 * HttpOnly assinado por HMAC. Só roda no servidor.
 *
 * Acesso exige app_metadata.radar_role === 'admin' no usuário do Supabase:
 * app_metadata só é gravável com service role, então cadastro público no
 * projeto não dá acesso ao painel.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'radar_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SUPABASE_TIMEOUT_MS = 10_000;
const LOGIN_ATTEMPTS_PER_WINDOW = 8;
const LOGIN_WINDOW_MS = 10 * 60_000;

const loginBuckets = new Map();

function supabaseConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  return url && key ? { url, key } : null;
}

function sessionSecret(env = process.env) {
  const explicit = String(env.AUTH_SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  const supabase = supabaseConfig(env);
  // Derivado do service role: não circula e evita um secret novo por ambiente.
  return supabase ? createHmac('sha256', supabase.key).update('radar-session-v1').digest('hex') : '';
}

function isProductionRuntime(env = process.env) {
  return Boolean(env.VERCEL || env.NODE_ENV === 'production');
}

/**
 * enforced: API exige sessão. available: dá pra fazer login.
 * Produção sem Supabase fica fechada (fail closed); dev local sem Supabase fica aberto.
 */
export function authMode(env = process.env) {
  if (String(env.RADAR_AUTH_DISABLED || '') === '1') return { enforced: false, available: false };
  const available = Boolean(supabaseConfig(env) && sessionSecret(env));
  return { enforced: available || isProductionRuntime(env), available };
}

// Rotas chamadas sem sessão de usuário: webhooks, links rastreados, extensão (token próprio).
export function isPublicApiRoute(method, pathOnly) {
  if (!pathOnly.startsWith('/api/')) return true;
  if (pathOnly.startsWith('/api/auth/')) return true;
  if (method === 'GET' && pathOnly === '/api/health') return true;
  if (method === 'GET' && pathOnly === '/api/push/public-key') return true;
  if (method === 'GET' && pathOnly.startsWith('/api/track/click/')) return true;
  if (pathOnly === '/api/webhooks/waha' || pathOnly === '/api/webhooks/aha') return true;
  if (method === 'POST' && pathOnly === '/api/extension/import') return true;
  if (method === 'OPTIONS') return true;
  return false;
}

const b64url = (value) => Buffer.from(value).toString('base64url');

export function createSessionToken(user, { env = process.env, now = Date.now() } = {}) {
  const secret = sessionSecret(env);
  if (!secret) throw new Error('AUTH_NOT_CONFIGURED');
  const payload = b64url(JSON.stringify({
    sub: user.id,
    email: user.email,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  }));
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token, { env = process.env, now = Date.now() } = {}) {
  const secret = sessionSecret(env);
  if (!secret || typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let received;
  try { received = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.sub || !data?.email || typeof data.exp !== 'number') return null;
    if (data.exp * 1000 <= now) return null;
    return { id: String(data.sub), email: String(data.email) };
  } catch {
    return null;
  }
}

export function readCookie(req, name) {
  const header = String(req.headers.cookie || '');
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export function sessionFromRequest(req, env = process.env) {
  return verifySessionToken(readCookie(req, SESSION_COOKIE), { env });
}

function isSecureRequest(req, env) {
  return isProductionRuntime(env) || String(req.headers['x-forwarded-proto'] || '').includes('https');
}

export function sessionCookieHeader(req, token, env = process.env) {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_TTL_SECONDS}`];
  if (isSecureRequest(req, env)) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader(req, env = process.env) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureRequest(req, env)) parts.push('Secure');
  return parts.join('; ');
}

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

export function allowLoginAttempt(req, now = Date.now()) {
  const key = clientKey(req);
  const bucket = loginBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= LOGIN_WINDOW_MS) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  loginBuckets.set(key, bucket);
  return bucket.count <= LOGIN_ATTEMPTS_PER_WINDOW;
}

/**
 * Confere e-mail/senha no Supabase Auth. Retorna { id, email } ou um código de erro;
 * credencial errada e usuário sem permissão devolvem o mesmo código (sem enumeração).
 */
export async function verifyPasswordLogin(email, password, { env = process.env, fetchImpl = fetch } = {}) {
  const supabase = supabaseConfig(env);
  if (!supabase) return { error: 'AUTH_NOT_CONFIGURED' };
  let response;
  try {
    response = await fetchImpl(`${supabase.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: supabase.key },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    });
  } catch {
    return { error: 'AUTH_PROVIDER_UNAVAILABLE' };
  }
  if (response.status === 400 || response.status === 401 || response.status === 422) return { error: 'INVALID_CREDENTIALS' };
  if (response.status === 429) return { error: 'RATE_LIMITED' };
  if (!response.ok) return { error: 'AUTH_PROVIDER_UNAVAILABLE' };
  const body = await response.json().catch(() => null);
  const user = body?.user;
  if (!user?.id || !user?.email) return { error: 'AUTH_PROVIDER_UNAVAILABLE' };
  if (user.app_metadata?.radar_role !== 'admin') return { error: 'INVALID_CREDENTIALS' };
  return { user: { id: String(user.id), email: String(user.email) } };
}
