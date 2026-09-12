# Design System — Radar de Ofertas

Fonte da verdade visual do app. Vale para `main` (produção). Qualquer tela nova ou retrabalho (incluindo paralelos como o do Hermes) deve seguir este documento — divergência dele é tratada como bug.

## 1. Tokens (src/index.css)

### Cores de marca
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--primary` | `#ee4d2d` | `#ee4d2d` | CTA principal, identidade Shopee |
| `--primary-hover` | `#d93d1f` | `#b83019` | Hover do CTA |
| `--success` | `#16a34a` | `#22c55e` | Conectado, enviado, ok |
| `--error` | `#dc2626` | `#ef4444` | Desconectado, falha, destrutivo |
| `--warning` | `#d97706` | `#f59e0b` | Pendente, expirado, atenção |

### Superfícies (claro / escuro)
| Token | Claro | Escuro |
|---|---|---|
| `--background` | `#ffffff` | `#0a0a0a` |
| `--surface` | `#ffffff` | `#1a1a1a` |
| `--surface-elevated` | `#f7f7f7` | `#222222` |
| `--surface-hover` | `#f0f0f0` | `#2a2a2a` |
| `--border` | `#e5e5e5` | `#333333` |

Regra: texto principal em `var(--text-primary)`, secundário em `var(--text-secondary)`. **Nunca** hardcodar `slate-900`/`white` em componente novo (quebra o tema escuro).

### Raios, sombras, movimento, fontes
- Raios: `--radius-sm/md/lg/xl/2xl` (0.375–1.5rem). Cards: `rounded-xl`.
- Sombras: `--shadow-card`, `--shadow-modal`, `--shadow-floating`.
- Duração: `--duration-fast/normal/slow` (120/200/300ms); easing `--ease-spring`.
- Fontes: `--font-sans` (Inter), `--font-mono` (JetBrains Mono).

## 2. Componentes (src/components/ui/)

Avatar · Badge · Button · Card · Checkbox · Dialog · DropdownMenu · EmptyState ·
Input · Label · ScrollArea · Select · Separator · Skeleton · Switch · Tabs ·
Textarea · Tooltip (barril em `index.ts`).

Variantes de `Badge` (as únicas permitidas para status):
- `success` = verde → conectado, enviado, concluído
- `destructive` = vermelho → desconectado, falha
- `warning` = amarelo → pendente, expirado, atenção
- `secondary` = neutro → "verificando...", "em breve"
- `default`/`outline` = contadores e neutros informativos

## 3. Convenções de status (lei)

Toda integração (WhatsApp, Shopee, ML, automação, fila) usa o mesmo vocabulário visual:

| Estado real | Selo | Cor |
|---|---|---|
| Conectado / funcionando | `Conectado` | verde (`success`) |
| Desconectado / falhou | `Desconectado` | vermelho (`destructive`) |
| Aguardando config | `Pendente` | amarelo (`warning`) |
| Carregando | `Verificando...` | cinza (`secondary`) |

**Proibido:** selo fixo que não reflete estado (foi o bug do "Conectado" eterno do WhatsApp/Shopee). Todo selo deriva de `useState` alimentado pelo backend, com polling onde o estado muda sozinho (ex.: WhatsApp a cada 10s).

## 4. Padrões de tela

- **Cards de integração** (Configurações › Plataformas/Canais): título + selo dinâmico + campos + ações contextuais (`Salvar`/`Validar`/`Trocar conta`/`Desconectar`/`Remover`). Secret e API Key: só em estado local, nunca em settings/storage, nunca de volta na resposta.
- **Caixas de erro**: `border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]`, texto amigável do backend (`error.message`), nunca stack técnico.
- **Loading**: botão desabilitado + texto `...` (`Salvando...`, `Validando...`, `Gerando…`); polling com trava anti-sobreposição e intervalo ≥5s; payloads de poll sempre `?summary=1`.
- **Listas com contagem**: exibir `N grupo(s) carregado(s)` + botão recarregar (↻) — usuário precisa ver completude.
- **Confirmações destrutivas**: `window.confirm` (remover número/sessão) ou Dialog para cancelar disparo.

## 5. Tom de voz (mensagens do WhatsApp)

Automático usa tom humano feminino, sem nome e sem assinatura: aberturas variadas por produto (categoria/desconto/preço) + saudação pelo horário de Brasília. Validação de copy (`validateOfferMessage`) é inegociável — variação que quebrar validação cai para o texto original (fallback).

## 6. Processo (superpowers)

Mudança visual segue o fluxo do repo: branch própria → `tsc --noEmit` + `vite build` + `node --test tests/*.test.mjs` verdes → push `main` → conferir bundle e tela ao vivo. Sem build verde, sem deploy.
