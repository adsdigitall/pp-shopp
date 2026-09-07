import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWhatsAppMessage, ROTATING_CTAS } from '../server/services/waha/message.mjs';

const offer = { name: 'Produto', currentPrice: 29.9, originalPrice: 49.9, affiliateUrl: 'https://exemplo.test/oferta' };
test('rotates CTA deterministically for each dispatch position', () => {
  const first = renderWhatsAppMessage('{TITULO}\n{CTA}\n{LINK}', offer, { rotatingCTAs: true, rotationIndex: 0 });
  const second = renderWhatsAppMessage('{TITULO}\n{CTA}\n{LINK}', offer, { rotatingCTAs: true, rotationIndex: 1 });
  assert.match(first, new RegExp(ROTATING_CTAS[0]));
  assert.match(second, new RegExp(ROTATING_CTAS[1]));
  assert.notEqual(first, second);
});
test('keeps a useful CTA when rotation is disabled', () => {
  assert.match(renderWhatsAppMessage('{CTA}\n{LINK}', offer, { rotatingCTAs: false }), /Confira a oferta/);
});
