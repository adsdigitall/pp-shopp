"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Diamond,
  Send,
  List,
  MoreHorizontal,
  Users,
  MessageCircle,
  BarChart3,
  Store,
  Copy,
  Puzzle,
  Settings,
  GraduationCap,
  LifeBuoy,
  X,
  type LucideIcon,
} from "lucide-react";

export type MainNavTab = 'home' | 'products' | 'dispatch' | 'queue' | 'groups' | 'config' | 'whatsapp';

export type MoreSheetSection =
  | 'grupos' | 'whatsapp' | 'metricas' | 'paginas' | 'espelhamento'
  | 'extensao' | 'configuracoes' | 'tutoriais' | 'suporte';

interface MobileBottomNavProps {
  activeNav: MainNavTab;
  onSelectNav: (nav: MainNavTab) => void;
  onNavigateSection?: (section: MoreSheetSection) => void;
  activeSection?: string;
  className?: string;
}

const tabs: { nav: MainNavTab | 'more'; label: string; icon: LucideIcon; center?: boolean }[] = [
  { nav: 'home', label: "Início", icon: LayoutDashboard },
  { nav: 'products', label: "Garimpar", icon: Diamond },
  { nav: 'dispatch', label: "Disparar", icon: Send, center: true },
  { nav: 'queue', label: "Fila", icon: List },
  { nav: 'more', label: "Mais", icon: MoreHorizontal },
];

const sheetItems: { section: MoreSheetSection; label: string; icon: LucideIcon }[] = [
  { section: 'grupos', label: "Grupos", icon: Users },
  { section: 'whatsapp', label: "WhatsApp", icon: MessageCircle },
  { section: 'metricas', label: "Métricas", icon: BarChart3 },
  { section: 'paginas', label: "Páginas", icon: Store },
  { section: 'espelhamento', label: "Espelhamento", icon: Copy },
  { section: 'extensao', label: "Extensão", icon: Puzzle },
  { section: 'configuracoes', label: "Configurações", icon: Settings },
  { section: 'tutoriais', label: "Tutoriais", icon: GraduationCap },
  { section: 'suporte', label: "Suporte", icon: LifeBuoy },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onSelectNav,
  onNavigateSection,
  activeSection,
  className,
}) => {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const openSection = (section: MoreSheetSection) => {
    setSheetOpen(false);
    onNavigateSection?.(section);
  };

  return (
    <>
      <nav className={cn("mobile-bottom-nav lg:hidden", className)}>
        <div className="mobile-bottom-nav-pill mx-auto grid h-[68px] grid-cols-5 px-2 pb-1 pt-1.5">
          {tabs.map((item) => {
            if (item.nav === 'more') {
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  aria-label="Mais opções"
                  aria-expanded={sheetOpen}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl transition-colors",
                    sheetOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </button>
              );
            }
            const isActive = activeNav === item.nav;
            if (item.center) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSelectNav(item.nav as MainNavTab)}
                  aria-label={item.label}
                  className="relative flex flex-col items-center justify-start gap-1"
                >
                  <span className="btn-brand -mt-7 grid h-[52px] w-[52px] place-items-center rounded-2xl text-white">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className={cn("text-[10px]", isActive ? "font-black text-primary" : "font-semibold text-muted-foreground")}>{item.label}</span>
                </button>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelectNav(item.nav as MainNavTab)}
                aria-label={item.label}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && <span className="absolute top-0.5 h-1 w-1 rounded-full bg-primary" />}
                <item.icon className="h-6 w-6" aria-hidden="true" />
                <span className={cn("text-[10px]", isActive ? "font-black" : "font-semibold")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-border bg-background px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-2 safe-bottom">
            <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full bg-border" />
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black text-foreground">Mais opções</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {sheetItems.map((item) => {
                const isActive = activeSection === item.section;
                return (
                  <button
                    key={item.section}
                    type="button"
                    onClick={() => openSection(item.section)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-3.5 transition",
                      isActive
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground active:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
