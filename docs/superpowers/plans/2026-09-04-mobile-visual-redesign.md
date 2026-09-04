# PP Shopp Mobile Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o PP Shopp em uma experiência mobile clara, quente, compacta e tátil sem alterar seus fluxos funcionais.

**Architecture:** Centralizar tokens e comportamentos interativos em `src/index.css`, aplicar classes semânticas aos principais componentes e reduzir a densidade dos cartões de produto. Preservar estado, handlers, APIs e modais existentes; o redesign muda somente apresentação, hierarquia responsiva e feedback de interação.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS 4, Vite 6, CSS nativo.

**Spec:** `docs/superpowers/specs/2026-09-04-mobile-visual-redesign-design.md`

## Global Constraints

- Usar fundo creme suave, superfícies branco-quente, coral nas ações, azul-marinho no texto e verde apenas em preço, comissão e sucesso.
- Manter React, TypeScript e Tailwind CSS v4; não adicionar bibliotecas.
- Preservar busca, filtros, fila, marketplaces, modais e integrações.
- Garantir áreas de toque de pelo menos 44 px e respeitar `prefers-reduced-motion`.
- Validar em larguras de 360, 390 e 430 px e em desktop.

---

### Task 1: Sistema visual global e testes estáticos

**Files:**
- Create: `tests/visual-system.test.mjs`
- Modify: `src/index.css`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: classes Tailwind existentes no JSX.
- Produces: tokens CSS `--radar-*` e classes `.app-shell`, `.surface-card`, `.pressable`, `.focusable`.

- [ ] **Step 1: Escrever o teste estático inicialmente falho**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('global visual system exposes light palette and tactile controls', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  for (const token of ['--radar-canvas', '--radar-surface', '--radar-ink', '--radar-coral']) assert.match(css, new RegExp(token));
  assert.match(css, /\.pressable:active/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /background:\s*#2a2b30\s*!important/);
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run: `node --test tests/visual-system.test.mjs`
Expected: FAIL porque os tokens e as classes ainda não existem.

- [ ] **Step 3: Implementar os tokens e utilitários mínimos**

Adicionar a `src/index.css`:

```css
:root {
  --radar-canvas: #fff7ed;
  --radar-surface: #fffdf9;
  --radar-surface-soft: #ffeddc;
  --radar-ink: #172033;
  --radar-muted: #687086;
  --radar-coral: #ef5b3f;
  --radar-coral-strong: #d94328;
  --radar-success: #16865b;
  --radar-shadow: 0 12px 32px rgba(116, 66, 38, .12);
}
.app-shell { background: radial-gradient(circle at 90% 0%, #ffd8bf 0, transparent 28rem), var(--radar-canvas); color: var(--radar-ink); }
.surface-card { background: color-mix(in srgb, var(--radar-surface) 94%, transparent); border: 1px solid rgba(239, 91, 63, .12); box-shadow: var(--radar-shadow); }
.pressable { transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease; touch-action: manipulation; }
.pressable:active { transform: translateY(2px) scale(.98); box-shadow: none; }
.focusable:focus-visible { outline: 3px solid rgba(239, 91, 63, .38); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
```

Remover os overrides grafite globais e o CSS de template Vite não utilizado em `src/App.css`.

- [ ] **Step 4: Executar o teste e o build**

Run: `node --test tests/visual-system.test.mjs && npm run build`
Expected: PASS e build Vite concluído.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.css tests/visual-system.test.mjs
git commit -m "feat: add warm mobile visual system"
```

### Task 2: Estrutura principal e Garimpar ofertas

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/visual-system.test.mjs`

**Interfaces:**
- Consumes: `.app-shell`, `.surface-card`, `.pressable`, `.focusable` da Task 1.
- Produces: seção `#produtos` clara, seletores roláveis e grade responsiva compacta.

- [ ] **Step 1: Ampliar o teste com contratos da tela**

```js
test('garimpar uses semantic visual classes and a compact product grid', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /app-shell/);
  assert.match(app, /surface-card/);
  assert.match(app, /pressable/);
  assert.match(app, /grid-cols-2/);
  assert.match(app, /overflow-x-auto/);
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `node --test tests/visual-system.test.mjs`
Expected: FAIL pela ausência das classes semânticas em `App.tsx`.

- [ ] **Step 3: Aplicar a nova hierarquia**

Trocar o invólucro raiz por `app-shell min-h-[100dvh]`. Aplicar `surface-card` às seções visíveis, `pressable focusable` aos botões e organizar marketplaces como faixa horizontal `flex flex-nowrap overflow-x-auto no-scrollbar`. Usar botões de 44 px, estado coral ativo e estado pêssego claro inativo. Manter todos os `onClick` atuais.

Na grade de produtos, usar:

```tsx
<div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
```

Em larguras extremamente estreitas, permitir uma coluna com `@media (max-width: 340px)` no CSS.

- [ ] **Step 4: Testar**

Run: `node --test tests/visual-system.test.mjs && npm run build`
Expected: PASS sem erros TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx tests/visual-system.test.mjs
git commit -m "feat: redesign garimpar for mobile"
```

### Task 3: Cartões de produto compactos

**Files:**
- Modify: `src/components/ProductCard.tsx`
- Modify: `tests/visual-system.test.mjs`

**Interfaces:**
- Consumes: `Product`, `onGenerateOffer`, `onAddToQueue` e classes visuais globais.
- Produces: cartão de produto compacto com as mesmas ações e dados.

- [ ] **Step 1: Adicionar o contrato do cartão ao teste**

```js
test('product cards preserve actions and use compact tactile presentation', async () => {
  const card = await readFile(new URL('../src/components/ProductCard.tsx', import.meta.url), 'utf8');
  assert.match(card, /surface-card/);
  assert.match(card, /pressable/);
  assert.match(card, /line-clamp-2/);
  assert.match(card, /onGenerateOffer\(product\)/);
  assert.match(card, /onAddToQueue\(product\)/);
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `node --test tests/visual-system.test.mjs`
Expected: FAIL porque o cartão ainda não usa `surface-card`.

- [ ] **Step 3: Compactar sem remover funções**

Reduzir padding e espaços verticais no mobile, usar raio menor na imagem, manter título em duas linhas, agrupar vendedor e reputação, diminuir badges e fixar as ações no rodapé com `mt-auto`. Aplicar `pressable focusable` aos dois botões e ao link externo. Manter preço, desconto, comissão, frete, score e marketplace disponíveis, ocultando apenas detalhes secundários quando o espaço for insuficiente.

- [ ] **Step 4: Testar**

Run: `node --test tests/visual-system.test.mjs && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductCard.tsx tests/visual-system.test.mjs
git commit -m "feat: compact product cards on mobile"
```

### Task 4: Cabeçalho, navegação e controles compartilhados

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/MobileBottomNav.tsx`
- Modify: `src/components/FilterTabs.tsx`
- Modify: `src/components/HowItWorks.tsx`
- Modify: `tests/visual-system.test.mjs`

**Interfaces:**
- Consumes: props e callbacks atuais de cada componente.
- Produces: navegação clara, estado ativo evidente e feedback tátil consistente.

- [ ] **Step 1: Testar estados interativos essenciais**

```js
test('primary navigation components expose tactile controls', async () => {
  for (const path of ['Header.tsx', 'MobileBottomNav.tsx', 'FilterTabs.tsx', 'HowItWorks.tsx']) {
    const source = await readFile(new URL(`../src/components/${path}`, import.meta.url), 'utf8');
    assert.match(source, /pressable/);
  }
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `node --test tests/visual-system.test.mjs`
Expected: FAIL listando componentes ainda sem `pressable`.

- [ ] **Step 3: Aplicar paleta, áreas de toque e foco**

Usar branco quente e coral no cabeçalho; transformar o item ativo da navegação inferior em bloco pêssego com ícone coral e leve elevação; aplicar altura mínima de 44 px, `pressable focusable` e `aria-current="page"` ao item ativo. Atualizar filtros e passos para a mesma linguagem visual sem mudar seus callbacks.

- [ ] **Step 4: Testar**

Run: `node --test tests/visual-system.test.mjs && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/MobileBottomNav.tsx src/components/FilterTabs.tsx src/components/HowItWorks.tsx tests/visual-system.test.mjs
git commit -m "feat: polish mobile navigation interactions"
```

### Task 5: Verificação visual, regressão e deploy

**Files:**
- Modify only if verification reveals a scoped visual defect.

**Interfaces:**
- Consumes: aplicação construída nas Tasks 1–4.
- Produces: versão validada e URL de produção.

- [ ] **Step 1: Executar toda a verificação automatizada disponível**

Run: `node --test tests/visual-system.test.mjs tests/product-refresh.test.mjs && npm run build && npm audit --audit-level=high`
Expected: todos os testes passam, build conclui e não há vulnerabilidade alta.

- [ ] **Step 2: Iniciar a aplicação para inspeção responsiva**

Run: `npm run dev -- --host 127.0.0.1`
Expected: Vite informa uma URL local acessível.

- [ ] **Step 3: Verificar 360, 390, 430 e desktop**

Confirmar em cada largura: ausência de rolagem horizontal acidental; Garimpar legível; dois produtos por linha quando couberem; botões com reação ao toque; navegação sem cobrir conteúdo; busca, categorias, plataformas, fila e modais funcionando.

- [ ] **Step 4: Conferir o escopo do deploy**

Run: `git status --short && git log --oneline -8`
Expected: commits do redesign presentes; alterações locais anteriores em `server/services/shopee/products.mjs` e `.github/workflows/deploy-vercel.yml` continuam identificáveis e não foram incluídas por acidente.

- [ ] **Step 5: Publicar na Vercel e validar a URL**

Run: `npx vercel --prod`
Expected: deploy concluído com uma URL de produção; abrir a URL e repetir o smoke test da tela Garimpar.

- [ ] **Step 6: Registrar o resultado**

Registrar no Segundo Cérebro os commits, testes, URL de produção, decisões visuais e qualquer erro corrigido durante a publicação.
