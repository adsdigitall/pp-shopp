import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Layers3,
  Link2,
  Send,
  Settings,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Sparkline } from '@/components/charts';

// Fechamento funcional: sem deltas inventados.
// Não há endpoint de série histórica por card (ex.: disparos/dia, cliques/dia).
// Por isso o Sparkline com values={[0, value]} foi removido: ele desenhava
// alta artificial. Manter neutro até existir GET real de tendência.
// Contrato necessário (quando backend suportar):
//   GET /api/analytics/trend?metric=dispatch|clicks|groups|queue&days=7
//   -> { points: { date: string; value: number }[] }
const HAS_REAL_TREND = false;

interface VisaoGeralProps {
  onNavigateToGarimpar: () => void;
  onNavigateToDispatch: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToQueue?: () => void;
  onNavigateToWhatsApp?: () => void;
  queuedCount: number;
  dispatchCount: number;
  groupsCount: number;
  clicksCount: number;
  whatsappConnected: boolean;
  shopeeConfigured: boolean;
  latestDispatch?: { status?: string; createdAt?: string };
}

export const VisaoGeral: React.FC<VisaoGeralProps> = ({
  onNavigateToGarimpar,
  onNavigateToDispatch,
  onNavigateToGroups = () => undefined,
  onNavigateToQueue = () => undefined,
  onNavigateToWhatsApp = () => undefined,
  queuedCount,
  dispatchCount,
  groupsCount,
  clicksCount,
  whatsappConnected,
  shopeeConfigured,
  latestDispatch,
}) => {
  const dateRaw = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const dateLine = dateRaw.charAt(0).toUpperCase() + dateRaw.slice(1);

  const stats = [
    { label: 'Disparos hoje', value: dispatchCount, icon: Send, tint: 'bg-[rgba(255,94,20,.12)] text-[#ff8a3d]' },
    { label: 'Grupos ativos', value: groupsCount, icon: Users, tint: 'bg-[rgba(56,189,248,.12)] text-sky-400' },
    { label: 'Cliques no link', value: clicksCount, icon: Link2, tint: 'bg-[rgba(167,139,250,.12)] text-violet-400' },
    { label: 'Ofertas na fila', value: queuedCount, icon: Layers3, tint: 'bg-[rgba(251,191,36,.12)] text-amber-400' },
  ];

  const quickNav = [
    { label: 'Garimpar', desc: 'Encontre produtos', icon: Settings, action: onNavigateToGarimpar },
    { label: 'Grupos', desc: 'Gerencie grupos', icon: Users, action: onNavigateToGroups },
    { label: 'Fila', desc: 'Acompanhe disparos', icon: Layers3, action: onNavigateToQueue },
  ];

  const dispatchDone = latestDispatch?.status === 'completed';
  const dispatchTime = latestDispatch?.createdAt
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(latestDispatch.createdAt))
    : null;
  const dispatchDate = latestDispatch?.createdAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(latestDispatch.createdAt))
    : null;

  return (
    <section id="visao-geral" className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-4">
      {/* 1. Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-tight tracking-tight text-[var(--foreground)]">
            Olá! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Aqui está o resumo do seu Radar de Oferta. Bora vender mais hoje?
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs font-semibold text-[var(--foreground)]">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--primary)]" />
            {dateLine}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Que tal um bom dia de ofertas? 🚀</p>
        </div>
      </div>

      {/* 2. Hero + fila */}
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div
          className="overflow-hidden rounded-[1.125rem] border border-white/15"
          style={{ background: 'linear-gradient(120deg,#ff7a1a 0%,#f93a0b 55%,#c81e1e 100%)' }}
        >
          <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 max-w-md">
              <p className="text-[10px] font-extrabold tracking-[.18em] text-white/80">
                ENCONTRE E COMPARTILHE AS MELHORES OFERTAS
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-[28px]">
                Garimpe ofertas em segundos
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">
                Busque nas principais plataformas e encha sua fila com produtos lucrativos.
              </p>
              <button
                type="button"
                onClick={onNavigateToGarimpar}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#d93d1f] shadow-lg transition hover:brightness-95 active:scale-[.98]"
              >
                Garimpar agora
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-end">
              <div className="flex gap-2">
                {[
                  { emoji: '🛍️', label: 'Shopee' },
                  { emoji: '🤝', label: 'Mercado Livre' },
                  { emoji: '📦', label: 'Amazon' },
                  { emoji: '💜', label: 'Magalu' },
                ].map((m) => (
                  <span
                    key={m.label}
                    title={m.label}
                    className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-xl backdrop-blur-sm"
                  >
                    <span aria-hidden="true">{m.emoji}</span>
                  </span>
                ))}
              </div>
              <span className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white">
                Mais lucro para você!
              </span>
            </div>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-[var(--foreground)]">Sua fila de disparos</p>
            <button
              type="button"
              onClick={onNavigateToQueue}
              aria-label="Ir para fila"
              className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-5xl font-black leading-none text-[var(--primary)]">{queuedCount}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">ofertas prontas pra disparar</p>
          <button
            type="button"
            onClick={onNavigateToQueue}
            className="btn-amber-outline mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black"
          >
            Ir para fila
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <div className="my-3 h-px bg-[var(--border)]" />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { value: groupsCount, label: 'grupos ativos' },
              { value: clicksCount, label: 'cliques no link' },
              { value: queuedCount, label: 'ofertas na fila' },
            ].map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-lg font-black text-[var(--foreground)]">{s.value}</p>
                <p className="truncate text-[10px] leading-tight text-[var(--text-secondary)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Status strip + quick nav */}
      <div className="panel p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
            </span>
            <p className="text-sm font-black text-[var(--foreground)]">Status dos disparos</p>
          </div>
          <div className="hidden h-6 w-px shrink-0 bg-[var(--border)] sm:block" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  latestDispatch ? (dispatchDone ? 'bg-[var(--success)]' : 'bg-[var(--primary)]') : 'bg-[var(--text-secondary)]'
                }`}
              />
              {latestDispatch
                ? `Disparo ${dispatchDone ? 'concluído' : 'em processamento'}`
                : 'Nenhum disparo em andamento'}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
              {dispatchDate ?? 'Quando um disparo começar, o progresso aparecerá aqui em tempo real.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToDispatch}
            className="btn-brand inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
          >
            <Send className="h-4 w-4" />
            Disparar agora
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--border)] pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className={`h-1.5 w-1.5 rounded-full ${whatsappConnected ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
            <strong className="font-bold text-[var(--foreground)]">WhatsApp</strong>
            {whatsappConnected ? (
              <span className="font-semibold text-[var(--success)]">Conectado</span>
            ) : (
              <button
                type="button"
                onClick={onNavigateToWhatsApp}
                className="font-black text-[var(--primary)] hover:underline"
              >
                Conectar
              </button>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className={`h-1.5 w-1.5 rounded-full ${shopeeConfigured ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
            <strong className="font-bold text-[var(--foreground)]">Shopee</strong>
            <span className="font-semibold">{shopeeConfigured ? 'Ativa' : 'Pendente'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {quickNav.map(({ label, desc, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="panel flex min-h-[86px] items-center gap-2.5 p-3 text-left transition hover:border-[rgba(255,94,20,.35)]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgba(255,94,20,.12)] text-[#ff8a3d]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-black text-[var(--foreground)]">{label}</strong>
              <span className="mt-0.5 block truncate text-[11px] text-[var(--text-secondary)]">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      {/* 4. Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="panel flex items-center justify-between gap-2 p-4">
            <div className="min-w-0">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 truncate text-[11px] font-semibold text-[var(--text-secondary)]">{label}</p>
              <p className="text-2xl font-black leading-tight text-[var(--foreground)]">{value}</p>
            </div>
            <div className="hidden shrink-0 sm:block" aria-hidden="true">
              {HAS_REAL_TREND ? <Sparkline values={[0, value]} width={84} height={34} /> : null}
            </div>
          </div>
        ))}
      </div>

      {/* 5. Bottom grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-[var(--foreground)]">Atividade recente</h2>
            <button
              type="button"
              onClick={onNavigateToQueue}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
            >
              Ver histórico
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {latestDispatch ? (
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  dispatchDone
                    ? 'bg-[rgba(34,197,94,.12)] text-[var(--success)]'
                    : 'bg-[rgba(255,94,20,.12)] text-[var(--primary)]'
                }`}
              >
                <Send className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--foreground)]">
                  {`Disparo ${dispatchDone ? 'concluído' : 'em processamento'}`}
                </p>
                <p className="truncate text-[11px] text-[var(--text-secondary)]">
                  {dispatchDate ?? 'Registro sem data'}
                </p>
              </div>
              {dispatchTime && (
                <span className="shrink-0 text-xs font-semibold text-[var(--text-secondary)]">{dispatchTime}</span>
              )}
            </div>
          ) : (
            <div className="empty-state mt-3 flex flex-col items-center px-4 py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-[var(--text-secondary)]">
                <Clock3 className="h-5 w-5" />
              </span>
              <p className="mt-2.5 text-sm font-bold text-[var(--foreground)]">Nenhuma atividade ainda</p>
              <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">
                Assim que um disparo for criado, ele aparece aqui.
              </p>
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-[var(--foreground)]">Desempenho da semana</h2>
            <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
              Últimos 7 dias
            </span>
          </div>
          <div className="empty-state mt-3 flex flex-col items-center px-4 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-[var(--text-secondary)]">
              <TrendingUp className="h-5 w-5" />
            </span>
            <p className="mt-2.5 text-sm font-bold text-[var(--foreground)]">Sem dados de desempenho ainda</p>
            <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">
              Os números da semana aparecem aqui assim que houver disparos e cliques registrados.
            </p>
          </div>
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
            Marketplaces mais usados
          </h3>
          <div className="empty-state mt-2 flex items-center gap-3 px-4 py-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--text-secondary)]">
              <Store className="h-4 w-4" />
            </span>
            <p className="text-xs text-[var(--text-secondary)]">
              As contagens por marketplace aparecem aqui quando houver ofertas com dados reais.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisaoGeral;
