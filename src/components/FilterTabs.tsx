import React from 'react';
import { FilterType } from '../types/product';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';

interface FilterTabsProps { activeFilter: FilterType; onSelectFilter: (filter: FilterType) => void; resultCount: number; }

export const FilterTabs: React.FC<FilterTabsProps> = ({ activeFilter, onSelectFilter, resultCount }) => {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'top_sales', label: 'Mais vendidos', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'high_commission', label: 'Maior comissão', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'high_discount', label: 'Com desconto', icon: <Percent className="w-3.5 h-3.5" /> },
  ];
  return <div className="space-y-3 pt-1"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline"><div><h2 className="text-lg font-black tracking-tight text-[var(--text-primary)] sm:text-xl">Produtos em alta</h2><p className="text-xs font-medium text-[var(--text-secondary)]">Toque em um produto para divulgar</p></div><span className="text-[11px] font-bold text-[var(--text-secondary)]">{resultCount} produtos disponíveis</span></div><div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">{filters.map((tab) => { const isActive = activeFilter === tab.id; return <button key={tab.id} type="button" onClick={() => onSelectFilter(tab.id)} className={`pressable focusable flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all ${isActive ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_8px_20px_rgba(255,90,54,.22)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'}`}><span>{tab.icon}</span><span>{tab.label}</span></button>; })}</div></div>;
};
