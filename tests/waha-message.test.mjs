import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWhatsAppMessage, validateOfferMessage, ROTATING_CTAS } from '../server/services/waha/message.mjs';

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

test('fallback preserves available catalog fields and rejects missing required data', () => {
  const complete = { ...offer, salesCount: 1234, rating: 4.8, highlightPoints: ['Material resistente', 'Fácil de limpar'] };
  const message = renderWhatsAppMessage('{TITULO}\n{PRECO}\n{LINK}', complete, { rotationIndex: 0 });
  assert.match(message, /Produto/);
  assert.match(message, /40% OFF/);
  assert.match(message, /1234|1\.234/);
  assert.match(message, /4\.8/);
  assert.equal(validateOfferMessage(message, complete).valid, true);
  assert.equal(validateOfferMessage(message, { ...complete, affiliateUrl: '' }).valid, false);
});
