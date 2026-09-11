import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderWhatsAppMessage,
  validateOfferMessage,
  humanizeMessage,
  humanGreeting,
  HUMAN_INTERSTITIALS,
} from '../server/services/waha/message.mjs';
import { normalizeActiveDays } from '../server/services/automation/config.mjs';

const product = {
  name: 'Kit de caixas organizadoras para cozinha',
  currentPrice: 61.99,
  originalPrice: 119.21,
  salesCount: 321,
  rating: 4.7,
  affiliateUrl: 'https://exemplo.test/caixas',
};

const TEMPLATE =
  'OLHA ESSE ACHADINHO!\n\n{TITULO}\n{PRECO_ANTIGO}\nPor apenas {PRECO}\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\nAproveite enquanto ainda está disponível.\n\nAPROVEITE A OFERTA:\n{LINK}';

test('humanizeMessage varia a abertura e mantém a copy válida', () => {
  const generic = { ...product, name: 'Suporte multiuso ajustável', category: '' };
  const base = renderWhatsAppMessage(TEMPLATE, generic, { rotationIndex: 0 });
  assert.equal(validateOfferMessage(base, generic).valid, true);
  const openings = new Set();
  for (let i = 0; i < 10; i += 1) {
    const human = humanizeMessage(base, generic, { rotationIndex: i, hour: 9 });
    assert.equal(validateOfferMessage(human, generic).valid, true);
    assert.match(human, /meninas|gente|vocês|Amei|Apaixonada|maravilhosa|perfeita|ligadas|Bom dia|sua |cozinha|beleza|casa|tech|Mamães|Look|Derreteu|surreal|Precinho/);
    assert.doesNotMatch(human, /Carol/);
    openings.add(human.split('\n')[0]);
  }
  assert.ok(openings.size >= 5, `aberturas variadas, achadas: ${openings.size}`);
});

test('humanizeMessage respeita saudação do horário e nunca assina nome', () => {
  assert.equal(humanGreeting(8), 'Bom dia');
  assert.equal(humanGreeting(14), 'Boa tarde');
  assert.equal(humanGreeting(21), 'Boa noite');
  const night = humanizeMessage('OLHA!\nProduto X\nR$ 10,00\nhttps://exemplo.test/x', {}, { rotationIndex: 0, hour: 20 });
  assert.match(night, /Boa noite/);
  const morning = humanizeMessage('OLHA!\nProduto X\nR$ 10,00\nhttps://exemplo.test/x', {}, { rotationIndex: 0, hour: 9 });
  assert.match(morning, /Bom dia/);
  assert.doesNotMatch(night, /Carol/i);
  assert.ok(HUMAN_INTERSTITIALS.length >= 5);
  assert.ok(HUMAN_INTERSTITIALS.every((line) => !/Carol/i.test(line)));
});

test('normalizeActiveDays aceita só dias válidos e vazio cobre tudo', () => {
  assert.deepEqual(normalizeActiveDays(undefined), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(normalizeActiveDays([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  assert.deepEqual(normalizeActiveDays([9, -1, 'x', 0]), [0]);
  assert.deepEqual(normalizeActiveDays([]), [0, 1, 2, 3, 4, 5, 6]);
});

test('abertura combina com o produto (categoria, descontão, precinho)', () => {
  const mkBase = (p) => renderWhatsAppMessage(TEMPLATE, p, { rotationIndex: 0 });
  const kitchen = { ...product, name: 'Panela antiaderente para cozinha', category: 'casa e cozinha' };
  const kitchenMsg = humanizeMessage(mkBase(kitchen), kitchen, { rotationIndex: 0, hour: 10 });
  assert.match(kitchenMsg, /cozinha/i);
  assert.equal(validateOfferMessage(kitchenMsg, kitchen).valid, true);

  const beauty = { ...product, name: 'Base de maquiagem beleza', category: 'beleza' };
  const beautyMsg = humanizeMessage(mkBase(beauty), beauty, { rotationIndex: 1, hour: 10 });
  assert.match(beautyMsg, /linda|belez/i);
  assert.equal(validateOfferMessage(beautyMsg, beauty).valid, true);

  const halfOff = { ...product, name: 'Cesto multiuso empilhável', category: '', discountPercentage: 60 };
  const halfMsg = humanizeMessage(mkBase(halfOff), halfOff, { rotationIndex: 0, hour: 10 });
  assert.match(halfMsg, /surreal|Derreteu/i);
  assert.equal(validateOfferMessage(halfMsg, halfOff).valid, true);

  const cheap = { ...product, name: 'Pregador colorido multiuso', currentPrice: 9.9, originalPrice: 19.9 };
  const cheapMsg = humanizeMessage(mkBase(cheap), cheap, { rotationIndex: 0, hour: 10 });
  assert.match(cheapMsg, /Precinho|precinho|achadinho/i);
  assert.equal(validateOfferMessage(cheapMsg, cheap).valid, true);
});
