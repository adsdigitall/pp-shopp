import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalAutomationCategoryId, normalizeAutomationSchedule, DEFAULT_AUTOMATION_SCHEDULE } from '../server/services/automation/config.mjs';
import { AUTOMATION_CATEGORY_PLAN } from '../server/services/automation/categories.mjs';

// Contrato: os ids de categoria da tela de Automação precisam ser slugs
// canônicos do backend. Três gerações de ids diferentes já fizeram a seleção
// "sumir" visualmente (o salvo nunca dava match exato) e se perder no save.
// Se este teste quebrar, alinhe com canonicalAutomationCategoryId antes.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogSource = readFileSync(join(root, 'src', 'services', 'automationCategories.ts'), 'utf-8');

function catalogIds() {
  const block = catalogSource.match(/AUTOMATION_CATEGORY_CATALOG[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, 'bloco AUTOMATION_CATEGORY_CATALOG não encontrado');
  return [...block[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((match) => match[1]);
}

function suggestedIds() {
  const block = catalogSource.match(/SUGGESTION_RULES[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, 'bloco SUGGESTION_RULES não encontrado');
  return [...block[1].matchAll(/categories:\s*\[([^\]]*)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]));
}

test('toda categoria da tela já é um slug canônico', () => {
  const ids = catalogIds();
  assert.ok(ids.length >= 10, `esperava ao menos 10 categorias, achou ${ids.length}`);
  for (const id of ids) {
    assert.equal(
      canonicalAutomationCategoryId(id),
      id,
      `id '${id}' não é canônico — a seleção dessa categoria vai "sumir" na tela`,
    );
  }
});

test('ids da tela não se repetem após canonicalização', () => {
  const canonical = catalogIds().map(canonicalAutomationCategoryId);
  assert.equal(new Set(canonical).size, canonical.length, 'ids duplicados após canonicalização');
});

test('toda categoria da tela existe no plano de descoberta do backend', () => {
  const planIds = new Set(AUTOMATION_CATEGORY_PLAN.map((item) => item.id));
  for (const id of catalogIds()) {
    assert.ok(planIds.has(id), `'${id}' não existe em AUTOMATION_CATEGORY_PLAN — buscaria como keyword solta`);
  }
});

test('toda categoria sugerida por horário está no catálogo da tela', () => {
  const ids = new Set(catalogIds());
  const sugeridas = suggestedIds();
  assert.ok(sugeridas.length >= 10, `esperava sugestões em todas as fatias do dia, achou ${sugeridas.length}`);
  for (const id of sugeridas) {
    assert.ok(ids.has(id), `sugestão '${id}' não está no catálogo — o chip apareceria sem rótulo`);
  }
});

test('categoria escolhida na faixa chega canônica ao backend', () => {
  const [slot] = normalizeAutomationSchedule([
    { id: 'slot-1', from: '23:00', until: '02:00', categories: ['Beleza', 'beleza-autocuidado', 'ofertas-fortes'] },
  ]);
  assert.deepEqual(slot.categories, ['beleza-autocuidado', 'ofertas-fortes'], 'rótulo antigo deveria virar slug, sem duplicar');
  assert.equal(slot.from, '23:00');
  assert.equal(slot.until, '02:00');
});

test('faixas padrão cobrem a madrugada e usam categorias do plano', () => {
  const planIds = new Set(AUTOMATION_CATEGORY_PLAN.map((item) => item.id));
  for (const slot of DEFAULT_AUTOMATION_SCHEDULE) {
    for (const id of slot.categories) {
      assert.ok(planIds.has(id), `faixa padrão ${slot.from}-${slot.until} usa '${id}', fora do plano`);
    }
  }
  const madrugada = DEFAULT_AUTOMATION_SCHEDULE.find((slot) => slot.from === '23:00');
  assert.ok(madrugada, 'faixa padrão da madrugada (23:00) não existe');
  assert.equal(madrugada.until, '02:00');
});

test('a faixa que vale às 00:40 (BRT) é a da madrugada, com as categorias dela', async () => {
  const { activeAutomationSchedule } = await import('../server/services/automation/config.mjs');
  const madrugada = activeAutomationSchedule({}, new Date('2026-09-17T03:40:00Z'));
  assert.ok(madrugada, 'sem faixa às 00:40 a descoberta cairia nas categorias gerais');
  assert.deepEqual(madrugada.categories, ['ofertas-fortes', 'compra-por-impulso']);

  const escolhaDoUsuario = { scheduleSlots: [{ id: 's1', from: '23:00', until: '02:00', categories: ['beleza-autocuidado'] }] };
  const aplicada = activeAutomationSchedule(escolhaDoUsuario, new Date('2026-09-17T03:40:00Z'));
  assert.deepEqual(aplicada?.categories, ['beleza-autocuidado'], 'a faixa escolhida na tela precisa valer no horário dela');
  assert.equal(activeAutomationSchedule(escolhaDoUsuario, new Date('2026-09-17T15:00:00Z')), null, 'fora da faixa não busca nada dessa faixa');
});
