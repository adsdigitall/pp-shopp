"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/DropdownMenu";
import { Badge } from "@/components/ui/Badge";
import { Search, Bell, Settings, User, LogOut, ChevronDown, Moon, Sun, Monitor, ChevronDown as ChevronDownIcon } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
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
  whatsappConnected = false,
  onOpenWhatsApp,
  variant = 'default',
  user,
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={cn("sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur-xl", className)}>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex min-h-[56px] items-center justify-between gap-2 sm:min-h-[64px] sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-lg shadow-orange-950/35 sm:h-10 sm:w-10 sm:rounded-xl">
              <svg className="h-5 w-5 stroke-[2.4] sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="truncate text-lg font-black leading-tight tracking-tight text-foreground">
                Radar <span className="text-primary">de Oferta</span>
              </h1>
              <p className="truncate text-[10px] font-medium text-muted-foreground">
                Divulgue fácil e ganhe comissão
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
                className="w-full rounded-xl border border-border bg-muted/50 py-1.5 pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
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
              <button type="button" onClick={onOpenSettings} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-muted text-muted-foreground transition hover:border-primary hover:text-foreground" aria-label="Filtros">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            ) : (
              <>
                <button onClick={onOpenNotifications} className="relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-muted text-foreground transition-all hover:border-primary hover:text-foreground" title="Notificações" aria-label="Notificações">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-1.5 ring-background" />
                </button>
                <button onClick={onOpenSettings} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-muted text-foreground transition-all hover:border-primary hover:text-foreground" title="Configurações" aria-label="Configurações">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`${variant === 'garimpar' ? 'hidden' : 'pb-2 md:hidden'}`}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar produtos em alta..." className="w-full pl-9 pr-10 py-2.5 text-sm bg-muted text-foreground placeholder:text-muted-foreground rounded-xl border border-border focus:border-primary outline-none" />
            {searchQuery && <button onClick={() => onSearchChange('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center border-l border-border pl-3 text-muted-foreground"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg></span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
