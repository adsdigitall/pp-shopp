import type { ReactNode } from 'react';
import { CalendarDays, Check, Clock, Package, Users } from 'lucide-react';
import { marketplaceInfo } from '@/services/queueOverview';

export type QueueTone = 'pending' | 'scheduled' | 'sent' | 'failed' | 'running';

const PILL: Record<QueueTone, string> = {
  pending: 'border-[rgba(245,158,11,.35)] bg-[var(--surface-amber-soft)] text-[var(--amber-400)]',
  scheduled: 'border-[rgba(59,130,246,.35)] bg-[var(--surface-blue-soft)] text-[var(--blue-400)]',
  running: 'border-[var(--border-brand)] bg-[var(--surface-brand-soft)] text-[var(--brand-400)]',
  sent: 'border-[rgba(34,197,94,.35)] bg-[var(--surface-green-soft)] text-[var(--green-400)]',
  failed: 'border-[rgba(239,68,68,.35)] bg-[var(--surface-red-soft)] text-[var(--red-400)]',
};

export function StatusPill({ tone, children }: { tone: QueueTone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PILL[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

interface QueueRowProps {
  image: string | null;
  title: string;
  subtitle: ReactNode;
  marketplace: string;
  groupsLabel: string;
  intervalLabel: string;
  whenLabel: string;
  pill: { tone: QueueTone; label: string };
  selectable?: { checked: boolean; onToggle: () => void };
  focused: boolean;
  onFocus: () => void;
  iconActions: ReactNode;
  primaryAction?: ReactNode;
}

export function QueueRow({ image, title, subtitle, marketplace, groupsLabel, intervalLabel, whenLabel, pill, selectable, focused, onFocus, iconActions, primaryAction }: QueueRowProps) {
  const mp = marketplaceInfo(marketplace);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onFocus(); } }}
      className={`grid cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border p-3 transition-colors lg:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_auto] ${focused ? 'border-[var(--border-brand)] bg-[var(--surface-selected)]' : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-default)]'}`}
    >
      <div className="flex items-center gap-3">
        {selectable && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); selectable.onToggle(); }}
            aria-label={selectable.checked ? 'Desmarcar oferta' : 'Selecionar oferta'}
            aria-pressed={selectable.checked}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${selectable.checked ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white' : 'border-[var(--border-strong)]'}`}
          >
            {selectable.checked && <Check className="h-3.5 w-3.5" />}
          </button>
        )}
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-[var(--ink-500)]" />}
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text-title)]" title={title}>{title}</p>
        <div className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">{subtitle}</div>
      </div>

      <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)] lg:col-span-1">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {mp.logo ? <img src={mp.logo} alt="" className="h-5 w-5 rounded object-contain" /> : null}
          <span className="truncate text-[var(--text-body)]">{mp.label}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{groupsLabel}</span></span>
        <span className="inline-flex min-w-0 items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{intervalLabel}</span></span>
        <span className="inline-flex min-w-0 items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{whenLabel}</span></span>
      </div>

      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 lg:col-span-1 lg:flex-col lg:items-end">
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          {iconActions}
          {primaryAction}
        </div>
      </div>
    </div>
  );
}

export function IconAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-default)] transition-colors ${danger ? 'text-[var(--red-400)] hover:border-[rgba(239,68,68,.45)]' : 'text-[var(--text-body)] hover:border-[var(--border-brand)] hover:text-[var(--brand-400)]'}`}
    >
      {children}
    </button>
  );
}
