"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { Search, Bell, Settings, User, LogOut, ChevronDown, Moon, Sun, Monitor, Menu, ChevronDown as ChevronDownIcon } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  /** Abre o menu lateral no celular/tablet. */
  onOpenMenu?: () => void;
  /** Há aviso de venda que a pessoa ainda não viu. */
  hasUnreadNotifications?: boolean;
  whatsappConnected?: boolean;
  onOpenWhatsApp?: () => void;
  variant?: 'default' | 'garimpar';
  user?: {
    name: string;
    email: string;
    plan?: string;
    avatar?: string;
  };
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenNotifications,
  onOpenMenu,
  hasUnreadNotifications = false,
  whatsappConnected = false,
  onOpenWhatsApp,
  variant = 'default',
  user,
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
    <header className={cn("sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-app)]/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl", className)}>
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex min-h-[60px] items-center justify-between gap-2 sm:min-h-[64px] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {onOpenMenu && (
              <button type="button" onClick={onOpenMenu} aria-label="Abrir menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-title)] transition-colors hover:border-[var(--border-brand)] lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            )}
            <img src="/brand/logo-mark-alpha.png" alt="" className="h-9 w-9 shrink-0 object-contain lg:hidden" />
            <div className="min-w-0 lg:hidden">
              <h1 className="truncate text-base font-extrabold leading-tight text-[var(--text-title)] min-[375px]:text-lg">
                <span className="text-[var(--brand-500)]">Radar</span> de Oferta
              </h1>
              <p className="truncate text-[11px] text-[var(--text-muted)]">
                Automação para Afiliados
              </p>
            </div>
          </div>

          <div className={`${variant === 'garimpar' ? 'hidden' : 'hidden md:flex'} flex-1 max-w-md mx-3`}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar produto para divulgar..."
                className="h-10 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {variant === 'garimpar' ? (
              <button type="button" onClick={onOpenSettings} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-muted-foreground transition hover:border-primary hover:text-foreground" aria-label="Filtros">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            ) : (
              <>
                <button onClick={onOpenNotifications} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-foreground transition-all hover:border-primary hover:text-foreground" title="Notificações" aria-label="Notificações">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {hasUnreadNotifications && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-1.5 ring-background" />}
                </button>
                <button onClick={onOpenSettings} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-foreground transition-all hover:border-primary hover:text-foreground" title="Configurações" aria-label="Configurações">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

        <div className={cn(variant === 'garimpar' ? 'hidden' : 'px-4 pt-3 md:hidden', className)}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar produtos em alta..." className="h-11 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] pl-9 pr-10 text-sm text-[var(--text-title)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-brand)]" />
            {searchQuery && <button onClick={() => onSearchChange('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center border-l border-border pl-3 text-muted-foreground"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg></span>
          </div>
        </div>
    </>
  );
};

export default Header;
