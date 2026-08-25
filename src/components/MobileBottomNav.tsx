import React from 'react';
import { Home, ShoppingBag, Users, Settings } from 'lucide-react';

export type MainNavTab = 'home' | 'products' | 'groups' | 'config';

interface MobileBottomNavProps {
  activeNav: MainNavTab;
  onSelectNav: (nav: MainNavTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onSelectNav,
}) => {
  const navItems = [
    { id: 'home' as MainNavTab, label: 'Início', icon: <Home className="w-5 h-5" /> },
    { id: 'products' as MainNavTab, label: 'Produtos', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'groups' as MainNavTab, label: 'Grupos', icon: <Users className="w-5 h-5" /> },
    { id: 'config' as MainNavTab, label: 'Config', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`flex flex-col items-center justify-center gap-1 relative transition-colors cursor-pointer ${
                isActive ? 'text-[#EE4D2D]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Top orange active indicator pill */}
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-[#EE4D2D] rounded-b-full shadow-xs" />
              )}
              {item.icon}
              <span className={`text-[11px] ${isActive ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
