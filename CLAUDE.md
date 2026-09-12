# CLAUDE.md — Radar de Ofertas (pp-shopp)

> Instrução direta do dono tem prioridade sobre tudo aqui. Skills de processo
> (superpowers) valem antes de codar; este arquivo vale como `CLAUDE.md` do projeto.

## O que é
PWA de afiliados (Shopee + Mercado Livre) com disparo em massa no WhatsApp via WAHA.
Frontend React 19 + Vite 6 + Tailwind v4 · Backend Node 22 (`server/index.mjs`) · Worker de fila (`server/worker.mjs`).

## Estrutura
- `src/components/*Page.tsx` — telas · `src/components/ui/` — primitivos · `src/index.css` — tokens
- `server/index.mjs` — API monolítica · `server/services/{shopee,waha,marketplace,automation,storage}` — domínios
- `server/worker.mjs` — loop externo (fila 15s) · `api/index.mjs` — serverless Vercel
- `supabase/migrations/` · `deploy/radar-worker/` · `extension/` · `tests/`
- Docs: `docs/design-system.md` (visual), `docs/superpowers/` (specs/planos)

## Comandos
| Ação | Comando |
|---|---|
| Dev front | `npm run dev` (5173, proxy /api → 8787) |
| Dev API | `npm run dev:api` (8787) |
| Worker local | `npm run worker` |
| **Gate completo** | `npm run verify` (= lint + typecheck + test:all + build) |
| Testes backend | `node --test tests/*.test.mjs` (suítes `.ts` do vitest estão quebradas no ambiente) |

## Branches e deploy (regra dura)
- Produção = **`main`** e nada mais. Vercel (front+API) e Easypanel (`radar`, `radar-worker`) buildam da `main`.
- `feature/backend/work` e cópias antigas NÃO entram na `main` (regressão comprovada).
- Commit na branch de trabalho → `git push origin <branch>:main` → conferir bundle e tela ao vivo.

## Leis do projeto (nunca violar)
1. **Horário comercial = America/Sao_Paulo** via `server/lib/timezone.mjs`. Nunca `getHours()` cru.
2. **Segredos só no servidor** (`redactSensitive` nas respostas). Secret/API Key nunca em settings, localStorage ou GET.
3. **Selos honestos**: todo badge deriva de estado real (docs/design-system.md §3). Badge fixo é bug.
4. **Nunca chamar API terceira do navegador**; validar credencial de verdade antes de salvar.
5. **Polls leves**: `?summary=1`, intervalo ≥5s, trava anti-sobreposição.
6. **Fila sequencial** pending→running→completed/failed; dedup WhatsApp mínimo 72h.
7. **Testemunho antes de afirmação**: `tsc`, testes, build e (se visual) screenshot desktop+mobile.

## Fluxo oficial de toda tarefa
Pedido → análise → plano → implementação → **teste no navegador** → revisão (agente `qa`) → lint/typecheck/build.
Compilou ≠ pronto. Mudança visual sem screenshot desktop + mobile 360px = reprovada.

## Subagentes (`.opencode/agents/`)
- `@frontend` — telas, componentes, responsivo
- `@backend` — API, fila, scheduler, DataStore
- `@integracoes` — Shopee, WAHA, ML, OpenAI, push
- `@qa` — gates, teste visual, revisão (não edita; veredito APROVADO/REPROVADO)
- Invocação: `@nome` no chat ou despacho automático pela descrição.

## Ferramentas
- **Superpowers**: skills de processo (`brainstorming`, `writing-plans`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`...) — processo antes de código.
- **Context7** (MCP, `opencode.json`): antes de implementar com lib/API cuja doc pode estar desatualizada — `use context7`.
- **Navegador visual**: skill `dev-browser` (scripts em `C:\Users\natan\AppData\Local\Temp\opencode\`, páginas nomeadas, screenshots). É o "Agent Browser" deste setup.
