import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAutomationCategoryIds,
  normalizeAutomationGroupIds,
  canonicalAutomationCategoryId,
  mergeGroupLists,
  resolveDispatchIntervals,
  normalizeAutomationSchedule,
  automationSlotAt,
  activeAutomationSchedule,
} from '../server/services/automation/config.mjs';

// Regressão: o save da automação descartava groupIds (groups: [] fixo),
// então a seleção de grupos "sumia" ao voltar para a tela. A normalização
// abaixo é usada pelo handler PUT /api/dispatch/automation e precisa
// preservar exatamente o que o usuário selecionou.
test('preserves selected group ids as objects', () => {
  assert.deepEqual(
    normalizeAutomationGroupIds(['g1@g.us', 'g2@g.us']),
    [{ id: 'g1@g.us' }, { id: 'g2@g.us' }],
  );
});

test('group ids ignore non-array input but never crash', () => {
  assert.deepEqual(normalizeAutomationGroupIds(undefined), []);
  assert.deepEqual(normalizeAutomationGroupIds(null), []);
  assert.deepEqual(normalizeAutomationGroupIds('g1@g.us'), []);
});

test('group ids are trimmed, deduped and capped', () => {
  const many = Array.from({ length: 60 }, (_, i) => `  g${i}@g.us  `);
  const result = normalizeAutomationGroupIds(['g1@g.us', 'g1@g.us', '', ...many]);
  assert.equal(result.length, 50);
  assert.equal(result[0].id, 'g1@g.us');
  assert.ok(result.every((group) => typeof group.id === 'string' && group.id.length > 0));
});

test('category ids are preserved for discovery', () => {
  assert.deepEqual(
    normalizeAutomationCategoryIds(['banheiro', '  ']),
    ['banheiro'],
  );
});

test('category ids unify UI labels and legacy variants into plan slugs', () => {
  assert.deepEqual(
    normalizeAutomationCategoryIds(['casa e cozinha', 'beleza', 'casa-cozinha', 'beleza']),
    ['casa-cozinha', 'beleza-autocuidado'],
  );
  assert.equal(canonicalAutomationCategoryId('organizadores'), 'organizacao');
  assert.equal(canonicalAutomationCategoryId('moda feminina barata'), 'moda-feminina');
  assert.equal(canonicalAutomationCategoryId('moda feminina'), 'moda-feminina');
  assert.equal(canonicalAutomationCategoryId('utilidades domésticas'), 'utilidades');
  assert.equal(canonicalAutomationCategoryId('maternidade e infantil'), 'maternidade-infantil');
  assert.equal(canonicalAutomationCategoryId('cama mesa e banho'), 'cama-mesa-banho');
  assert.equal(canonicalAutomationCategoryId('casa e banho'), 'cama-mesa-banho');
  assert.equal(canonicalAutomationCategoryId('acessórios'), 'acessorios-femininos');
  assert.equal(canonicalAutomationCategoryId('eletrônicos'), 'eletronicos-baratos');
  assert.equal(canonicalAutomationCategoryId('celular'), 'eletronicos-baratos');
  // Desconhecidos passam como estão (viram keyword na descoberta).
  assert.equal(canonicalAutomationCategoryId('melhores-ofertas'), 'melhores-ofertas');
});

test('category ids ignore non-array input and cap at 12', () => {
  assert.deepEqual(normalizeAutomationCategoryIds(undefined), []);
  const many = Array.from({ length: 20 }, (_, i) => `cat-${i}`);
  assert.equal(normalizeAutomationCategoryIds(many).length, 12);
});

// Regressão: o sync ao vivo já voltou parcial e o save zerava a lista,
// então a tela mostrava só 4 grupos. A união salvos+ao vivo garante todos.
test('merge keeps every known group with live winning conflicts', () => {
  const saved = [{ id: 'a@g.us', name: 'A salvo' }, { id: 'b@g.us', name: 'B salvo' }];
  const live = [{ id: 'b@g.us', name: 'B ao vivo' }, { id: 'c@g.us', name: 'C ao vivo' }];
  assert.deepEqual(mergeGroupLists(saved, live), [
    { id: 'a@g.us', name: 'A salvo' },
    { id: 'b@g.us', name: 'B ao vivo' },
    { id: 'c@g.us', name: 'C ao vivo' },
  ]);
});

test('merge tolerates empty or invalid inputs without shrinking', () => {
  const saved = [{ id: 'a@g.us' }];
  assert.deepEqual(mergeGroupLists(saved, []), saved);
  assert.deepEqual(mergeGroupLists(saved, null), saved);
  assert.deepEqual(mergeGroupLists(null, []), []);
});

// Regressão: `?.` sobre variável não declarada no handler derrubava o
// POST /api/dispatch com 500. O cálculo agora é puro e total (sem throw).
test('dispatch intervals fall back to safe defaults with no input', () => {
  assert.deepEqual(resolveDispatchIntervals(), {
    humanMessageInterval: { minOffers: 8, maxOffers: 12 },
    repeatCooldownHours: 4,
  });
  assert.deepEqual(resolveDispatchIntervals(undefined, undefined, null), {
    humanMessageInterval: { minOffers: 8, maxOffers: 12 },
    repeatCooldownHours: 4,
  });
});

test('dispatch intervals prefer wizard, then body, then automation config', () => {
  const auto = { humanMessageInterval: { minOffers: 3, maxOffers: 9 }, repeatCooldownHours: 6 };
  assert.deepEqual(
    resolveDispatchIntervals({ humanMessageInterval: { minOffers: 5, maxOffers: 15 } }, {}, auto).humanMessageInterval,
    { minOffers: 5, maxOffers: 15 },
  );
  assert.deepEqual(
    resolveDispatchIntervals({}, { repeatCooldownHours: 10 }, auto).repeatCooldownHours,
    10,
  );
  assert.deepEqual(resolveDispatchIntervals({}, {}, auto), {
    humanMessageInterval: { minOffers: 3, maxOffers: 9 },
    repeatCooldownHours: 6,
  });
});

// Prova que a lógica das faixas funciona: datas locais fixas, sem depender de TZ.
const at = (h, m = 0) => new Date(2026, 8, 10, h, m, 0);

test('faixa cobre o instante e default vale sem config', () => {
  const slot = automationSlotAt(null, at(13));
  assert.equal(slot.from, '12:00');
  assert.deepEqual(activeAutomationSchedule(null, at(13))?.categories, slot.categories);
  assert.equal(automationSlotAt(null, at(3)), null);
});

test('faixa desligada aparece no relógio mas não ativa (pausa)', () => {
  const config = { scheduleSlots: [{ id: 's', enabled: false, from: '12:00', until: '14:00', categories: ['x'] }] };
  const timed = automationSlotAt(config, at(13));
  assert.equal(timed.enabled, false);
  assert.equal(activeAutomationSchedule(config, at(13)), null);
});

test('faixa ligada ativa normalmente e janela overnight funciona', () => {
  const config = { scheduleSlots: [{ id: 's', enabled: true, from: '22:00', until: '02:00', categories: ['y'] }] };
  assert.equal(activeAutomationSchedule(config, at(23, 30))?.id, 's');
  assert.equal(activeAutomationSchedule(config, at(1))?.id, 's');
  assert.equal(activeAutomationSchedule(config, at(3)), null);
  // Fora da faixa, outra faixa não "vaza" para dentro.
  assert.equal(activeAutomationSchedule(config, at(21, 59)), null);
});

test('normalize preserva on/off e completa faixas inválidas', () => {
  const [slot] = normalizeAutomationSchedule([{ from: 'xx', until: 'yy' }]);
  assert.equal(slot.enabled, true);
  assert.equal(slot.from, '08:00');
  assert.equal(slot.until, '23:00');
  const [off] = normalizeAutomationSchedule([{ enabled: false, from: '12:00', until: '13:00' }]);
  assert.equal(off.enabled, false);
});
