import React from 'react';
import { Copy, Eye, Heart, Layers3, Share2, ShoppingBag } from 'lucide-react';
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

const marketplaceLabel = (marketplace: Product['marketplace']) => marketplace === 'mercado_livre' ? 'ML' : marketplace === 'tiktok_shop' ? 'TT' : 'SH';

export const ProductCard: React.FC<ProductCardProps> = ({ product, onGenerateOffer, onShare, onAddToQueue, onPreview, onCopyLink, compact }) => {
  const currentPrice = product.currentPrice != null ? `R$ ${product.currentPrice.toFixed(2).replace('.', ',')}` : 'Confira';
  const originalPrice = product.originalPrice != null ? `R$ ${product.originalPrice.toFixed(2).replace('.', ',')}` : null;
  const discount = product.discountPercentage != null ? Math.round(product.discountPercentage) : null;
  const commission = product.privateCommission?.percentage ?? product.commissionRate;
  const isCompact = compact === true;
  
  return <article className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition ${isCompact ? 'p-1.5' : 'p-2'} hover:border-[var(--primary)]/60`}>
    <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-elevated)]">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-[var(--text-secondary)]"><ShoppingBag className="h-8 w-8" /></div>}
      <span className={`absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold shadow ${product.marketplace === 'mercado_livre' ? 'bg-[#ffe500] text-[#161616]' : 'bg-[var(--primary)] text-white'}`}><ShoppingBag className="h-2.5 w-2.5" /> {marketplaceLabel(product.marketplace)}</span>
      {discount != null && discount > 0 && <span className="absolute top-1 right-1 rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[9px] font-bold text-white">-{discount}%</span>}
    </div>
    <div className={`flex flex-1 flex-col ${isCompact ? 'pt-1.5 px-0.5' : 'pt-2 px-0.5'}`}>
      <h3 className={`line-clamp-2 font-bold leading-tight text-[var(--text)] ${isCompact ? 'text-[11px]' : 'text-[12px]'}`} title={product.name}>{product.name}</h3>
      <div className="mt-1 flex items-center gap-1"><span className={`line-through text-[var(--text-muted)] ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{originalPrice || ''}</span><p className={`font-black text-[var(--primary)] ${isCompact ? 'text-[16px]' : 'text-[18px]'}`}>{currentPrice}</p></div>
      <div className="mt-1 flex items-center justify-between gap-1 text-[var(--text-muted)]"><span className={`font-medium ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{product.salesCountText || 'Em alta'}</span><span className={`font-semibold text-[var(--success)] ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>{commission != null ? `${Math.round(commission)}%` : '—'}</span></div>
      <div className={`mt-2 ${isCompact ? 'flex items-center gap-1' : 'grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-1.5'}`}>
        <button type="button" onClick={() => (onShare ? onShare(product) : onGenerateOffer(product))} className={`pressable inline-flex min-w-0 items-center justify-center gap-1 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] ${isCompact ? 'px-2 py-1.5 text-[9px] font-bold' : 'px-2 py-2 text-[10px] font-bold'}`}><Share2 className={isCompact ? 'h-3 w-3' : 'h-3 w-3 shrink-0'} /><span className={isCompact ? 'hidden' : 'truncate'}>Compartilhar</span></button>
        {onAddToQueue && <button type="button" onClick={() => onAddToQueue(product)} aria-label="Adicionar à fila" className={`pressable grid shrink-0 place-items-center rounded-lg border border-[var(--primary)]/70 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 ${isCompact ? 'h-8 w-8' : 'h-9 w-9'}`}><Layers3 className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} /></button>}
        {onCopyLink && <button type="button" onClick={() => onCopyLink(product)} aria-label="Copiar link" className={`pressable grid shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] ${isCompact ? 'h-8 w-8' : 'h-9 w-9'}`}><Copy className={isCompact ? 'h-3 w-3' : 'h-3 w-3'} /></button>}
        {onPreview && <button type="button" onClick={() => onPreview(product)} aria-label="Visualizar" className={`pressable grid shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] ${isCompact ? 'h-8 w-8' : 'h-9 w-9'}`}><Eye className={isCompact ? 'h-3 w-3' : 'h-3 w-3'} /></button>}
      </div>
    </div>
  </article>;
};

export default ProductCard;
