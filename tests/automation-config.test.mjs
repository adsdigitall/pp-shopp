import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAutomationCategoryIds,
  normalizeAutomationGroupIds,
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
    normalizeAutomationCategoryIds(['casa e cozinha', 'beleza']),
    ['casa e cozinha', 'beleza'],
  );
});

test('category ids ignore non-array input and cap at 12', () => {
  assert.deepEqual(normalizeAutomationCategoryIds(undefined), []);
  const many = Array.from({ length: 20 }, (_, i) => `cat-${i}`);
  assert.equal(normalizeAutomationCategoryIds(many).length, 12);
});
