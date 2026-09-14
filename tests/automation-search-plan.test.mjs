import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOMATION_CATEGORY_PLAN,
  AUTOMATION_DISCOVERY_FILTER,
  automationSearchTerms,
} from '../server/services/automation/categories.mjs';

test('toda categoria tem buscas curtas (buscas longas voltam 0 produtos na Shopee)', () => {
  for (const category of AUTOMATION_CATEGORY_PLAN) {
    assert.ok(category.terms.length >= 3, `${category.id} precisa de ao menos 3 buscas para rotacionar`);
    for (const term of category.terms) {
      assert.ok(term.trim().split(/\s+/).length <= 3, `${category.id}: "${term}" é longa demais`);
    }
  }
});

test('faixas que ficavam mudas usam buscas que retornam produtos', () => {
  const byId = Object.fromEntries(AUTOMATION_CATEGORY_PLAN.map(c => [c.id, c.terms]));
  assert.ok(!byId['melhores-ofertas'].some(t => t.includes('cupom mais vendidos')));
  assert.ok(!byId['moda-feminina'].includes('moda feminina barata'));
  assert.ok(byId['compra-por-impulso'].length >= 3);
});

test('slug da categoria rotaciona as buscas começando pelo cursor', () => {
  const terms = AUTOMATION_CATEGORY_PLAN.find(c => c.id === 'moda-feminina').terms;
  assert.deepEqual(automationSearchTerms('moda-feminina', 0), terms);
  assert.equal(automationSearchTerms('moda-feminina', 1)[0], terms[1]);
  assert.equal(automationSearchTerms('moda-feminina', terms.length)[0], terms[0]);
  assert.equal(automationSearchTerms('MODA-FEMININA', 2)[0], terms[2]);
});

test('palavra-chave livre continua sendo buscada como veio', () => {
  assert.deepEqual(automationSearchTerms('fone bluetooth', 5), ['fone bluetooth']);
});

test('sem categoria cai no plano geral, rotacionando por categoria', () => {
  const first = automationSearchTerms('', 0);
  const second = automationSearchTerms('', 1);
  assert.ok(first.length >= 3);
  assert.notDeepEqual(first, second);
});

test('descoberta ordena por mais vendidos (trending traz produtos com 0 vendas)', () => {
  assert.equal(AUTOMATION_DISCOVERY_FILTER, 'top_sales');
});
