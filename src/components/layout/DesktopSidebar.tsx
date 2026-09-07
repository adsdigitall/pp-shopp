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
} from "lucide-react";

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

  return (
    <>
      {mobileOpen && (
        <button type="button" aria-label="Fechar navegação" onClick={onToggleMobile} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />
      )}
      <button
        type="button"
        onClick={onToggleMobile}
        aria-label="Abrir navegação"
        className="fixed left-2 top-14 z-40 grid h-9 w-9 place-items-center rounded-lg bg-sidebar text-sidebar-foreground shadow-lg border border-sidebar-border md:hidden"
      >
        ☰
      </button>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-sidebar-border bg-sidebar px-2 py-3 text-sidebar-foreground",
          mobileOpen ? "flex" : "hidden",
          "md:flex",
          className
        )}
      >
        <div className="flex items-center gap-2 px-1 pb-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-sm">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black">
              <span className="text-primary">Radar</span>{' '}
              <span className="text-sidebar-foreground">de Oferta</span>
            </div>
            <div className="truncate text-[8px] font-medium text-sidebar-foreground/60">Painel de afiliados</div>
          </div>
        </div>
        <div className="border-t border-sidebar-border" />
        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-2">
          {navigation.map((group, groupIndex) => (
            <div key={group.key} className={groupIndex > 0 ? "pt-4 border-t border-sidebar-border" : ""}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => handleClick(normalizeSection(item.href))}
                    className={cn(
                      "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all duration-200",
                      activeSection === normalizeSection(item.href)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm before:absolute before:left-0 before:h-6 before:w-0.5 before:bg-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", activeSection === normalizeSection(item.href) ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-auto space-y-0.5 border-t border-sidebar-border pt-2">
            {bottomItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => handleClick(normalizeSection(item.href))}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all duration-200",
                  activeSection === normalizeSection(item.href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm before:absolute before:left-0 before:h-6 before:w-0.5 before:bg-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", activeSection === normalizeSection(item.href) ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground")} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
        <div className="mt-2 flex items-center gap-2 border-t border-sidebar-border px-1 pt-3">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-black text-white">
            CM
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-bold text-sidebar-foreground">
              Carolina de assunção macedo
            </div>
            <div className="text-[8px] font-semibold text-primary">
              PRO · Afiliado Viral
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={onNotifications}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </aside>
    </>
  );
}
