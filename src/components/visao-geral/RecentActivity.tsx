import { AlertTriangle, ChevronRight, Send, ShoppingCart } from 'lucide-react';
import { formatRelativeTime, type DashboardActivity } from '@/services/dashboard';

const ICONS = { sale: ShoppingCart, send: Send, send_failed: AlertTriangle };
const DOT = { success: 'bg-[var(--green-500)]', warning: 'bg-[var(--amber-500)]', danger: 'bg-[var(--red-500)]' };

export function RecentActivity({ items, onSeeAll }: { items: DashboardActivity[]; onSeeAll: () => void }) {
  return (
    <section className="panel p-4 sm:p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--text-title)]">Atividade recente</h2>
        <button type="button" onClick={onSeeAll} className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-title)]">
          Ver todas <ChevronRight className="h-4 w-4" />
        </button>
      </header>
      {items.length === 0 ? (
        <p className="empty-state mt-3 px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
          Assim que houver vendas ou ofertas enviadas, elas aparecem aqui.
        </p>
      ) : (
        <ul className="mt-2">
          {items.map((item, index) => {
            const Icon = ICONS[item.type];
            return (
              <li key={`${item.at}-${index}`} className={`flex items-center gap-3 py-3 ${index ? 'border-t border-[var(--border-subtle)]' : ''}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.type === 'sale' ? 'bg-[var(--surface-brand-soft)] text-[var(--brand-500)]' : item.type === 'send_failed' ? 'bg-[var(--surface-red-soft)] text-[var(--red-400)]' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--text-title)]">{item.title}</span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">{item.detail}</span>
                </span>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatRelativeTime(item.at)}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[item.tone]}`} aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
