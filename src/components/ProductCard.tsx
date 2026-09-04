import React from 'react';
import { Product, MarketplaceType } from '../types/product';
import { Sparkles, DollarSign, ExternalLink, Star, Truck, Zap, ShoppingBag, Award } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onGenerateOffer: (product: Product) => void;
  onAddToQueue?: (product: Product) => void;
}

const MARKETPLACE_STYLES: Record<MarketplaceType, { color: string; bgColor: string; icon: React.ReactNode; gradient: string; hoverShadow: string }> = {
  shopee: {
    color: '#EE4D2D',
    bgColor: 'bg-orange-100',
    icon: <ShoppingBag className="w-5 h-5" />,
    gradient: 'from-[#FF5722] to-[#EE4D2D]',
    hoverShadow: 'hover:shadow-orange-500/10 hover:border-orange-200',
  },
  mercado_livre: {
    color: '#FFE600',
    bgColor: 'bg-yellow-100',
    icon: <ShoppingBag className="w-5 h-5" />,
    gradient: 'from-yellow-500 to-yellow-600',
    hoverShadow: 'hover:shadow-yellow-500/10 hover:border-yellow-200',
  },
  amazon: {
    color: '#FF9900',
    bgColor: 'bg-amber-100',
    icon: <ShoppingBag className="w-5 h-5" />,
    gradient: 'from-amber-500 to-amber-600',
    hoverShadow: 'hover:shadow-amber-500/10 hover:border-amber-200',
  },
  tiktok_shop: {
    color: '#000000',
    bgColor: 'bg-slate-100',
    icon: <ShoppingBag className="w-5 h-5" />,
    gradient: 'from-slate-500 to-slate-600',
    hoverShadow: 'hover:shadow-slate-500/10 hover:border-slate-200',
  },
  shein: {
    color: '#FF3366',
    bgColor: 'bg-pink-100',
    icon: <ShoppingBag className="w-5 h-5" />,
    gradient: 'from-pink-500 to-pink-600',
    hoverShadow: 'hover:shadow-pink-500/10 hover:border-pink-200',
  },
  aliexpress: {
    color: '#FF4400',
    bgColor: 'bg-red-100',
    icon: <ShoppingBag className="w-5 h-5" />,
    gradient: 'from-red-500 to-red-600',
    hoverShadow: 'hover:shadow-red-500/10 hover:border-red-200',
  },
};

const DEFAULT_STYLE = MARKETPLACE_STYLES.shopee;

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onGenerateOffer,
  onAddToQueue,
}) => {
  const style = MARKETPLACE_STYLES[product.marketplace] || DEFAULT_STYLE;
  
  const currentPriceFormatted = product.currentPrice !== null && product.currentPrice !== undefined
    ? product.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Confira no link';

  const originalPriceFormatted = product.originalPrice !== null && product.originalPrice !== undefined
    ? product.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  const commissionValueFormatted = product.privateCommission?.estimatedValue !== null && product.privateCommission?.estimatedValue !== undefined
    ? product.privateCommission.estimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

  const discount = product.discountPercentage ?? 0;
  const hasOriginalPrice = originalPriceFormatted && product.currentPrice !== null && product.originalPrice !== null && product.originalPrice > product.currentPrice;

  return (
    <div className={`group bg-white/80 backdrop-blur-md rounded-3xl p-3.5 sm:p-4 border border-white/80 shadow-sm shadow-slate-200/50 ${style.hoverShadow} transition-all duration-300 flex flex-col justify-between`}>
      
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden mb-3 border border-slate-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-black text-white shadow-md ${style.bgColor.replace('bg-', 'bg-').replace('100', '600')} shadow-${style.color.replace('#', '').slice(0, 6)}/30`}>
            {discount}% OFF
          </span>
        </div>

        {/* Marketplace Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`px-2 py-1 rounded-xl text-[10px] font-black text-white shadow-md ${style.bgColor.replace('bg-', 'bg-').replace('100', '600')}`}>
            {product.marketplace === 'mercado_livre' ? 'MERCADO LIVRE' : product.marketplace.toUpperCase()}
          </span>
        </div>

        {product.isFlashSale && (
          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-1 rounded-xl text-[10px] font-black bg-violet-600 text-white shadow-md">
              RELÂMPAGO
            </span>
          </div>
        )}

        {/* Free Shipping Tag */}
        {product.isFreeShipping && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/90 text-white flex items-center gap-1 shadow-xs">
              <Truck className="w-3 h-3" />
              Frete Grátis
            </span>
          </div>
        )}

        {/* Offer Score Badge */}
        {product.offerScore !== null && (
          <div className="absolute bottom-2 right-2">
            <span className={`px-2 py-1 rounded-xl text-[10px] font-black shadow-md ${
              product.offerScore >= 8.5 ? 'bg-emerald-600 text-white' :
              product.offerScore >= 7 ? 'bg-blue-600 text-white' :
              'bg-slate-600 text-white'
            }`}>
              <Award className="w-3 h-3 inline mr-0.5" />
              Score: {product.offerScore}/10
            </span>
          </div>
        )}
      </div>

      {/* Product Info & Content */}
      <div className="flex-1 flex flex-col justify-between space-y-3">
        
        {/* Name & Rating */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className={`text-slate-500 font-medium truncate max-w-[120px] ${style.bgColor} px-2 py-0.5 rounded-full text-[10px]`}>
              {style.icon}
              {product.category || product.marketplace}
            </span>
            <div className="flex items-center gap-0.5 text-amber-500 font-semibold">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{typeof product.rating === 'number' ? product.rating.toFixed(1) : '—'}</span>
            </div>
          </div>

          <h3 
            className={`font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.5rem] transition-colors ${style.color.replace('#', 'text-')}`}
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Price Section */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 line-through">
              {originalPriceFormatted || 'Preço promocional'}
            </span>
            {hasOriginalPrice && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                Economize {(product.originalPrice! - product.currentPrice!).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </div>
          <div className={`text-base sm:text-xl font-black tracking-tight ${style.color.replace('#', 'text-')}`}>
            {currentPriceFormatted}
          </div>
        </div>

        {/* Seller Reputation */}
        {product.sellerReputation !== null && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-medium text-slate-700 truncate">{product.sellerName || 'Vendedor'}</span>
            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {Math.round(product.sellerReputation * 100)}% rep.
            </span>
          </div>
        )}

        {/* PRIVATE COMMISSION PILL */}
        <div className="p-2 sm:p-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-1.5 text-emerald-800">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold truncate">
            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-black">
              $
            </div>
            <span>Sua comissão:</span>
          </div>
          <span className="text-xs sm:text-sm font-black text-emerald-700 shrink-0">
            {commissionValueFormatted}
          </span>
        </div>

        {/* Primary Action: Divulgar / Gerar oferta */}
        <div className="pt-1 space-y-1.5">
          <button
            onClick={() => onGenerateOffer(product)}
            className={`w-full py-2.5 px-3 bg-gradient-to-r ${style.gradient} hover:from-${style.color.replace('#', '')} hover:to-${style.color.replace('#', '')} active:scale-[0.98] text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-${style.color.replace('#', '')}/25 hover:shadow-${style.color.replace('#', '')}/35 flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
          >
            <Zap className="w-4 h-4" />
            <span>Divulgar</span>
          </button>
          {onAddToQueue && <button type="button" onClick={() => onAddToQueue(product)} className="w-full rounded-2xl border border-orange-300 bg-orange-50/80 py-2 text-xs font-black text-orange-700 hover:bg-orange-100">＋ Jogar na fila</button>}

          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <span>Ver no {product.marketplace === 'mercado_livre' ? 'Mercado Livre' : product.marketplace.charAt(0).toUpperCase() + product.marketplace.slice(1)}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
};
