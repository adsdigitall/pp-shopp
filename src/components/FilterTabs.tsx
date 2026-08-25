import React from 'react';
import { FilterType } from '../types/product';
import { Flame, TrendingUp, DollarSign, Percent } from 'lucide-react';

interface FilterTabsProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  resultCount: number;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onSelectFilter,
  resultCount,
}) => {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'trending', label: 'Em alta', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'top_sales', label: 'Mais vendidos', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'high_commission', label: 'Maior comissão', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'high_discount', label: 'Maior desconto', icon: <Percent className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3 pt-1">
      {/* Title & Subtitle matching the reference */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Produtos em alta
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Toque em um produto para divulgar
          </p>
        </div>

        <span className="text-[11px] font-bold text-slate-400">
          {resultCount} produtos disponíveis
        </span>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        {filters.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-sm shadow-orange-500/25'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
