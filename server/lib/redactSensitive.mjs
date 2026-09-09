const SENSITIVE_KEYS = new Set([
  'secret',
  'shopeesecret',
  'clientsecret',
  'client_secret',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'apikey',
  'api_key',
  'bottoken',
  'bot_token',
  'privatekey',
  'private_key',
  'service_role',
  'service_role_key',
  'servicerolekey',
  'token',
]);

export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;

  const safe = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    safe[key] = redactSensitive(child);
  }
  return safe;
}
