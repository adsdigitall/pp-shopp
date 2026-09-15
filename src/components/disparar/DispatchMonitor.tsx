import { Fragment, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, Link2, Package, Send, SkipForward, Square, Tag, XCircle } from 'lucide-react';
import { inferMarketplace, marketplaceInfo } from '@/services/queueOverview';

export interface DispatchSummary {
  id: string;
  status: string;
  source?: string;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  offersCount?: number;
  stats?: { sent?: number; failed?: number; deduplicated?: number; pending?: number; cancelled?: number };
  destinations?: { groups?: { id: string; name?: string }[]; interval?: { value: number; unit: string }; scheduledAt?: string };
  firstOffer?: { name: string; image: string | null; price: number | null; marketplace: string | null; category: string | null; affiliateUrl: string | null } | null;
  lastError?: string | null;
}

export const ACTIVE_DISPATCH_STATUSES = ['pending', 'running', 'waiting_connection', 'paused'];

const tz = 'America/Sao_Paulo';
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hhmm = (iso?: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—');
const fullDate = (iso?: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—');

function intervalMs(interval?: { value: number; unit: string }) {
  const value = Number(interval?.value) || 0;
  return interval?.unit === 'hours' ? value * 3_600_000 : interval?.unit === 'minutes' ? value * 60_000 : value * 1000;
}

function durationLabel(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours} h ${minutes} min`;
  if (minutes) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

function progressOf(job: DispatchSummary) {
  const groups = job.destinations?.groups?.length || 0;
  const total = Math.max(1, (job.offersCount || 0) * Math.max(1, groups));
  const sent = job.stats?.sent || 0;
  const failed = job.stats?.failed || 0;
  const skipped = job.stats?.deduplicated || 0;
  const done = Math.min(total, sent + failed + skipped);
  return { groups, total, sent, failed, skipped, done, percent: Math.round((done / total) * 100) };
}

function shortLink(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
  }
}

const ACTIVE_LABEL: Record<string, string> = { running: 'Em andamento', pending: 'Na fila', waiting_connection: 'Aguardando WhatsApp', paused: 'Pausado' };

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
    completed: { label: 'Concluído', icon: CheckCircle2, tone: 'border-[rgba(34,197,94,.3)] bg-[var(--surface-green-soft)] text-[var(--green-400)]' },
    cancelled: { label: 'Cancelado', icon: XCircle, tone: 'border-[rgba(239,68,68,.3)] bg-[var(--surface-red-soft)] text-[var(--red-400)]' },
    failed: { label: 'Falhou', icon: AlertTriangle, tone: 'border-[rgba(239,68,68,.3)] bg-[var(--surface-red-soft)] text-[var(--red-400)]' },
  };
  const item = map[status] || { label: ACTIVE_LABEL[status] || status, icon: Clock, tone: 'border-[var(--border-brand)] bg-[var(--surface-brand-soft)] text-[var(--brand-400)]' };
  const Icon = item.icon;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${item.tone}`}><Icon className="h-3.5 w-3.5" />{item.label}</span>;
}

function Thumb({ src, size = 'h-11 w-11' }: { src?: string | null; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl bg-white`}>
      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-[var(--ink-500)]" />}
    </span>
  );
}

interface DispatchMonitorProps {
  history: DispatchSummary[];
  mode: 'ongoing' | 'history';
  cancellingId: string | null;
  onCancel: (ids: string | string[]) => void;
  onNewDispatch: () => void;
  onCopy: (text: string) => void;
}

export function DispatchMonitor({ history, mode, cancellingId, onCancel, onNewDispatch, onCopy }: DispatchMonitorProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const active = history.filter((job) => ACTIVE_DISPATCH_STATUSES.includes(job.status));
  const hero = active.find((job) => job.status === 'running') || active.find((job) => job.source !== 'queue_automation') || active[0];
  const others = active.filter((job) => job !== hero);
  const automaticWaiting = others.filter((job) => job.source === 'queue_automation');
  const manualWaiting = others.filter((job) => job.source !== 'queue_automation');
  const finished = history.filter((job) => !ACTIVE_DISPATCH_STATUSES.includes(job.status));
  const rows = mode === 'ongoing' ? finished.slice(0, 6) : finished;

  const heroCard = hero ? (() => {
    const p = progressOf(hero);
    const mp = marketplaceInfo(inferMarketplace(hero.firstOffer?.marketplace, hero.firstOffer?.affiliateUrl));
    const link = shortLink(hero.firstOffer?.affiliateUrl);
    const remainingOffers = Math.ceil((p.total - p.done) / Math.max(1, p.groups));
    const eta = durationLabel(Math.max(0, remainingOffers - 1) * intervalMs(hero.destinations?.interval));
    const statusText = hero.status === 'running' ? 'Enviando agora…' : hero.status === 'waiting_connection' ? 'Aguardando o WhatsApp conectar' : hero.status === 'paused' ? 'Pausado (automação desligada)' : 'Aguardando a vez na fila';
    return (
      <section className="rounded-2xl border border-[var(--border-brand)] bg-[image:var(--glow-brand)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-brand)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            <Thumb src={hero.firstOffer?.image} size="h-24 w-24" />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-brand)] bg-[var(--surface-brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-400)]">
                <span className={`h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] ${hero.status === 'running' ? 'animate-pulse' : ''}`} />{ACTIVE_LABEL[hero.status] || 'Em andamento'}
              </span>
              <h2 className="mt-2 line-clamp-2 text-xl font-bold text-[var(--text-title)]">{hero.firstOffer?.name || `${hero.offersCount || 0} oferta(s)`}</h2>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                {hero.source === 'queue_automation' ? 'Oferta da automação' : 'Disparo manual'}
                {(hero.offersCount || 0) > 1 ? ` · ${hero.offersCount} ofertas` : ''}
                {hero.firstOffer?.price != null ? ` · ${brl(hero.firstOffer.price)}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-body)]">
                  {mp.logo && <img src={mp.logo} alt="" className="h-4 w-4 rounded object-contain" />}{mp.label}
                </span>
                {hero.firstOffer?.category && <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-body)]"><Tag className="h-3.5 w-3.5" />{hero.firstOffer.category}</span>}
                {link && (
                  <button type="button" onClick={() => onCopy(hero.firstOffer!.affiliateUrl!)} title="Copiar link" className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-body)] hover:border-[var(--border-brand)]">
                    <Link2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{link}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 lg:w-[360px] lg:flex-row lg:items-start lg:justify-between lg:border-l lg:border-[var(--border-subtle)] lg:pl-5">
            <div className="text-sm text-[var(--text-body)]">
              <p>{hero.startedAt ? `Iniciado às ${hhmm(hero.startedAt)}` : `Criado às ${hhmm(hero.createdAt)}`}</p>
              <p className="mt-1 text-[var(--text-secondary)]">Enviando para {p.groups} {p.groups === 1 ? 'grupo' : 'grupos'}</p>
            </div>
            <button type="button" onClick={() => onCancel(hero.id)} disabled={cancellingId === hero.id} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(239,68,68,.5)] px-4 text-sm font-semibold text-[var(--red-400)] hover:bg-[var(--surface-red-soft)] disabled:opacity-60">
              <Square className="h-4 w-4" /> {cancellingId === hero.id ? 'Cancelando…' : 'Cancelar disparo'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
            <div className="flex items-center justify-between text-sm"><span className="font-medium text-[var(--text-title)]">Progresso geral</span><span className="rdo-num text-[var(--text-title)]">{p.percent}%</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-[image:var(--gradient-brand)] transition-[width]" style={{ width: `${p.percent}%` }} /></div>
            <p className="mt-2 text-xs text-[var(--brand-400)]">{statusText}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Send, value: p.sent, label: 'enviados', tone: 'text-[var(--green-400)]' },
              { icon: SkipForward, value: p.skipped, label: 'pulados', tone: 'text-[var(--text-body)]' },
              { icon: AlertTriangle, value: p.failed, label: 'falhas', tone: 'text-[var(--red-400)]' },
              { icon: Clock, value: eta || 'instantes', label: 'restante (estim.)', tone: 'text-[var(--blue-400)]' },
            ].map(({ icon: Icon, value, label, tone }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
                <Icon className={`h-6 w-6 shrink-0 ${tone}`} />
                <div className="min-w-0"><p className="rdo-num truncate text-lg font-bold text-[var(--text-title)]">{value}</p><p className="truncate text-xs text-[var(--text-secondary)]">{label}</p></div>
              </div>
            ))}
          </div>
        </div>

        {(automaticWaiting.length > 0 || manualWaiting.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-2.5 text-sm text-[var(--text-secondary)]">
            <Clock className="h-4 w-4" />
            <span className="flex-1">Também na fila: {[automaticWaiting.length ? `${automaticWaiting.length} oferta(s) da automação` : '', manualWaiting.length ? `${manualWaiting.length} disparo(s) manual(is)` : ''].filter(Boolean).join(' e ')}</span>
            {automaticWaiting.length > 0 && (
              <button type="button" onClick={() => onCancel(automaticWaiting.map((job) => job.id))} className="text-xs font-semibold text-[var(--red-400)] hover:underline">Cancelar os da automação</button>
            )}
          </div>
        )}
      </section>
    );
  })() : (
    <section className="panel flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-brand-soft)] text-[var(--brand-500)]"><Send className="h-7 w-7" /></span>
      <h2 className="text-lg font-bold text-[var(--text-title)]">Nenhum disparo em andamento</h2>
      <p className="text-sm text-[var(--text-secondary)]">A fila continua no servidor mesmo com o aplicativo fechado. Quando um disparo começar, o progresso aparece aqui.</p>
      <button type="button" onClick={onNewDispatch} className="btn-brand mt-1 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold">Criar novo disparo</button>
    </section>
  );

  return (
    <div className="space-y-4">
      {mode === 'ongoing' && heroCard}

      <section className="panel overflow-hidden">
        <header className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-4 sm:p-5">
          <Clock className="h-5 w-5 text-[var(--text-secondary)]" />
          <div>
            <h2 className="text-lg font-bold text-[var(--text-title)]">{mode === 'ongoing' ? 'Histórico recente' : 'Histórico'}</h2>
            <p className="text-[13px] text-[var(--text-secondary)]">{mode === 'ongoing' ? 'Últimos disparos realizados por você.' : `Últimos ${finished.length} disparos finalizados.`}</p>
          </div>
        </header>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-[var(--text-secondary)]">Nenhum disparo finalizado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Oferta</th>
                  <th className="px-3 py-3 font-semibold">Data e hora</th>
                  <th className="px-3 py-3 font-semibold">Enviados / total</th>
                  <th className="px-5 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((job) => {
                  const p = progressOf(job);
                  const mp = marketplaceInfo(inferMarketplace(job.firstOffer?.marketplace, job.firstOffer?.affiliateUrl));
                  const end = job.completedAt || job.cancelledAt;
                  const duration = job.startedAt && end ? durationLabel(new Date(end).getTime() - new Date(job.startedAt).getTime()) : null;
                  const barTone = job.status === 'completed' ? 'bg-[var(--green-500)]' : 'bg-[var(--red-500)]';
                  const isOpen = expanded === job.id;
                  return (
                    <Fragment key={job.id}>
                      <tr className="border-t border-[var(--border-subtle)]">
                        <td className="px-5 py-3"><StatusChip status={job.status} /></td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Thumb src={job.firstOffer?.image} />
                            <div className="min-w-0">
                              <p className="max-w-[280px] truncate font-medium text-[var(--text-title)]">{job.firstOffer?.name || 'Oferta'}{(job.offersCount || 0) > 1 ? ` +${(job.offersCount || 1) - 1}` : ''}</p>
                              <p className="truncate text-xs text-[var(--text-secondary)]">{mp.label}{job.firstOffer?.category ? ` • ${job.firstOffer.category}` : ''}{job.source === 'queue_automation' ? ' • Automação' : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[var(--text-body)]">
                          <p className="whitespace-nowrap">{fullDate(job.createdAt)}</p>
                          {duration && <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]"><Clock className="h-3 w-3" />{duration}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span className="rdo-num w-14 shrink-0 text-[var(--text-title)]">{p.sent}/{p.total}</span>
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-white/[.07]"><div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.round((p.sent / p.total) * 100)}%` }} /></div>
                            {p.skipped > 0 && <span className="whitespace-nowrap text-xs text-[var(--text-secondary)]">{p.skipped} {p.skipped === 1 ? 'pulada' : 'puladas'}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={() => setExpanded(isOpen ? null : job.id)} aria-expanded={isOpen} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-title)] hover:border-[var(--border-brand)]">
                            Ver detalhes {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[var(--surface-card-raised)]">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="grid gap-3 text-[13px] sm:grid-cols-3">
                              <div>
                                <p className="text-xs text-[var(--text-muted)]">Grupos ({p.groups})</p>
                                <p className="mt-1 text-[var(--text-body)]">{(job.destinations?.groups || []).map((g) => g.name || g.id).join(', ') || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--text-muted)]">Resultado</p>
                                <p className="mt-1 text-[var(--text-body)]">{p.sent} enviados · {p.failed} falhas · {p.skipped} pulados{job.stats?.cancelled ? ` · ${job.stats.cancelled} cancelados` : ''}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--text-muted)]">Horários</p>
                                <p className="mt-1 text-[var(--text-body)]">Início {hhmm(job.startedAt || job.createdAt)} · Fim {hhmm(end)}</p>
                              </div>
                              {(job.lastError || job.status === 'cancelled') && (
                                <p className={`sm:col-span-3 rounded-xl border p-2.5 text-xs ${job.lastError ? 'border-[rgba(239,68,68,.3)] bg-[var(--surface-red-soft)] text-[var(--red-400)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
                                  {job.lastError || (job.cancelReason === 'cancelled_by_user' ? 'Cancelado pelo botão "Cancelar disparo".' : 'Disparo cancelado.')}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
