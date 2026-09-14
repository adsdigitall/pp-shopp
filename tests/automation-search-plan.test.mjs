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

test('essenciais do dia a dia: buscas validadas, regras próprias e só produto com o nome buscado', async () => {
  const { automationCategoryRules, offerMatchesSearchTerm } = await import('../server/services/automation/categories.mjs');
  const plan = AUTOMATION_CATEGORY_PLAN.find(c => c.id === 'essenciais-dia-a-dia');
  assert.ok(plan, 'categoria essenciais-dia-a-dia existe');
  for (const term of ['café', 'amaciante', 'shampoo', 'papel higiênico']) assert.ok(plan.terms.includes(term), term);
  assert.ok(!plan.terms.includes('arroz') && !plan.terms.includes('óleo de soja'), 'mercearia não vende na Shopee');

  const rules = automationCategoryRules('essenciais-dia-a-dia');
  assert.deepEqual(rules.gate, { preferredMinPrice: 8, preferredMaxPrice: 120, minSales: 500 });
  assert.equal(rules.requireTitleMatch, true);
  assert.equal(rules.preferDiscount, true);
  assert.deepEqual(automationCategoryRules('moda-feminina'), { gate: {}, requireTitleMatch: false, preferDiscount: false });

  assert.equal(offerMatchesSearchTerm('Potes Herméticos Marmita de Vidro 640ml', 'pote hermético'), true);
  assert.equal(offerMatchesSearchTerm('Papel Higiênico Neve Folha Dupla 12 rolos', 'papel higiênico'), true);
  assert.equal(offerMatchesSearchTerm('Hidratante Creme Facial Pele de Porcelana', 'arroz'), false);
  assert.equal(offerMatchesSearchTerm('Kit 50 Formas Descartáveis para Air Fryer', 'ventilador'), false);
  assert.equal(offerMatchesSearchTerm('Sabão em Pó Omo Lavagem Perfeita 1,6kg', 'sabão em pó'), true);
  assert.equal(offerMatchesSearchTerm('', 'café'), false);
});

test('apelidos da tela viram o id da categoria de essenciais', async () => {
  const { canonicalAutomationCategoryId } = await import('../server/services/automation/config.mjs');
  assert.equal(canonicalAutomationCategoryId('Essenciais do dia a dia'), 'essenciais-dia-a-dia');
  assert.equal(canonicalAutomationCategoryId('essenciais'), 'essenciais-dia-a-dia');
});

test('filtro de tema: termo precisa estar no começo do nome (acessório que só cita o produto fica fora)', async () => {
  const { offerMatchesSearchTerm } = await import('../server/services/automation/categories.mjs');
  assert.equal(offerMatchesSearchTerm('Chaleira Elétrica Retrátil 600ml 110v Silenciosa Para Café', 'café'), false);
  assert.equal(offerMatchesSearchTerm('YESOP Kit Acessórios Banheiro 5 Peças Inox Suporte Papel Higiênico', 'papel higiênico'), false);
  assert.equal(offerMatchesSearchTerm('Kit Pia 3 Peças Organizador de Plástico Porta Esponja e Detergente', 'esponja'), false);
  assert.equal(offerMatchesSearchTerm('Body Splash Divine Agapis Beauty 200ml Fragrância Desodorante', 'desodorante'), false);
  assert.equal(offerMatchesSearchTerm('Garrafa Térmica 800ml/1000ml Inox Aço', 'garrafa térmica'), true);
  assert.equal(offerMatchesSearchTerm('OralGos Creme Dental 90g Limpeza', 'creme dental'), true);
  assert.equal(offerMatchesSearchTerm('Kit Jogo Pano De Prato Cozinha Copa', 'pano de prato'), true);
  assert.equal(offerMatchesSearchTerm('Café Melitta Tradicional 500g', 'café'), true);
});

test('filtro de tema: nome que começa como acessório (suporte, porta, dispenser...) fica fora', async () => {
  const { offerMatchesSearchTerm, AUTOMATION_CATEGORY_PLAN: plan } = await import('../server/services/automation/categories.mjs');
  assert.equal(offerMatchesSearchTerm('Suporte De Papel Higiênico Premium Para Banheiro', 'papel higiênico'), false);
  assert.equal(offerMatchesSearchTerm('Porta Sabonete Líquido Duplo com Suporte', 'sabonete'), false);
  assert.equal(offerMatchesSearchTerm('Dispenser Detergente Suporte Para Esponja', 'detergente'), false);
  assert.equal(offerMatchesSearchTerm('Copo Térmico de Cafe 450 ml Inox', 'café'), false);
  assert.equal(offerMatchesSearchTerm('Base Amaciante Concentrada 100ml faz 20 litros', 'amaciante'), true);
  const essenciais = plan.find((c) => c.id === 'essenciais-dia-a-dia').terms;
  assert.ok(!essenciais.includes('sabão em pó') && !essenciais.includes('absorvente'), 'buscas sem produto real saíram');
});

test('filtro de tema: acessório depois da marca também fica fora', async () => {
  const { offerMatchesSearchTerm } = await import('../server/services/automation/categories.mjs');
  assert.equal(offerMatchesSearchTerm('MEIDOO Suporte para papel higiênico sem furos', 'papel higiênico'), false);
  assert.equal(offerMatchesSearchTerm('Forma Silicone Sabonete Artesanal', 'sabonete'), false);
  assert.equal(offerMatchesSearchTerm('Neve Papel Higiênico Folha Dupla 12 rolos', 'papel higiênico'), true);
});
