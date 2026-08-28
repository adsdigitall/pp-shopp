import React from 'react';
import { Product } from '../types/product';
import { Sparkles, DollarSign, ExternalLink, Star, Truck } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onGenerateOffer: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onGenerateOffer,
}) => {
  const currentPriceFormatted = product.currentPrice !== null && product.currentPrice !== undefined
    ? product.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Confira no link';

  const originalPriceFormatted = product.originalPrice !== null && product.originalPrice !== undefined
    ? product.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  const commissionValueFormatted = product.privateCommission?.estimatedValue !== null && product.privateCommission?.estimatedValue !== undefined
    ? product.privateCommission.estimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

  return (
    <div className="group bg-white/80 backdrop-blur-md rounded-3xl p-3.5 sm:p-4 border border-white/80 shadow-sm shadow-slate-200/50 hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-200 transition-all duration-300 flex flex-col justify-between">
      
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden mb-3 border border-slate-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge (Top-left, orange pill like reference) */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-black bg-[#EE4D2D] text-white shadow-md shadow-orange-600/30">
            {product.discountPercentage ?? 0}% OFF
          </span>
        </div>

        {product.isFlashSale && (
          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-1 rounded-xl text-[10px] font-black bg-violet-600 text-white shadow-md">
              RELÂMPAGO
            </span>
          </div>
        )}

        {/* Free Shipping Tag (Bottom-left) */}
        {product.isFreeShipping && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/90 text-white flex items-center gap-1 shadow-xs">
              <Truck className="w-3 h-3" />
              Frete Grátis
            </span>
          </div>
        )}
      </div>

      {/* Product Info & Content */}
      <div className="flex-1 flex flex-col justify-between space-y-3">
        
        {/* Name & Rating */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-slate-500 font-medium truncate max-w-[120px]">
              {product.category || 'Shopee'}
            </span>
            <div className="flex items-center gap-0.5 text-amber-500 font-semibold">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{typeof product.rating === 'number' ? product.rating.toFixed(1) : '—'}</span>
            </div>
          </div>

          <h3 
            className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#EE4D2D] transition-colors"
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
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
              {product.originalPrice !== null && product.originalPrice !== undefined && product.currentPrice !== null && product.currentPrice !== undefined
                ? `Economize ${(product.originalPrice - product.currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                : 'Oferta Shopee'}
            </span>
          </div>
          <div className="text-base sm:text-xl font-black text-[#EE4D2D] tracking-tight">
            {currentPriceFormatted}
          </div>
        </div>

        {/* PRIVATE COMMISSION PILL (Matching the green pill in the reference) */}
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
            className="w-full py-2.5 px-3 bg-gradient-to-r from-[#FF5722] to-[#EE4D2D] hover:from-[#EE4D2D] hover:to-[#D73211] active:scale-[0.98] text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-orange-500/25 hover:shadow-orange-500/35 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Divulgar</span>
          </button>

          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <span>Ver produto original</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
};
