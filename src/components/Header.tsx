import React from 'react';
import { Search, Settings, Bell, Link2, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenNotifications,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Bar */}
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Logo & Slogan (Matching reference image) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#FF7A00] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Link2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight leading-tight">
                ShopLink <span className="text-[#EE4D2D]">Afiliados</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Divulgue fácil e ganhe comissão
              </p>
            </div>
          </div>

          {/* Search bar on desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar produto para divulgar..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-100/90 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl border border-slate-200 focus:border-[#EE4D2D] focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Icons: Bell & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Notifications with badge */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2.5 text-slate-700 hover:text-[#EE4D2D] hover:bg-orange-50 active:bg-orange-100 rounded-2xl border border-slate-200/80 transition-all cursor-pointer"
              title="Notificações & Alertas"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#EE4D2D] ring-2 ring-white animate-pulse" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 text-slate-700 hover:text-[#EE4D2D] hover:bg-orange-50 active:bg-orange-100 rounded-2xl border border-slate-200/80 transition-all cursor-pointer"
              title="Configurações do Afiliado"
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 md:hidden">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar produtos em alta..."
              className="w-full pl-10 pr-9 py-2 text-xs bg-slate-100/90 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-[#EE4D2D] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
