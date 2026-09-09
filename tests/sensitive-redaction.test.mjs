import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSensitive } from '../server/lib/redactSensitive.mjs';

test('redacts provider credentials from client-facing payloads', () => {
  const sanitized = redactSensitive({
    platforms: {
      shopee: { appId: 'public-id', secret: 'synthetic-secret' },
      mercadoLivre: { accessToken: 'synthetic-access', affiliateTag: 'public-tag' },
    },
    providerConfig: { apiKey: 'synthetic-key' },
  });

  assert.deepEqual(sanitized, {
    platforms: {
      shopee: { appId: 'public-id' },
      mercadoLivre: { affiliateTag: 'public-tag' },
    },
    providerConfig: {},
  });
});
