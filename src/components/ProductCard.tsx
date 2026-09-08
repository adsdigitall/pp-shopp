import React from 'react';
import { Copy, Eye, Layers3, Share2, ShoppingBag, Package } from 'lucide-react';
import { Product } from '../types/product';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ProductCardProps {
  product: Product;
  onGenerateOffer: (product: Product) => void;
  onShare?: (product: Product) => void;
  onAddToQueue?: (product: Product) => void;
  onPreview?: (product: Product) => void;
  onCopyLink?: (product: Product) => void;
  compact?: boolean;
}

const marketplaceConfig = {
  shopee: { label: 'SH', color: 'bg-primary', textColor: 'text-primary-foreground', icon: '🛍️' },
  mercado_livre: { label: 'ML', color: 'bg-yellow-500', textColor: 'text-yellow-900', icon: '🤝' },
  amazon: { label: 'AMZ', color: 'bg-amber-500', textColor: 'text-amber-900', icon: '📦' },
  magalu: { label: 'MGL', color: 'bg-purple-500', textColor: 'text-purple-50', icon: '💜' },
  tiktok_shop: { label: 'TT', color: 'bg-neutral-900', textColor: 'text-neutral-50', icon: '🎵' },
  shein: { label: 'SHN', color: 'bg-pink-500', textColor: 'text-pink-50', icon: '👗' },
  aliexpress: { label: 'ALX', color: 'bg-red-500', textColor: 'text-red-50', icon: '🛒' },
} as const;

const getMarketplaceConfig = (marketplace: Product['marketplace']) => 
  marketplaceConfig[marketplace] || marketplaceConfig.shopee;

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onGenerateOffer, 
  onShare, 
  onAddToQueue, 
  onPreview, 
  onCopyLink, 
  compact 
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
  const mpConfig = getMarketplaceConfig(product.marketplace);

  return (
    <Card className={`group flex min-w-0 flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30 ${isCompact ? 'p-2' : 'p-2.5'}`}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="h-7 w-7" />
          </div>
        )}
        
        <Badge className="absolute bottom-1.5 left-1.5" variant="default" style={{ backgroundColor: mpConfig.color, color: mpConfig.textColor }}>
          <span className="text-[9px] font-bold">{mpConfig.label}</span>
        </Badge>
        
        {discount != null && discount > 0 && (
          <Badge className="absolute top-1.5 right-1.5" variant="destructive">
            -{discount}%
          </Badge>
        )}
      </div>
      
      <CardContent className={`flex flex-1 flex-col p-0 ${isCompact ? 'pt-1.5' : 'pt-2'}`}>
        <h3 className={`line-clamp-2 font-bold leading-snug text-foreground ${isCompact ? 'text-[11px]' : 'text-[12px]'}`} title={product.name}>
          {product.name}
        </h3>
        
        <div className="mt-1.5 flex items-baseline gap-1.5">
          {originalPrice && (
            <span className={`line-through text-muted-foreground ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
              {originalPrice}
            </span>
          )}
          <p className={`font-black text-primary ${isCompact ? 'text-[15px]' : 'text-[17px]'}`}>
            {currentPrice}
          </p>
        </div>
        
        <div className="mt-1.5 flex items-center justify-between gap-1 text-muted-foreground">
          <span className={`font-medium truncate ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
            {product.salesCountText || 'Em alta'}
          </span>
          <Badge variant="success" className={`text-[9px] ${isCompact ? 'text-[8px]' : ''}`}>
            {commission != null ? `${Math.round(commission)}%` : '—'}
          </Badge>
        </div>
        
        <div className={`mt-2 flex items-center gap-1.5 ${isCompact ? 'justify-center' : ''}`}>
          <Button
            size={isCompact ? 'sm' : 'default'}
            className="flex-1 min-w-0"
            onClick={() => (onShare ? onShare(product) : onGenerateOffer(product))}
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate hidden sm:inline">Compartilhar</span>
          </Button>
          
          {onAddToQueue && (
            <Button
              variant="outline"
              size={isCompact ? 'icon-sm' : 'icon'}
              className="border-primary/60 bg-primary/5 text-primary hover:bg-primary/15"
              onClick={() => onAddToQueue(product)}
              aria-label="Adicionar à fila"
            >
              <Layers3 className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </Button>
          )}
          
          {onCopyLink && (
            <Button
              variant="ghost"
              size={isCompact ? 'icon-sm' : 'icon'}
              onClick={() => onCopyLink(product)}
              aria-label="Copiar link"
            >
              <Copy className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </Button>
          )}
          
          {onPreview && (
            <Button
              variant="ghost"
              size={isCompact ? 'icon-sm' : 'icon'}
              onClick={() => onPreview(product)}
              aria-label="Visualizar"
            >
              <Eye className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;