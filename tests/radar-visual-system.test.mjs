import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Radar visual system exposes the approved responsive theme tokens', async () => {
  const css = await read('src/index.css');
  const tokens = {
    '--surface-0': '#ffffff',
    '--surface-1': '#fafafa',
    '--border-default': '#d4d4d4',
    '--text-primary': '#171717',
    '--brand-primary': '#ee4d2d',
    '--brand-primary-hover': '#d93d1f',
    '--color-success-500': '#22c55e',
    '--color-danger-500': '#ef4444',
  };
  for (const [name, value] of Object.entries(tokens)) {
    assert.ok(css.includes(`${name}: ${value}`), `${name} should use ${value}`);
  }
  assert.match(css, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(css, /body\s*\{[\s\S]*?background-color:\s*var\(--surface-1\)/);
});

test('main dispatch flow is page-based instead of modal-based', async () => {
  const app = await read('src/App.tsx');
  const dispatchPage = await read('src/components/DispararPage.tsx');
  assert.match(app, /<DispararPage/);
  assert.match(app, /activeSection.*disparar|page.*disparar/i);
  assert.doesNotMatch(app, /<DispatchWizardModal/);
  assert.match(dispatchPage, /Oferta|Ofertas/);
  assert.match(dispatchPage, /Grupos/);
  assert.match(dispatchPage, /Intervalo|Ritmo/);
  assert.match(dispatchPage, /Revisar|Confirmar|Disparar/);
});

test('shared shell components use the premium visual language', async () => {
  const files = ['src/components/Header.tsx', 'src/components/DesktopSidebar.tsx', 'src/components/MobileBottomNav.tsx', 'src/components/ProductCard.tsx', 'src/components/FilterTabs.tsx'];
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /radar|surface|primary|#ff5a36|#111923/i, `${file} should use shared visual tokens`);
  }
});
