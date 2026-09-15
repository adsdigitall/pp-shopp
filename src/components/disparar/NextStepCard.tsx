import type { ElementType, ReactNode } from 'react';
import { Package } from 'lucide-react';
import type { Product } from '../../types/product';
import { Icon3D } from '@/components/ui/Icon3D';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function WhatsAppBubble({ product, text }: { product: Product | null; text: string }) {
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date());
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-3">
      <div className="relative rounded-2xl rounded-tl-sm bg-[var(--ink-700)] p-3 text-[13px] leading-relaxed text-[var(--text-title)]">
        {product && (
          <div className="mb-2 flex gap-2.5 rounded-xl bg-black/20 p-2">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
              {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-[var(--ink-500)]" />}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[12px] font-medium">{product.name}</p>
              <p className="mt-0.5 text-[12px]">
                {product.currentPrice != null && <strong>{brl(product.currentPrice)}</strong>}
                {product.originalPrice != null && product.currentPrice != null && product.originalPrice > product.currentPrice && (
                  <span className="ml-1.5 text-[11px] text-[var(--ink-300)] line-through">{brl(product.originalPrice)}</span>
                )}
              </p>
            </div>
          </div>
        )}
        <p className="line-clamp-[10] whitespace-pre-wrap break-words">{text}</p>
        <p className="mt-1 text-right text-[10px] text-[var(--ink-300)]">{time}</p>
      </div>
    </div>
  );
}

interface NextStepCardProps {
  icon: ElementType;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  footnote?: string;
}

export function NextStepCard({ icon: Icon, eyebrow, title, description, children, footnote }: NextStepCardProps) {
  return (
    <aside className="panel flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex gap-3">
        <Icon3D icon={Icon} size={48} />
        <div className="min-w-0">
          <p className="text-[13px] text-[var(--text-secondary)]">{eyebrow}</p>
          <h2 className="text-xl font-bold text-[var(--text-title)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      {children}
      {footnote && <p className="text-center text-xs text-[var(--text-muted)]">{footnote}</p>}
    </aside>
  );
}
