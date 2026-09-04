import React from 'react';
import { BarChart3, Bell, Boxes, FileText, LayoutDashboard, PlugZap, Send, Settings, Users, WandSparkles } from 'lucide-react';

interface DesktopSidebarProps {
  onOverview: () => void;
  onGroups: () => void;
  onSettings: () => void;
  onNotifications: () => void;
  onAnalytics: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ onOverview, onGroups, onSettings, onNotifications, onAnalytics }) => {
  const items = [
    ['Visão geral', LayoutDashboard, onOverview],
    ['Garimpar ofertas', WandSparkles, onOverview],
    ['Disparar grupos', Send, onGroups],
    ['Ofertas / fila', Boxes, onOverview],
    ['Templates e páginas', FileText, onOverview],
    ['Meus grupos', Users, onGroups],
    ['Extensão', PlugZap, onOverview],
    ['Analytics', BarChart3, onAnalytics],
  ] as const;
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-xl lg:block">
    <div className="mb-7 flex items-center gap-2 px-2"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EE4D2D] text-xl text-white">📡</div><div><div className="text-sm font-black text-slate-900">Radar de Oferta</div><div className="text-[10px] font-semibold text-slate-500">Painel de afiliados</div></div></div>
    <nav className="space-y-1">{items.map(([label, Icon, action]) => <button key={label} type="button" onClick={action} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 transition hover:bg-orange-50 hover:text-[#EE4D2D]"><Icon className="h-4 w-4" />{label}</button>)}</nav>
    <div className="mt-8 border-t border-slate-100 pt-4"><button type="button" onClick={onNotifications} className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D]"><Bell className="h-4 w-4" />Notificações</button><button type="button" onClick={onSettings} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-[#EE4D2D]"><Settings className="h-4 w-4" />Configurações</button></div>
  </aside>;
};
