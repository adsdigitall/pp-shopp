import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authMode,
  isPublicApiRoute,
  createSessionToken,
  verifySessionToken,
  readCookie,
  sessionCookieHeader,
  verifyPasswordLogin,
} from '../server/lib/auth.mjs';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key' };
const user = { id: 'user-1', email: 'dono@example.com' };

test('sessão assinada volta o mesmo usuário e expira', () => {
  const now = Date.UTC(2026, 8, 13, 12);
  const token = createSessionToken(user, { env, now });
  assert.deepEqual(verifySessionToken(token, { env, now }), user);
  assert.equal(verifySessionToken(token, { env, now: now + 8 * 24 * 60 * 60 * 1000 }), null);
});

test('sessão adulterada ou assinada com outro segredo é rejeitada', () => {
  const token = createSessionToken(user, { env });
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'x', email: 'intruso@example.com', exp: 9999999999 })).toString('base64url');
  assert.equal(verifySessionToken(`${forged}.${signature}`, { env }), null);
  assert.equal(verifySessionToken(`${payload}.${signature}x`, { env }), null);
  assert.equal(verifySessionToken(token, { env: { ...env, SUPABASE_SERVICE_ROLE_KEY: 'outra-chave' } }), null);
  assert.equal(verifySessionToken('lixo', { env }), null);
  assert.equal(verifySessionToken(undefined, { env }), null);
});

test('API fica fechada em produção mesmo sem Supabase (fail closed)', () => {
  assert.deepEqual(authMode({ VERCEL: '1' }), { enforced: true, available: false });
  assert.deepEqual(authMode(env), { enforced: true, available: true });
  assert.deepEqual(authMode({}), { enforced: false, available: false });
  assert.deepEqual(authMode({ ...env, RADAR_AUTH_DISABLED: '1' }), { enforced: false, available: false });
});

test('rotas públicas: só webhooks, links rastreados, extensão, health e auth', () => {
  for (const [method, path] of [
    ['GET', '/api/health'],
    ['POST', '/api/auth/login'],
    ['GET', '/api/track/click/abc'],
    ['POST', '/api/webhooks/waha'],
    ['POST', '/api/extension/import'],
    ['GET', '/p/minha-vitrine'],
  ]) assert.equal(isPublicApiRoute(method, path), true, `${method} ${path}`);

  for (const [method, path] of [
    ['GET', '/api/queue'],
    ['POST', '/api/dispatch'],
    ['GET', '/api/settings'],
    ['GET', '/api/extension/token'],
    ['POST', '/api/whatsapp/connect'],
    ['GET', '/api/health/../settings'],
  ]) assert.equal(isPublicApiRoute(method, path), false, `${method} ${path}`);
});

test('cookie de sessão é HttpOnly, SameSite e Secure em produção', () => {
  const header = sessionCookieHeader({ headers: {} }, 'abc', { ...env, VERCEL: '1' });
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Secure/);
  assert.equal(readCookie({ headers: { cookie: 'a=1; radar_session=abc.def' } }, 'radar_session'), 'abc.def');
});

function fakeFetch(status, body) {
  return async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });
}

test('login exige radar_role admin e não revela se o e-mail existe', async () => {
  const admin = { user: { id: 'u1', email: 'dono@example.com', app_metadata: { radar_role: 'admin' } } };
  const commonUser = { user: { id: 'u2', email: 'outro@example.com', app_metadata: {} } };

  assert.deepEqual(await verifyPasswordLogin('dono@example.com', 'x', { env, fetchImpl: fakeFetch(200, admin) }), { user: { id: 'u1', email: 'dono@example.com' } });
  assert.deepEqual(await verifyPasswordLogin('outro@example.com', 'x', { env, fetchImpl: fakeFetch(200, commonUser) }), { error: 'INVALID_CREDENTIALS' });
  assert.deepEqual(await verifyPasswordLogin('dono@example.com', 'errada', { env, fetchImpl: fakeFetch(400, { error: 'invalid_grant' }) }), { error: 'INVALID_CREDENTIALS' });
  assert.deepEqual(await verifyPasswordLogin('dono@example.com', 'x', { env, fetchImpl: fakeFetch(500, {}) }), { error: 'AUTH_PROVIDER_UNAVAILABLE' });
  assert.deepEqual(await verifyPasswordLogin('dono@example.com', 'x', { env, fetchImpl: async () => { throw new Error('timeout'); } }), { error: 'AUTH_PROVIDER_UNAVAILABLE' });
  assert.deepEqual(await verifyPasswordLogin('dono@example.com', 'x', { env: {} }), { error: 'AUTH_NOT_CONFIGURED' });
});

test('servidor: sem sessão a API responde 401, com sessão passa e rotas públicas seguem abertas', async () => {
  const { createApp } = await import('../server/index.mjs');
  const server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    const blocked = await fetch(`${base}/api/settings`);
    assert.equal(blocked.status, 401);
    assert.equal((await blocked.json()).error.code, 'AUTH_REQUIRED');

    assert.equal((await fetch(`${base}/api/health`)).status, 200);

    const anonymous = await (await fetch(`${base}/api/auth/session`)).json();
    assert.deepEqual(anonymous, { authenticated: false, authRequired: true, user: null });

    const cookie = `radar_session=${createSessionToken(user, { env })}`;
    const session = await (await fetch(`${base}/api/auth/session`, { headers: { cookie } })).json();
    assert.deepEqual(session.user, user);
    assert.notEqual((await fetch(`${base}/api/settings`, { headers: { cookie } })).status, 401);

    const forged = await fetch(`${base}/api/settings`, { headers: { cookie: 'radar_session=abc.def' } });
    assert.equal(forged.status, 401);

    const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie } });
    assert.match(logout.headers.get('set-cookie') || '', /Max-Age=0/);
  } finally {
    for (const key of Object.keys(env)) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
    await new Promise((resolve) => server.close(resolve));
  }
});
