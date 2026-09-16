import type { ElementType } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react';
import { Sparkline } from '@/components/charts';
import { Icon3D } from '@/components/ui/Icon3D';

interface KpiCardProps {
  icon: ElementType;
  label: string;
  info: string;
  display: string;
  value: number;
  previous: number;
  series: number[];
  comparison: string;
  unavailable?: boolean;
  footnote?: string;
  /** Texto no lugar da variação, para métricas sem histórico de comparação. */
  note?: string;
  /** Subir é ruim (ex.: falhas): verde quando cai, vermelho quando sobe. */
  invertTone?: boolean;
  /** Linha extra de aviso (ex.: valor aguardando pagamento). */
  pending?: string;
}

// Variação só com base real: sem período anterior não há porcentagem inventada.
function describeDelta(value: number, previous: number) {
  if (!previous && !value) return { tone: 'neutral' as const, text: 'sem movimento' };
  if (!previous) return { tone: 'up' as const, text: 'novo no período' };
  const pct = ((value - previous) / previous) * 100;
  const rounded = Math.abs(pct) < 0.05 ? 0 : pct;
  const text = `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return { tone: rounded > 0 ? ('up' as const) : rounded < 0 ? ('down' as const) : ('neutral' as const), text };
}

export function KpiCard({ icon: Icon, label, info, display, value, previous, series, comparison, unavailable, footnote, note, invertTone, pending }: KpiCardProps) {
  const delta = describeDelta(value, previous);
  const good = invertTone ? delta.tone === 'down' : delta.tone === 'up';
  const bad = invertTone ? delta.tone === 'up' : delta.tone === 'down';
  const DeltaIcon = delta.tone === 'up' ? ArrowUpRight : delta.tone === 'down' ? ArrowDownRight : Minus;
  const deltaColor = good ? 'text-[var(--green-400)]' : bad ? 'text-[var(--red-400)]' : 'text-[var(--text-muted)]';

  return (
    <div className="panel flex min-w-0 flex-col items-start gap-2.5 p-3.5 sm:flex-row sm:gap-3 sm:p-5">
      <Icon3D icon={Icon} size={40} className="sm:hidden" />
      <Icon3D icon={Icon} size={44} className="hidden sm:inline-grid" />
      <div className="w-full min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)]">
          <span className="truncate">{label}</span>
          <span title={info} aria-label={info} className="text-[var(--text-muted)]"><Info className="h-3.5 w-3.5" /></span>
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="rdo-num shrink-0 whitespace-nowrap text-[20px] font-extrabold leading-tight text-[var(--text-title)] sm:text-2xl">{unavailable ? '—' : display}</p>
          {!unavailable && series.some((point) => point > 0) && (
            <span className="hidden min-w-0 overflow-hidden sm:block">
              <Sparkline values={series} width={64} height={30} stroke={bad ? 'var(--red-400)' : 'var(--brand-500)'} />
            </span>
          )}
        </div>
        {note && !unavailable ? (
          <p className="mt-1.5 truncate text-xs text-[var(--text-muted)]">{note}</p>
        ) : unavailable ? (
          <p className="mt-1.5 truncate text-xs text-[var(--text-muted)]">{footnote || 'Indisponível agora'}</p>
        ) : (
          <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs">
            <DeltaIcon className={`h-3.5 w-3.5 shrink-0 ${deltaColor}`} />
            <span className={`shrink-0 whitespace-nowrap font-semibold ${deltaColor}`}>{delta.text}</span>
            <span className="hidden min-w-0 truncate text-[var(--text-muted)] sm:inline">{footnote || comparison}</span>
          </p>
        )}
        {pending && !unavailable && (
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[var(--amber-400)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--amber-400)]" aria-hidden="true" />
            <span className="truncate">{pending}</span>
          </p>
        )}
      </div>
    </div>
  );
}
