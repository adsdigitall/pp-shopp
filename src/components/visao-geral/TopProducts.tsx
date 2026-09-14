import { ArrowUpRight, ChevronRight, Package } from 'lucide-react';
import { formatBRL, type DashboardData } from '@/services/dashboard';

interface TopProductsProps {
  data: DashboardData['topProducts'];
  periodLabel: string;
  onSeeAll: () => void;
}

export function TopProducts({ data, periodLabel, onSeeAll }: TopProductsProps) {
  const sold = data.kind === 'sold';
  const items = data.items.slice(0, 3);
  return (
    <section className="panel p-4 sm:p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-lg font-bold text-[var(--text-title)]">
          {sold ? 'Top produtos vendidos' : 'Mais enviados'} <span className="text-sm font-medium text-[var(--text-muted)]">· {periodLabel}</span>
        </h2>
        <button type="button" onClick={onSeeAll} className="inline-flex shrink-0 items-center gap-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-title)]">
          Ver todos <ChevronRight className="h-4 w-4" />
        </button>
      </header>
      {!sold && items.length > 0 && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">Sem vendas no período: mostrando as ofertas mais enviadas aos grupos.</p>
      )}
      {items.length === 0 ? (
        <p className="empty-state mt-3 px-4 py-6 text-center text-sm text-[var(--text-secondary)]">Nenhum produto vendido ou enviado no período.</p>
      ) : (
        <ol className="mt-2">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className={`flex items-center gap-3 py-3 ${index ? 'border-t border-[var(--border-subtle)]' : ''}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border-default)] text-xs font-bold text-[var(--text-secondary)]">{index + 1}</span>
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                {item.image ? <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-[var(--ink-500)]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--text-title)]">{item.name}</span>
                {item.price > 0 && <span className="rdo-num block text-sm font-bold text-[var(--brand-500)]">{formatBRL(item.price)}</span>}
              </span>
              <span className="shrink-0 text-right text-xs leading-tight text-[var(--text-secondary)]">
                <span className="rdo-num block text-sm font-semibold text-[var(--text-title)]">{item.count}</span>
                {sold ? (item.count === 1 ? 'venda' : 'vendas') : (item.count === 1 ? 'envio' : 'envios')}
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--green-400)]" aria-hidden="true" />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
