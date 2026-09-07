import React from 'react';
import { Copy, Eye, Layers3, Share2, ShoppingBag } from 'lucide-react';
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

const marketplaceLabel = (marketplace: Product['marketplace']) =>
  marketplace === 'mercado_livre' ? 'ML' : marketplace === 'tiktok_shop' ? 'TT' : 'SH';

const marketplaceColor = (marketplace: Product['marketplace']) => {
  switch (marketplace) {
    case 'mercado_livre': return 'bg-yellow-500';
    case 'amazon': return 'bg-amber-500';
    case 'magalu': return 'bg-purple-500';
    case 'tiktok_shop': return 'bg-gray-900';
    case 'shopee':
    default: return 'bg-[var(--brand-primary)]';
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onGenerateOffer,
  onShare,
  onAddToQueue,
  onPreview,
  onCopyLink,
  compact,
}) => {
  const currentPrice = product.currentPrice != null
    ? `R$ ${product.currentPrice.toFixed(2).replace('.', ',')}`
    : 'Confira';
  const originalPrice = product.originalPrice != null
    ? `R$ ${product.originalPrice.toFixed(2).replace('.', ',')}`
    : null;
  const discount = product.discountPercentage != null
    ? Math.round(product.discountPercentage)
    : null;
  const commission = product.privateCommission?.percentage ?? product.commissionRate;
  const isCompact = compact === true;
  const mpColor = marketplaceColor(product.marketplace);

  return (
    <article
      className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-0)] shadow-card transition-all duration-200 ${isCompact ? 'p-2' : 'p-2.5'} hover:shadow-card-hover hover:border-[var(--brand-primary)]/40`}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-1)]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
            <ShoppingBag className="h-7 w-7" />
          </div>
        )}
        <span
          className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold shadow-sm ${mpColor} text-white`}
        >
          <ShoppingBag className="h-2.5 w-2.5" />
          {marketplaceLabel(product.marketplace)}
        </span>
        {discount != null && discount > 0 && (
          <span className="absolute top-1.5 right-1.5 rounded-full bg-[var(--color-danger-500)] px-2 py-0.5 text-[9px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${isCompact ? 'pt-1.5' : 'pt-2'}`}>
        <h3
          className={`text-clamp-2 font-bold leading-snug text-[var(--text-primary)] ${isCompact ? 'text-[11px]' : 'text-[12px]'}`}
          title={product.name}
        >
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          {originalPrice && (
            <span className={`line-through text-[var(--text-muted)] ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
              {originalPrice}
            </span>
          )}
          <p className={`font-black text-[var(--brand-primary)] ${isCompact ? 'text-[15px]' : 'text-[17px]'}`}>
            {currentPrice}
          </p>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-1 text-[var(--text-muted)]">
          <span className={`font-medium text-clamp-1 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
            {product.salesCountText || 'Em alta'}
          </span>
          <span className={`font-semibold text-[var(--color-success-600)] dark:text-[var(--color-success-500)] ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
            {commission != null ? `${Math.round(commission)}%` : '—'}
          </span>
        </div>
        <div
          className={`mt-2 flex items-center gap-1.5 ${isCompact ? 'justify-center' : ''}`}
        >
          <button
            type="button"
            onClick={() => (onShare ? onShare(product) : onGenerateOffer(product))}
            className={`pressable inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-[10px] font-bold text-white transition-all ${isCompact ? 'px-2 py-1' : ''} hover:bg-[var(--brand-primary-hover)] hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,_var(--brand-primary)_40%,_transparent)]`}
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate hidden sm:inline">Compartilhar</span>
          </button>
          {onAddToQueue && (
            <button
              type="button"
              onClick={() => onAddToQueue(product)}
              aria-label="Adicionar à fila"
              className={`pressable flex-shrink-0 grid place-items-center rounded-lg border border-[var(--brand-primary)]/60 bg-[var(--brand-light)] text-[var(--brand-primary)] transition-all hover:bg-[var(--brand-primary)]/15 hover:border-[var(--brand-primary)] ${isCompact ? 'h-8 w-8' : 'h-9 w-9'}`}
            >
              <Layers3 className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </button>
          )}
          {onCopyLink && (
            <button
              type="button"
              onClick={() => onCopyLink(product)}
              aria-label="Copiar link"
              className={`pressable flex-shrink-0 grid place-items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-muted)] transition-all hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] ${isCompact ? 'h-8 w-8' : 'h-9 w-9'}`}
            >
              <Copy className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </button>
          )}
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(product)}
              aria-label="Visualizar"
              className={`pressable flex-shrink-0 grid place-items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-muted)] transition-all hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] ${isCompact ? 'h-8 w-8' : 'h-9 w-9'}`}
            >
              <Eye className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;