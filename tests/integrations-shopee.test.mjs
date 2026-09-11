import test from 'node:test';
import assert from 'node:assert/strict';
import { maskAppId } from '../server/services/shopee/effectiveConfig.mjs';

// O App ID mascarado é a única coisa que o frontend pode exibir.
// O Secret nunca sai do backend.
test('maskAppId mascara o meio e preserva pontas', () => {
  assert.equal(maskAppId('18349490069'), '1834••••0069');
});

test('maskAppId com vazio/curto não vaza nada útil', () => {
  assert.equal(maskAppId(''), '');
  assert.equal(maskAppId(undefined), '');
  assert.equal(maskAppId('123456'), '••••56');
});
