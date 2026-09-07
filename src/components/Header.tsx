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
    <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-0)]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 lg:px-5">
        <div className="flex min-h-[52px] items-center justify-between gap-2 sm:min-h-[56px] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white shadow-[0_4px_12px_-4px_color-mix(in_srgb,_var(--brand-primary)_50%,_transparent)] sm:h-9 sm:w-9 sm:rounded-xl">
              <Link2 className="h-4.5 w-4.5 stroke-[2.4] sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="truncate text-base font-black leading-tight tracking-tight text-[var(--text-primary)]">
                Radar <span className="text-[var(--brand-primary)]">de Oferta</span>
              </h1>
              <p className="truncate text-[9px] font-medium text-[var(--text-secondary)]">
                Divulgue fácil e ganhe comissão
              </p>
            </div>
          </div>

          <div className={`${variant === 'garimpar' ? 'hidden' : 'hidden md:flex'} flex-1 max-w-md mx-3`}>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar produto para divulgar..."
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] py-1.5 pl-9 pr-9 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--brand-primary)] focus:bg-[var(--surface-0)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {variant === 'garimpar' ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="btn-icon-primary"
                aria-label="Filtros"
              >
                <SlidersHorizontal className="h-4.5 w-4.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenNotifications}
                  className="relative btn-icon"
                  title="Notificações"
                  aria-label="Notificações"
                >
                  <Bell className="h-4.5 w-4.5" />
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)] ring-1.5 ring-[var(--surface-0)] animate-pulse" />
                </button>
                <button
                  onClick={onOpenSettings}
                  className="btn-icon"
                  title="Configurações"
                  aria-label="Configurações"
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`${variant === 'garimpar' ? 'hidden' : 'pb-2 md:hidden'}`}>
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar produtos em alta..."
              className="w-full pl-9 pr-10 py-2 text-sm bg-[var(--surface-1)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg border border-[var(--border-default)] focus:border-[var(--brand-primary)] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="pointer-events-none absolute inset-y-0 right-9 flex items-center border-l border-[var(--border-default)] pl-3 text-[var(--text-muted)]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;