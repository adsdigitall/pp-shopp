import React from 'react';
import { Product } from '../types/product';
import { Star, Flame, ExternalLink, Sparkles, Lock, Truck } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onGenerateOffer: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onGenerateOffer,
}) => {
  const currentPriceFormatted = product.currentPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const originalPriceFormatted = product.originalPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const commissionValueFormatted = product.privateCommission.estimatedValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/90 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#EE4D2D] text-white shadow-md shadow-orange-600/30 tracking-tight">
            -{product.discountPercentage}% OFF
          </span>
          {product.isHot && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3 fill-white" />
              EM ALTA
            </span>
          )}
        </div>

        {/* Free shipping badge if available */}
        {product.isFreeShipping && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-600/90 backdrop-blur-xs text-white flex items-center gap-1 shadow-xs">
              <Truck className="w-3 h-3" />
              Frete Grátis
            </span>
          </div>
        )}

        {/* Category Tag */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-900/60 backdrop-blur-md text-white">
            {product.category}
          </span>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        
        {/* Name & Ratings */}
        <div className="space-y-2">
          {/* Social Proof (Rating & Sales) */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
            </div>
            <span className="font-medium text-slate-500">
              {product.salesCountText}
            </span>
          </div>

          {/* Product Title */}
          <h3 
            className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 hover:text-[#EE4D2D] transition-colors" 
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Pricing Section */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400 line-through">
              {originalPriceFormatted}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              Economia de {(product.originalPrice - product.currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {currentPriceFormatted}
          </div>
        </div>

        {/* PRIVATE COMMISSION AREA (Owner Only) */}
        <div className="p-3 bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/90 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Área Privada • Seu Ganho</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">
              {product.privateCommission.percentage}% Comissão
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-600 font-medium">Ganho estimado:</span>
            <span className="text-base font-extrabold text-emerald-700">
              + {commissionValueFormatted} <span className="text-[10px] font-medium text-slate-500">/venda</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Primary: Gerar oferta */}
          <button
            onClick={() => onGenerateOffer(product)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-[#FF5722] to-[#EE4D2D] hover:from-[#EE4D2D] hover:to-[#D73211] active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar oferta</span>
          </button>

          {/* Secondary: Ver produto */}
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Ver produto</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>

      </div>
    </div>
  );
};
