"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { LayoutDashboard, Sparkles, Send, Package, Users, MoreHorizontal } from "lucide-react";

type MainNavTab = 'home' | 'products' | 'dispatch' | 'groups' | 'config' | 'whatsapp';

interface MobileBottomNavProps {
  activeNav: MainNavTab;
  onSelectNav: (nav: MainNavTab) => void;
  className?: string;
}

const navItems = [
  { nav: 'home' as MainNavTab, label: "Início", icon: LayoutDashboard },
  { nav: 'products' as MainNavTab, label: "Garimpar", icon: Sparkles },
  { nav: 'dispatch' as MainNavTab, label: "Disparar", icon: Send },
  { nav: 'groups' as MainNavTab, label: "Fila", icon: Package },
  { nav: 'groups' as MainNavTab, label: "Grupos", icon: Users },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeNav, onSelectNav, className }) => {
  return (
    <nav className={cn("fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-2 safe-bottom lg:hidden", className)}>
      {navItems.map((item) => {
        const isActive = activeNav === item.nav;
        return (
          <Button
            key={item.label}
            type="button"
            onClick={() => onSelectNav(item.nav)}
            variant={isActive ? "default" : "ghost"}
            size="icon"
            className={cn("h-12 w-12 rounded-xl gap-1", isActive ? "text-primary" : "text-muted-foreground")}
            aria-label={item.label}
          >
            <item.icon className="h-6 w-6" aria-hidden="true" />
            <span className="hidden"> </span>
          </Button>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-xl"
        aria-label="Mais opções"
      >
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </nav>
  );
};

export default MobileBottomNav;