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
  const base = renderWhatsAppMessage(TEMPLATE, product, { rotationIndex: 0 });
  assert.equal(validateOfferMessage(base, product).valid, true);
  const openings = new Set();
  for (let i = 0; i < 10; i += 1) {
    const human = humanizeMessage(base, { rotationIndex: i, hour: 9 });
    assert.equal(validateOfferMessage(human, product).valid, true);
    assert.match(human, /meninas|gente|vocês|Amei|Apaixonada|maravilhosa|perfeita|ligadas|Bom dia/);
    assert.doesNotMatch(human, /Carol/);
    openings.add(human.split('\n')[0]);
  }
  assert.ok(openings.size >= 5, `aberturas variadas, achadas: ${openings.size}`);
});

test('humanizeMessage respeita saudação do horário e nunca assina nome', () => {
  assert.equal(humanGreeting(8), 'Bom dia');
  assert.equal(humanGreeting(14), 'Boa tarde');
  assert.equal(humanGreeting(21), 'Boa noite');
  const night = humanizeMessage('OLHA!\nProduto X\nR$ 10,00\nhttps://exemplo.test/x', { rotationIndex: 0, hour: 20 });
  assert.match(night, /Boa noite/);
  const morning = humanizeMessage('OLHA!\nProduto X\nR$ 10,00\nhttps://exemplo.test/x', { rotationIndex: 0, hour: 9 });
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
