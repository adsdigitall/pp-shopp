import { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { formatBRL, SALE_STATUS_INFO, type DashboardSale, type SaleStatus } from '@/services/dashboard';

const PILL: Record<SaleStatus, string> = {
  paid: 'bg-[var(--surface-green-soft)] text-[var(--green-400)]',
  completed: 'bg-[var(--surface-blue-soft)] text-[var(--blue-400)]',
  unpaid: 'bg-[var(--surface-amber-soft)] text-[var(--amber-400)]',
  cancelled: 'bg-[var(--surface-red-soft)] text-[var(--red-400)]',
};

const FILTERS: { id: 'all' | SaleStatus; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'paid', label: 'Pagas' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'unpaid', label: 'Aguardando pagamento' },
  { id: 'cancelled', label: 'Canceladas' },
];

const whenFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

interface SalesListProps {
  sales: DashboardSale[];
  summary: Record<SaleStatus, { count: number; commission: number }>;
  periodLabel: string;
  unavailable: boolean;
  truncated: boolean;
}

export function SalesList({ sales, summary, periodLabel, unavailable, truncated }: SalesListProps) {
  const [filter, setFilter] = useState<'all' | SaleStatus>('all');
  const visible = useMemo(() => (filter === 'all' ? sales : sales.filter((sale) => sale.status === filter)), [sales, filter]);
  const countOf = (id: 'all' | SaleStatus) => (id === 'all' ? sales.length : summary[id].count);

  return (
    <section className="panel p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-title)]">Vendas do período</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Todos os pedidos da Shopee ({periodLabel.toLowerCase()}) com o status atualizado.</p>
        </div>
        {!unavailable && (
          <p className="text-xs text-[var(--text-secondary)] sm:text-right">
            Comissão confirmada ou a caminho<br className="hidden sm:block" />{' '}
            <strong className="rdo-num text-sm text-[var(--text-title)]">{formatBRL(summary.paid.commission + summary.completed.commission)}</strong>
          </p>
        )}
      </header>

      {unavailable ? (
        <p className="empty-state mt-3 px-4 py-6 text-center text-sm text-[var(--text-secondary)]">Relatório da Shopee indisponível agora.</p>
      ) : (
        <>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar vendas">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${filter === id ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}
              >
                {label}
                <span className="rdo-num rounded-full bg-white/5 px-1.5 text-[11px]">{countOf(id)}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="empty-state mt-3 px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              {sales.length === 0 ? 'Nenhum pedido na Shopee neste período.' : 'Nenhum pedido com esse status.'}
            </p>
          ) : (
            <ul className="mt-2 max-h-[420px] overflow-y-auto pr-1">
              {visible.map((sale, index) => (
                <li key={sale.id} className={`flex items-center gap-3 py-3 ${index ? 'border-t border-[var(--border-subtle)]' : ''}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                    {sale.image ? <img src={sale.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-[var(--ink-500)]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text-title)]" title={sale.product}>{sale.product}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {whenFormat.format(new Date(sale.at))} · {formatBRL(sale.price)}
                      {sale.qty > 1 ? ` · ${sale.qty} un.` : ''}
                      {sale.extraItems > 0 ? ` · +${sale.extraItems} ${sale.extraItems === 1 ? 'item' : 'itens'}` : ''}
                    </span>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold sm:hidden ${PILL[sale.status]}`}>{SALE_STATUS_INFO[sale.status].label}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rdo-num text-sm font-bold ${sale.status === 'cancelled' ? 'text-[var(--text-muted)] line-through' : sale.status === 'unpaid' ? 'text-[var(--text-secondary)]' : 'text-[var(--text-title)]'}`}>
                      {formatBRL(sale.commission)}
                    </span>
                    <span title={SALE_STATUS_INFO[sale.status].hint} className={`hidden whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-block ${PILL[sale.status]}`}>
                      {SALE_STATUS_INFO[sale.status].label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {truncated && <p className="mt-2 text-xs text-[var(--text-muted)]">Muitos pedidos no período: a lista mostra os mais recentes que a Shopee devolveu.</p>}
        </>
      )}
    </section>
  );
}
