import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAutomationCategoryIds,
  normalizeAutomationGroupIds,
  canonicalAutomationCategoryId,
  mergeGroupLists,
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
