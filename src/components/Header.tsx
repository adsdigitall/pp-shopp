import React from 'react';
import { Search, Settings, Bell, Link2, X, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  whatsappConnected?: boolean;
  onOpenWhatsApp?: () => void;
  variant?: 'default' | 'garimpar';
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenNotifications,
  whatsappConnected = false,
  onOpenWhatsApp,
  variant = 'default',
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/92 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex min-h-[56px] items-center justify-between gap-2 sm:min-h-[64px] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary)] text-white shadow-lg shadow-orange-950/35 sm:h-10 sm:w-10 sm:rounded-xl">
              <Link2 className="h-5 w-5 stroke-[2.4] sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="truncate text-lg font-black leading-tight tracking-tight text-[var(--text-primary)]">
                Radar <span className="text-[var(--primary)]">de Oferta</span>
              </h1>
              <p className="truncate text-[10px] font-medium text-[var(--text-secondary)]">Divulgue fácil e ganhe comissão</p>
            </div>
          </div>

          <div className={`${variant === 'garimpar' ? 'hidden' : 'hidden md:flex'} flex-1 max-w-md mx-3`}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar produto para divulgar..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-9 pr-9 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all focus:border-[var(--primary)] focus:bg-[var(--surface-elevated)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {variant === 'garimpar' ? (
              <button type="button" onClick={onOpenSettings} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]" aria-label="Filtros"><SlidersHorizontal className="h-5 w-5" /></button>
            ) : (
              <>
                <button onClick={onOpenNotifications} className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]" title="Notificações" aria-label="Notificações"><Bell className="h-4.5 w-4.5" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--primary)] ring-1.5 ring-[var(--surface)]" /></button>
                <button onClick={onOpenSettings} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)]" title="Configurações" aria-label="Configurações"><Settings className="h-4.5 w-4.5" /></button>
              </>
            )}
          </div>
        </div>

        <div className={`${variant === 'garimpar' ? 'hidden' : 'pb-2 md:hidden'}`}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar produtos em alta..." className="w-full pl-9 pr-10 py-2.5 text-sm bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] rounded-xl border border-[var(--border)] focus:border-[var(--primary)] outline-none" />
            {searchQuery && <button onClick={() => onSearchChange('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center border-l border-[var(--border)] pl-3 text-[var(--text-secondary)]"><SlidersHorizontal className="h-3.5 w-3.5" /></span>
          </div>
        </div>
      </div>
    </header>
  );
};