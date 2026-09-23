import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryFallbackChain, CATEGORIAS_DE_RESGATE, MAX_CATEGORIAS_POR_CICLO } from '../server/services/automation/fallback.mjs';
import { AUTOMATION_CATEGORY_PLAN } from '../server/services/automation/categories.mjs';

test('tenta primeiro a faixa, depois as gerais, por último as de resgate', () => {
  const cadeia = categoryFallbackChain({
    slotCategories: ['essenciais-dia-a-dia'],
    userCategories: ['casa-cozinha'],
    cursor: 0,
    max: 4,
  });
  assert.equal(cadeia[0], 'essenciais-dia-a-dia', 'a faixa do horário manda primeiro');
  assert.equal(cadeia[1], 'casa-cozinha');
  assert.equal(cadeia[2], CATEGORIAS_DE_RESGATE[0]);
});

test('sem faixa e sem categorias gerais, ainda sobra o resgate (grupo nunca fica mudo)', () => {
  const cadeia = categoryFallbackChain({});
  assert.ok(cadeia.length > 0);
  assert.deepEqual(cadeia.slice(0, CATEGORIAS_DE_RESGATE.length), CATEGORIAS_DE_RESGATE);
});

test('não repete categoria que já está na faixa', () => {
  const cadeia = categoryFallbackChain({
    slotCategories: ['ofertas-fortes'],
    userCategories: ['ofertas-fortes', 'beleza-autocuidado'],
    max: 6,
  });
  assert.equal(new Set(cadeia).size, cadeia.length, 'chamada repetida gastaria API à toa');
  assert.equal(cadeia[0], 'ofertas-fortes');
});

test('o cursor faz a faixa rodar entre os ciclos', () => {
  const entrada = { slotCategories: ['a', 'b', 'c'], max: 3 };
  assert.deepEqual(categoryFallbackChain({ ...entrada, cursor: 0 }).slice(0, 3), ['a', 'b', 'c']);
  assert.deepEqual(categoryFallbackChain({ ...entrada, cursor: 1 }).slice(0, 3), ['b', 'c', 'a']);
  assert.deepEqual(categoryFallbackChain({ ...entrada, cursor: 2 }).slice(0, 3), ['c', 'a', 'b']);
});

test('limite por ciclo é respeitado (cada categoria custa chamadas de API)', () => {
  const cadeia = categoryFallbackChain({
    slotCategories: ['a', 'b', 'c', 'd', 'e', 'f'],
    userCategories: ['g', 'h'],
  });
  assert.equal(cadeia.length, MAX_CATEGORIAS_POR_CICLO);
});

test('categorias de resgate existem no plano de busca do backend', () => {
  const doPlano = new Set(AUTOMATION_CATEGORY_PLAN.map((item) => item.id));
  for (const id of CATEGORIAS_DE_RESGATE) {
    assert.ok(doPlano.has(id), `'${id}' não existe no plano — viraria keyword solta`);
  }
});

// O ciclo precisa usar a cadeia de verdade, não só tê-la disponível.
test('o garimpo usa a cadeia de categorias e as regras da categoria da vez', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const fonte = readFileSync(join(root, 'server', 'index.mjs'), 'utf-8');
  const ciclo = fonte.slice(fonte.indexOf('async function runAutomaticOfferDiscovery'), fonte.indexOf('let dailyRhythmRunning'));
  assert.match(ciclo, /const cadeiaDeCategorias = categoryFallbackChain\(/);
  assert.match(ciclo, /for \(const categoriaDaVez of cadeiaDeCategorias\)/);
  assert.match(ciclo, /regrasDaCategoria\.requireTitleMatch/, 'o filtro de tema tem que seguir a categoria da vez');
  assert.match(ciclo, /\.\.\.regrasDaCategoria\.gate/, 'o gate tem que seguir a categoria da vez');
});
