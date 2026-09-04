import assert from 'node:assert/strict';
import test from 'node:test';

import { generateShareableOffer } from '../src/services/offerGenerator.ts';

const product = {
  id: '1',
  name: 'Vestido feminino longo elegante para festa com um nome propositalmente muito grande para WhatsApp',
  imageUrl: 'https://example.com/image.jpg',
  currentPrice: 79.9,
  originalPrice: 129.9,
  discountPercentage: 38,
  affiliateUrl: 'https://s.shopee.com.br/example',
  isFreeShipping: true,
};

test('shared copy is compact and contains only essential offer information', () => {
  const copy = generateShareableOffer(product, 'look').copyText;
  assert.ok(copy.split('\n').length <= 6);
  assert.match(copy, /OLHA ESSA/i);
  assert.match(copy, /R\$\s*79,90/);
  assert.match(copy, /https:\/\/s\.shopee\.com\.br\/example/);
  assert.doesNotMatch(copy, /Pode acabar|Oferta na Shopee|Frete Grátis disponível/i);
});

test('reaction changes the opening line of the shared copy', () => {
  const first = generateShareableOffer(product, 'look').copyText.split('\n')[0];
  const second = generateShareableOffer(product, 'found').copyText.split('\n')[0];
  assert.notEqual(first, second);
});
