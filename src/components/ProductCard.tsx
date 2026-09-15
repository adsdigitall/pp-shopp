import React from 'react';
import { Copy, Eye, Flame, Package, Plus, Share2, ShoppingCart, Star, TrendingUp } from 'lucide-react';
import { Product } from '../types/product';

interface ProductCardProps {
  product: Product;
  onGenerateOffer: (product: Product) => void;
  onShare?: (product: Product) => void;
  onAddToQueue?: (product: Product) => void;
  onPreview?: (product: Product) => void;
  onCopyLink?: (product: Product) => void;
  compact?: boolean;
}

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const compactCount = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

// Selo só a partir de dado real do produto (um por card, na ordem de importância).
function ribbonFor(product: Product, commissionRate: number | null) {
  const sales = product.salesCount ?? 0;
  // isFlashSale vem da janela de validade da comissão (todo produto tem), não de promoção relâmpago real.
  if (sales >= 10_000) return { label: 'Mais vendido', icon: Flame, tone: 'bg-[var(--brand-500)] text-white' };
  if (commissionRate != null && commissionRate >= 15) return { label: 'Alta comissão', icon: TrendingUp, tone: 'bg-[rgba(7,9,11,.72)] text-[var(--green-400)]' };
  if ((product.rating ?? 0) >= 4.8 && sales >= 500) return { label: 'Bem avaliado', icon: Star, tone: 'bg-[rgba(7,9,11,.72)] text-[var(--gold-400)]' };
  return null;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onGenerateOffer, onShare, onAddToQueue, onPreview, onCopyLink }) => {
  const price = product.currentPrice;
  const discount = product.discountPercentage != null ? Math.round(product.discountPercentage) : null;
  const commissionRate = product.privateCommission?.percentage ?? product.commissionRate;
  const commissionValue = product.commissionAmount ?? product.privateCommission?.estimatedValue
    ?? (price != null && commissionRate != null ? (price * commissionRate) / 100 : null);
  const ribbon = ribbonFor(product, commissionRate);
  const RibbonIcon = ribbon?.icon;
  const share = () => (onShare ? onShare(product) : onGenerateOffer(product));

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] transition-colors hover:border-[var(--border-default)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--surface-card-raised)] text-[var(--text-muted)]"><Package className="h-8 w-8" /></div>
        )}
        {ribbon && RibbonIcon && (
          <span className={`absolute left-2.5 top-2.5 inline-flex max-w-[calc(100%-3.5rem)] items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${ribbon.tone}`}>
            <RibbonIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{ribbon.label}</span>
          </span>
        )}
        {onPreview && (
          <button
            type="button"
            onClick={() => onPreview(product)}
            aria-label="Visualizar oferta"
            title="Visualizar oferta"
            className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-[var(--border-default)] bg-[rgba(7,9,11,.62)] text-[var(--text-body)] backdrop-blur-sm transition-colors hover:text-[var(--brand-400)]"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        {discount != null && discount > 0 && (
          <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-[var(--brand-500)] px-2 py-0.5 text-xs font-extrabold text-white">-{discount}%</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 h-9 text-[13px] font-semibold leading-[18px] text-[var(--text-title)]" title={product.name}>{product.name}</h3>

        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="rdo-num text-lg font-extrabold leading-tight text-[var(--brand-500)]">{price != null ? brl(price) : 'Confira'}</span>
          {product.originalPrice != null && price != null && product.originalPrice > price && (
            <span className="rdo-num text-xs text-[var(--text-muted)] line-through">{brl(product.originalPrice)}</span>
          )}
        </div>

        {commissionRate != null && (
          <p className="text-xs font-medium text-[var(--green-400)]">
            Comissão {commissionValue != null && <strong className="font-bold">{brl(commissionValue)}</strong>} ({Math.round(commissionRate)}%)
          </p>
        )}

        <div className="flex min-w-0 items-center gap-3 text-xs text-[var(--text-secondary)]">
          {product.rating != null && product.rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[var(--gold-400)] text-[var(--gold-400)]" />
              <span className="rdo-num">{product.rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
            </span>
          )}
          {product.salesCount != null && product.salesCount > 0 && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{compactCount.format(product.salesCount)} vendidos</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-2">
          {onAddToQueue ? (
            <button
              type="button"
              onClick={() => onAddToQueue(product)}
              className="btn-brand inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-bold"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate sm:hidden">Adicionar</span>
              <span className="hidden truncate sm:inline">Adicionar à fila</span>
            </button>
          ) : (
            <button type="button" onClick={share} className="btn-brand inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-bold">
              <Share2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Compartilhar</span>
            </button>
          )}
          {onAddToQueue && (
            <button type="button" onClick={share} aria-label="Compartilhar" title="Compartilhar" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--text-body)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand-400)]">
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {onCopyLink && (
            <button type="button" onClick={() => onCopyLink(product)} aria-label="Copiar link" title="Copiar link" className="hidden h-10 w-10 sm:grid shrink-0 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--text-body)] transition-colors hover:border-[var(--border-brand)] hover:text-[var(--brand-400)]">
              <Copy className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
