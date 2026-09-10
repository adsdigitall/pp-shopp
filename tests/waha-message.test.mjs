import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWhatsAppMessage, validateOfferMessage, sanitizeOfferCopy, ROTATING_CTAS } from '../server/services/waha/message.mjs';

const offer = { name: 'Produto', currentPrice: 29.9, originalPrice: 49.9, affiliateUrl: 'https://exemplo.test/oferta' };
test('rotates CTA deterministically for each dispatch position', () => {
  const first = renderWhatsAppMessage('{TITULO}\n{CTA}\n{LINK}', offer, { rotatingCTAs: true, rotationIndex: 0 });
  const second = renderWhatsAppMessage('{TITULO}\n{CTA}\n{LINK}', offer, { rotatingCTAs: true, rotationIndex: 1 });
  assert.match(first, new RegExp(ROTATING_CTAS[0]));
  assert.match(second, new RegExp(ROTATING_CTAS[1]));
  assert.notEqual(first, second);
});

test('renders benefits and optional catalog fields without leaking placeholders', () => {
  const product = {
    name: 'Kit de caixas organizadoras para cozinha',
    currentPrice: 61.99,
    originalPrice: 119.21,
    salesCount: 321,
    rating: 4.7,
    affiliateUrl: 'https://exemplo.test/caixas',
    category: 'Casa e cozinha',
  };
  const message = renderWhatsAppMessage(
    'OLHA ESSE ACHADINHO!\n\n{TITULO}\n{PRECO_ANTIGO}\nPor apenas {PRECO}\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Aproveite enquanto ainda está disponível.\n\nAPROVEITE A OFERTA:\n{LINK}',
    product,
    { rotationIndex: 0 },
  );
  assert.doesNotMatch(message, /\{(?:BENEFICIOS|VENDAS|AVALIACAO|TITULO|PRECO|LINK)\}/);
  assert.match(message, /organizado|dia a dia/i);
  assert.match(message, /321|4\.7|48% OFF/);
  assert.equal(validateOfferMessage(message, product).valid, true);
});

test('keeps an evaluation callout when the provider omits the numeric rating', () => {
  const message = renderWhatsAppMessage(
    'OLHA ESSE ACHADINHO!\n{TITULO}\nPor apenas {PRECO}\n{BENEFICIOS}\n{AVALIACAO}\n⚠️ Oferta por tempo limitado.\nAPROVEITE A OFERTA:\n{LINK}',
    { name: 'Organizador de armário', currentPrice: 19.9, affiliateUrl: 'https://exemplo.test/oferta' },
  );
  assert.doesNotMatch(message, /avalia|rating/i);
  assert.doesNotMatch(message, /\{AVALIACAO\}/);
});

test('formats orphan discounts and removes unresolved values', () => {
  const message = sanitizeOfferCopy('OLHA ESSE ACHADINHO!\nProduto\nR$ 62,90\n37\n{BENEFICIOS}\nundefined\nnull\nNaN\nAPROVEITE A OFERTA:\nhttps://exemplo.test', { currentPrice: 62.9, discountPercentage: 37 });
  assert.match(message, /37% OFF/);
  assert.doesNotMatch(message, /\{|undefined|null|NaN|^37$/m);
});

test('formats the anchored original price with WhatsApp strikethrough', () => {
  const message = renderWhatsAppMessage(
    'OLHA ESSE ACHADINHO!\n{TITULO}\nDe: {PRECO_ANTIGO}\nAgora por apenas {PRECO}\n{DESCONTO}\n⚠️ Oferta por tempo limitado.\nAPROVEITE A OFERTA:\n{LINK}',
    { name: 'Produto em oferta', currentPrice: 34.79, originalPrice: 59.98, affiliateUrl: 'https://exemplo.test/oferta' },
  );
  assert.match(message, /De:\s*~R\$ 59,98~/);
  assert.match(message, /R\$ 34,79/);
});

test('formats abbreviated sales counts instead of truncating them', () => {
  const message = renderWhatsAppMessage(
    '{TITULO}\n{PRECO}\n{VENDAS}\nAPROVEITE A OFERTA:\n{LINK}',
    { name: 'Produto popular', currentPrice: 19.9, salesCount: '2.7k', salesCountText: '2 vendidos', affiliateUrl: 'https://exemplo.test/oferta' },
  );
  assert.match(message, /2\.700 vendidos/);
  assert.doesNotMatch(message, /\+?2 vendidos/);
});

test('uses sold aliases when building the final copy', () => {
  const message = renderWhatsAppMessage(
    '{TITULO}\n{PRECO}\n{VENDAS}\nAPROVEITE A OFERTA:\n{LINK}',
    { name: 'Outro produto', currentPrice: 39.9, sold_quantity: 900, affiliateUrl: 'https://exemplo.test/oferta' },
  );
  assert.match(message, /900 vendidos/);
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
