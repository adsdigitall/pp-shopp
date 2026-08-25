import React from 'react';
import { FilterType } from '../types/product';
import { Flame, TrendingUp, DollarSign, Percent } from 'lucide-react';

interface FilterTabsProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  resultCount: number;
}

interface FilterOption {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onSelectFilter,
  resultCount,
}) => {
  const filters: FilterOption[] = [
    {
      id: 'trending',
      label: 'Em alta',
      icon: <Flame className="w-4 h-4" />,
      description: 'Produtos com alto engajamento',
    },
    {
      id: 'top_sales',
      label: 'Mais vendidos',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Recordistas de vendas no app',
    },
    {
      id: 'high_commission',
      label: 'Maior comissão',
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Maior ganho estimado por venda',
    },
    {
      id: 'high_discount',
      label: 'Maior desconto',
      icon: <Percent className="w-4 h-4" />,
      description: 'Maiores reduções de preço %',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Title & Count Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Produtos em alta
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#EE4D2D]">
              {resultCount} {resultCount === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Selecione produtos para conferir sua comissão privada e gerar ofertas para compartilhar.
          </p>
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {filters.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectFilter(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-md shadow-orange-500/25 ring-2 ring-orange-200'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-slate-500'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
