import React from 'react';
import { Home, Send, Users, Settings, Zap, MessageSquare } from 'lucide-react';

export type MainNavTab = 'home' | 'products' | 'dispatch' | 'groups' | 'config' | 'whatsapp';

interface MobileBottomNavProps {
  activeNav: MainNavTab;
  onSelectNav: (nav: MainNavTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onSelectNav,
}) => {
  const navItems = [
    { id: 'home' as MainNavTab, label: 'Início', icon: <Home className="w-4.5 h-4.5" /> },
    { id: 'products' as MainNavTab, label: 'Garimpar', icon: <Zap className="w-4.5 h-4.5" /> },
    { id: 'dispatch' as MainNavTab, label: 'Disparar', icon: <Send className="h-5 w-5" /> },
    { id: 'whatsapp' as MainNavTab, label: 'WhatsApp', icon: <MessageSquare className="w-4.5 h-4.5" /> },
    { id: 'groups' as MainNavTab, label: 'Grupos', icon: <Users className="w-4.5 h-4.5" /> },
    { id: 'config' as MainNavTab, label: 'Config', icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl safe-bottom md:hidden">
      <div className="mx-auto grid h-11 max-w-md grid-cols-6 gap-0.5 px-1.5 py-1">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`pressable focusable relative flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && item.id !== 'dispatch' && <div className="absolute bottom-0 h-1 w-1 rounded-full bg-[var(--primary)]" />}
              <span className={item.id === 'dispatch' ? '-mt-6 grid h-12 w-12 place-items-center rounded-full bg-[var(--primary)] text-white shadow-[0_8px_20px_rgba(255,90,54,.35)]' : ''}>{item.icon}</span>
              <span className={`text-[9px] ${isActive ? 'font-black' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};