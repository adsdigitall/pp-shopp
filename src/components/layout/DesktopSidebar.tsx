"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Separator } from "@/components/ui/Separator";
import { Badge } from "@/components/ui/Badge";
import {
  LayoutDashboard,
  Sparkles,
  Send,
  Package,
  FileText,
  GitBranch,
  Users,
  BarChart2,
  PlugZap,
  Settings,
  BookOpen,
  LifeBuoy,
  MessageSquare,
  ShoppingBag,
  Bell,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthGate";

type SectionId = 
  | 'visao-geral' 
  | 'garimpar' 
  | 'disparar' 
  | 'fila' 
  | 'ofertas'
  | 'paginas' 
  | 'templates'
  | 'espelhamento' 
  | 'grupos' 
  | 'metricas' 
  | 'extensao' 
  | 'configuracoes'
  | 'tutoriais'
  | 'suporte'
  | 'whatsapp';

interface DesktopSidebarProps {
  activeSection: SectionId;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onNavigate: (section: SectionId) => void;
  onDispatch: () => void;
  onGroups: () => void;
  onSettings: () => void;
  onNotifications: () => void;
  onAnalytics: () => void;
  className?: string;
}

const navigation = [
  { key: "main", label: "Principal", items: [{ href: "/visao-geral", label: "Início", icon: LayoutDashboard }] },
  {
    key: "core",
    label: "Operação",
    items: [
      { href: "/garimpar", label: "Garimpar", icon: Sparkles },
      { href: "/disparar", label: "Disparar", icon: Send },
      { href: "/fila", label: "Fila", icon: Package },
      { href: "/paginas", label: "Páginas", icon: FileText },
      { href: "/espelhamento", label: "Espelhar", icon: GitBranch },
    ],
  },
  {
    key: "channels",
    label: "Canais",
    items: [
      { href: "/grupos", label: "Grupos", icon: Users },
      { href: "/metricas", label: "Métricas", icon: BarChart2 },
      { href: "/extensao", label: "Extensão", icon: PlugZap },
    ],
  },
];

const bottomItems = [
  { href: "/tutoriais", label: "Tutoriais", icon: BookOpen },
  { href: "/suporte", label: "Suporte", icon: LifeBuoy },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function DesktopSidebar({
  activeSection,
  mobileOpen,
  onToggleMobile,
  onNavigate,
  onDispatch,
  onGroups,
  onSettings,
  onNotifications,
  onAnalytics,
  className,
}: DesktopSidebarProps) {
  const normalizeSection = (section: string) => section.replace(/^\/+/, '') as SectionId;

  const { user, logout } = useAuth();
  const accountName = user?.email ?? "Minha conta";
  const accountInitials = accountName.slice(0, 2).toUpperCase();

  const handleClick = (section: SectionId) => {
    onNavigate(normalizeSection(section));
  };

  const renderItem = (section: SectionId) => {
    const config: Record<SectionId, { label: string; icon: React.ElementType }> = {
      'visao-geral': { label: 'Início', icon: LayoutDashboard },
      'garimpar': { label: 'Garimpar', icon: Sparkles },
      'disparar': { label: 'Disparar', icon: Send },
      'fila': { label: 'Fila', icon: Package },
      'ofertas': { label: 'Fila', icon: Package },
      'paginas': { label: 'Páginas', icon: FileText },
      'templates': { label: 'Templates', icon: FileText },
      'espelhamento': { label: 'Espelhar', icon: GitBranch },
      'grupos': { label: 'Grupos', icon: Users },
      'metricas': { label: 'Métricas', icon: BarChart2 },
      'extensao': { label: 'Extensão', icon: PlugZap },
      'configuracoes': { label: 'Config', icon: Settings },
      'tutoriais': { label: 'Tutoriais', icon: BookOpen },
      'suporte': { label: 'Suporte', icon: LifeBuoy },
      'whatsapp': { label: 'WhatsApp', icon: MessageSquare },
    };
    
    const { label, icon: Icon } = config[section];
    const isActive = activeSection === section;
    return (
      <button
        key={section}
        type="button"
        onClick={() => handleClick(section)}
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm before:absolute before:left-0 before:h-6 before:w-0.5 before:bg-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")} />
        {label}
      </button>
    );
  };

  const itemClass = (isActive: boolean) =>
    cn(
      "group relative flex h-[42px] w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors duration-150",
      isActive
        ? "border-[var(--border-brand)] bg-[var(--surface-active)] font-semibold text-[var(--brand-400)]"
        : "border-transparent font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-title)]",
    );
  const iconClass = (isActive: boolean) =>
    cn("h-[18px] w-[18px] shrink-0", isActive ? "text-[var(--brand-500)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-title)]");

  return (
    <>
      {mobileOpen && (
        <button type="button" aria-label="Fechar navegação" onClick={onToggleMobile} className="fixed inset-0 z-40 bg-[var(--surface-scrim)] backdrop-blur-sm md:hidden" />
      )}
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label="Abrir navegação"
        className="fixed left-2 top-14 z-40 grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card-raised)] text-[var(--text-title)] shadow-lg md:hidden"
      >
        ☰
      </button>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-sidebar)] px-3 py-3 text-[var(--text-body)]",
          mobileOpen ? "flex" : "hidden",
          "md:flex",
          className
        )}
      >
        <div className="flex items-center gap-2.5 px-2 pb-3 pt-1">
          <img src="/brand/logo-mark-alpha.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold leading-tight text-[var(--text-title)]">
              <span className="text-[var(--brand-500)]">Radar</span> de Oferta
            </div>
            <div className="truncate text-[11px] text-[var(--text-muted)]">Automação para Afiliados</div>
          </div>
        </div>
        <div className="border-t border-[var(--border-subtle)]" />
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-2">
          {navigation.map((group, groupIndex) => (
            <div key={group.key} className={groupIndex > 0 ? "pt-2" : ""}>
              <p className="px-2 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                {group.label}
              </p>
              <div className="space-y-[3px]">
                {group.items.map((item) => {
                  const isActive = activeSection === normalizeSection(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => handleClick(normalizeSection(item.href))}
                      className={itemClass(isActive)}
                    >
                      <item.icon className={iconClass(isActive)} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-auto space-y-[3px] border-t border-[var(--border-subtle)] pt-2">
            {bottomItems.map((item) => {
              const isActive = activeSection === normalizeSection(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleClick(normalizeSection(item.href))}
                  className={itemClass(isActive)}
                >
                  <item.icon className={iconClass(isActive)} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="mt-2 flex items-center gap-2.5 border-t border-[var(--border-subtle)] px-1 pt-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-brand)] text-xs font-extrabold text-white">
            {accountInitials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[var(--text-title)]" title={accountName}>
              {accountName}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Afiliado Pro
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-title)]"
            onClick={onNotifications}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--red-400)]"
            onClick={() => { void logout(); }}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    </>
  );
}
