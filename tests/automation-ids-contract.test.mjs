import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalAutomationCategoryId } from '../server/services/automation/config.mjs';

// Contrato: os ids de categoria da tela de Automação precisam ser slugs
// canônicos do backend. Três gerações de ids diferentes já fizeram a seleção
// "sumir" visualmente (o salvo nunca dava match exato) e se perder no save.
// Se este teste quebrar, alinhe com canonicalAutomationCategoryId antes.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const filaSource = readFileSync(join(root, 'src', 'components', 'FilaPage.tsx'), 'utf-8');

function prioritizedIds() {
  const block = filaSource.match(/PRIORITIZED_AUTOMATION_CATEGORIES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, 'bloco PRIORITIZED_AUTOMATION_CATEGORIES não encontrado');
  return [...block[1].matchAll(/\{\s*id:\s*'([^']+)'/g)].map((match) => match[1]);
}

test('toda categoria da tela já é um slug canônico', () => {
  const ids = prioritizedIds();
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
  const canonical = prioritizedIds().map(canonicalAutomationCategoryId);
  assert.equal(new Set(canonical).size, canonical.length, 'ids duplicados após canonicalização');
});
