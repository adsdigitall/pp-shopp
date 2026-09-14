import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, DollarSign, RefreshCw, Send, ShoppingCart, Sun, Target, Users } from 'lucide-react';
import { KpiCard } from '@/components/visao-geral/KpiCard';
import { PerformanceChart } from '@/components/visao-geral/PerformanceChart';
import { QuickActions } from '@/components/visao-geral/QuickActions';
import { RecentActivity } from '@/components/visao-geral/RecentActivity';
import { TopProducts } from '@/components/visao-geral/TopProducts';
import { fetchDashboard, formatBRL, PERIOD_OPTIONS, type DashboardData, type DashboardPeriod } from '@/services/dashboard';

interface VisaoGeralProps {
  isActive: boolean;
  onNavigateToGarimpar: () => void;
  onNavigateToDispatch: () => void;
  onNavigateToGroups: () => void;
  onNavigateToQueue: () => void;
  onNavigateToMetrics: () => void;
  queuedCount: number;
  whatsappConnected: boolean;
  shopeeConfigured: boolean;
}

const REFRESH_MS = 60_000;

export function VisaoGeral({
  isActive,
  onNavigateToGarimpar,
  onNavigateToDispatch,
  onNavigateToGroups,
  onNavigateToQueue,
  onNavigateToMetrics,
  queuedCount,
  whatsappConnected,
  shopeeConfigured,
}: VisaoGeralProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async (target: DashboardPeriod) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    try {
      const next = await fetchDashboard(target, controller.signal);
      if (controller.signal.aborted) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a visão geral.');
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoading(false);
      }
    }
  }, []);

  // Só consulta enquanto a tela está visível (as seções ficam montadas escondidas).
  useEffect(() => {
    if (!isActive) return;
    void load(period);
    const id = window.setInterval(() => { void load(period); }, REFRESH_MS);
    return () => { window.clearInterval(id); inFlight.current?.abort(); };
  }, [isActive, period, load]);

  const periodOption = PERIOD_OPTIONS.find((option) => option.value === period)!;
  const dateLine = (() => {
    const raw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();
  const salesOff = data ? !data.salesAvailable : false;
  const showData = data && data.period === period;

  return (
    <section id="visao-geral" className="mx-auto w-full max-w-[1440px] space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
            <Sun className="h-4 w-4" /> {dateLine}
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-title)] sm:text-[34px]">Visão Geral</h1>
          <p className="mt-1 text-[15px] text-[var(--text-body)]">
            <strong className="font-bold text-[var(--text-title)]">Olá!</strong> Aqui está o resumo dos seus resultados.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1 text-[var(--text-secondary)]">
              <span className={`h-2 w-2 rounded-full ${whatsappConnected ? 'bg-[var(--green-500)]' : 'bg-[var(--red-500)]'}`} />
              WhatsApp {whatsappConnected ? 'conectado' : 'desconectado'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1 text-[var(--text-secondary)]">
              <span className={`h-2 w-2 rounded-full ${shopeeConfigured ? 'bg-[var(--green-500)]' : 'bg-[var(--amber-500)]'}`} />
              Shopee {shopeeConfigured ? 'ativa' : 'pendente'}
            </span>
            <button type="button" onClick={onNavigateToQueue} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-title)]">
              {queuedCount} {queuedCount === 1 ? 'oferta' : 'ofertas'} na fila
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateToMetrics}
          className="panel flex items-center gap-4 p-4 text-left transition-colors hover:border-[var(--border-brand)] lg:min-w-[330px]"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--surface-brand-soft)] text-[var(--brand-500)]">
            <Target className="h-7 w-7" />
          </span>
          <span className="flex-1 text-[15px] leading-snug text-[var(--text-title)]">Disciplina hoje,<br />resultados amanhã.</span>
          <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--red-400)]">
          <span>{error}</span>
          <button type="button" onClick={() => void load(period)} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
            <RefreshCw className="h-4 w-4" /> Tentar de novo
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showData ? (
          <>
            <KpiCard icon={DollarSign} label="Comissão" info="Comissão das vendas na Shopee no período (canceladas não contam)." display={formatBRL(data.kpis.commission.value)} {...data.kpis.commission} comparison={periodOption.comparison} unavailable={salesOff} footnote={salesOff ? 'Relatório da Shopee indisponível' : undefined} />
            <KpiCard icon={ShoppingCart} label="Vendas" info="Vendas registradas pela Shopee no período (canceladas não contam)." display={data.kpis.sales.value.toLocaleString('pt-BR')} {...data.kpis.sales} comparison={periodOption.comparison} unavailable={salesOff} footnote={salesOff ? 'Relatório da Shopee indisponível' : undefined} />
            <KpiCard icon={Send} label="Ofertas enviadas" info="Mensagens de oferta entregues aos grupos no período." display={data.kpis.sends.value.toLocaleString('pt-BR')} {...data.kpis.sends} comparison={periodOption.comparison} />
            <KpiCard icon={Users} label="Grupos ativos" info={data.kpis.activeGroups.names.length ? `Receberam ofertas: ${data.kpis.activeGroups.names.join(', ')}` : 'Grupos que receberam ao menos uma oferta no período.'} display={data.kpis.activeGroups.value.toLocaleString('pt-BR')} value={data.kpis.activeGroups.value} previous={data.kpis.activeGroups.previous} series={data.kpis.activeGroups.series} comparison={periodOption.comparison} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <div key={i} className="panel h-[118px] animate-pulse" aria-hidden="true" />)
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="panel p-4 sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-title)]">Desempenho</h2>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Acompanhe seus resultados ao longo do tempo.</p>
              </div>
              <div className="flex gap-2" role="tablist" aria-label="Período">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={period === option.value}
                    onClick={() => setPeriod(option.value)}
                    className={`h-9 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${period === option.value ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </header>
            <div className="mt-4">
              {showData ? (
                <PerformanceChart data={data.series} />
              ) : (
                <div className="h-[240px] animate-pulse rounded-xl bg-white/[.03]" aria-hidden="true" />
              )}
            </div>
            {showData && data.salesTruncated && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">A Shopee devolveu só as 50 vendas mais recentes do período; o gráfico pode estar incompleto.</p>
            )}
            {loading && showData && <p className="mt-2 text-right text-[11px] text-[var(--text-muted)]">Atualizando…</p>}
          </section>

          <QuickActions onGarimpar={onNavigateToGarimpar} onDisparar={onNavigateToDispatch} onGrupos={onNavigateToGroups} onMetricas={onNavigateToMetrics} />
        </div>

        <div className="min-w-0 space-y-4">
          {showData ? (
            <>
              <RecentActivity items={data.activity} onSeeAll={onNavigateToDispatch} />
              <TopProducts data={data.topProducts} periodLabel={periodOption.label} onSeeAll={onNavigateToMetrics} />
            </>
          ) : (
            <>
              <div className="panel h-[330px] animate-pulse" aria-hidden="true" />
              <div className="panel h-[260px] animate-pulse" aria-hidden="true" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
