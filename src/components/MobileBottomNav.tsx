import React from 'react';
import { FilterType } from '../types/product';
import { Flame, TrendingUp, DollarSign, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeFilter,
  onSelectFilter,
  onOpenSettings,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 safe-bottom">
      <div className="grid grid-cols-4 h-14">
        
        {/* Em alta */}
        <button
          onClick={() => onSelectFilter('trending')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeFilter === 'trending' ? 'text-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px] font-bold">Em alta</span>
        </button>

        {/* Mais vendidos */}
        <button
          onClick={() => onSelectFilter('top_sales')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeFilter === 'top_sales' ? 'text-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-bold">Vendidos</span>
        </button>

        {/* Maior comissão */}
        <button
          onClick={() => onSelectFilter('high_commission')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeFilter === 'high_commission' ? 'text-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px] font-bold">Comissão</span>
        </button>

        {/* Configurações */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Ajustes</span>
        </button>

      </div>
    </nav>
  );
};
