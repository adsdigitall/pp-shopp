import React from 'react';
import { Search, Settings, Sparkles, X, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenSettings: () => void;
  totalProducts?: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#FF5722] via-[#EE4D2D] to-[#FF7A00] flex items-center justify-center text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-100">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  Shopp<span className="text-[#EE4D2D]">Afiliado</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#EE4D2D] border border-orange-200 uppercase tracking-wide">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Gerador de Ofertas & Painel Privado
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar produtos, categorias ou termos..."
                className="w-full pl-10 pr-9 py-2 sm:py-2.5 text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200/80 focus:border-[#EE4D2D] focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Actions / Settings */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Private Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Painel Privado Ativo</span>
            </div>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              className="p-2 sm:p-2.5 text-slate-600 hover:text-[#EE4D2D] hover:bg-orange-50 active:bg-orange-100 rounded-xl border border-slate-200 hover:border-orange-200 transition-colors flex items-center gap-2 cursor-pointer"
              title="Configurações de Afiliado"
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden lg:inline text-xs font-medium">Configurações</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
