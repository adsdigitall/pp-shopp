import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Send, TriangleAlert } from 'lucide-react';

interface DispatchJobSummary { id: string; status: string; sent: number; failed: number; createdAt?: string; }
interface DispatchAnalytics { totalJobs: number; completedJobs: number; runningJobs: number; totalSent: number; totalFailed: number; successRate: number; jobs: DispatchJobSummary[]; }
const EMPTY: DispatchAnalytics = { totalJobs: 0, completedJobs: 0, runningJobs: 0, totalSent: 0, totalFailed: 0, successRate: 0, jobs: [] };

export const MetricasPage: React.FC<{ activeMarketplace: string }> = () => {
  const [data, setData] = useState<DispatchAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/analytics/dispatch');
        if (!response.ok) throw new Error('Não foi possível carregar as métricas.');
        const body = await response.json();
        if (active) { setData({ ...EMPTY, ...body, jobs: Array.isArray(body.jobs) ? body.jobs : [] }); setError(''); }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar as métricas.'); }
      finally { if (active) setLoading(false); }
    };
    load(); const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const metrics = [
    { label: 'Envios concluídos', value: data.totalSent, icon: Send, tone: 'text-[var(--primary)]' },
    { label: 'Disparos em andamento', value: data.runningJobs, icon: Activity, tone: 'text-[var(--warning)]' },
    { label: 'Falhas registradas', value: data.totalFailed, icon: TriangleAlert, tone: 'text-[var(--error)]' },
    { label: 'Taxa de conclusão', value: `${data.successRate.toFixed(0)}%`, icon: CheckCircle2, tone: 'text-[var(--success)]' },
  ];
  return <section id="metricas" className="space-y-4">
    <header><h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Métricas</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Dados reais dos disparos registrados no Radar.</p></header>
    {error && <div role="alert" className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2 text-sm text-[var(--error)]">{error}</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><Icon className={`h-5 w-5 ${tone}`} /><strong className="mt-3 block text-2xl font-black text-[var(--text-primary)]">{loading ? '—' : value}</strong><span className="mt-1 block text-xs text-[var(--text-secondary)]">{label}</span></div>)}</div>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2 border-b border-[var(--border)] pb-3"><Clock3 className="h-5 w-5 text-[var(--primary)]" /><h2 className="font-black text-[var(--text-primary)]">Histórico recente de disparos</h2></div>
      {loading ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Carregando dados reais…</p> : data.jobs.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Ainda não há disparos registrados.</p> : <div className="divide-y divide-[var(--border)]">{data.jobs.map((job) => <div key={job.id} className="flex items-center gap-3 py-3"><span className={`h-2.5 w-2.5 rounded-full ${job.status === 'completed' ? 'bg-[var(--success)]' : job.status === 'failed' ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[var(--text-primary)]">Disparo {job.id.slice(-8)}</p><p className="text-xs text-[var(--text-secondary)]">{job.createdAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(job.createdAt)) : 'Data indisponível'}</p></div><div className="text-right text-xs"><p className="font-bold text-[var(--success)]">{job.sent} enviados</p>{job.failed > 0 && <p className="mt-0.5 text-[var(--error)]">{job.failed} falhas</p>}</div></div>)}</div>}
    </section><p className="text-center text-xs text-[var(--text-secondary)]">Cliques e conversões aparecerão aqui quando o rastreamento de links estiver conectado.</p>
  </section>;
};
export default MetricasPage;
