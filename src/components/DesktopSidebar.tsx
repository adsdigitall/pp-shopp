import React from 'react';
import { Bell, Boxes, BookOpen, FileText, Gauge, LayoutDashboard, LifeBuoy, PlugZap, Radio, Send, Settings, Users, WandSparkles } from 'lucide-react';

interface DesktopSidebarProps {
  activeSection?: string;
  mobileOpen?: boolean;
  onToggleMobile?: () => void;
  onNavigate: (section: string) => void;
  onDispatch: () => void;
  onGroups: () => void;
  onSettings: () => void;
  onNotifications: () => void;
  onAnalytics: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeSection = 'garimpar', mobileOpen = false, onToggleMobile, onNavigate, onDispatch, onGroups, onSettings, onNotifications, onAnalytics }) => {
  const groups = [
    [['Visão geral', LayoutDashboard, 'visao-geral']],
    [['Garimpar ofertas', WandSparkles, 'garimpar'], ['Disparar grupos', Send, 'disparar'], ['Ofertas / fila', Boxes, 'ofertas'], ['Templates e páginas', FileText, 'templates'], ['Extensão', PlugZap, 'extensao']],
    [['Meus grupos', Users, 'grupos'], ['Métricas', Gauge, 'metricas']],
  ] as const;
  const actions: Record<string, () => void> = { 'visao-geral': () => onNavigate('visao-geral'), garimpar: () => onNavigate('garimpar'), disparar: onDispatch, ofertas: () => onNavigate('ofertas'), templates: () => onNavigate('templates'), extensao: () => onNavigate('extensao'), grupos: onGroups, metricas: onAnalytics };
  const renderItem = ([label, Icon, id]: readonly [string, React.ElementType, string]) => <button key={id} type="button" onClick={actions[id]} className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${activeSection === id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}><span className={`absolute left-0 h-5 w-0.5 rounded-r-full transition ${activeSection === id ? 'bg-[#EE4D2D]' : 'bg-transparent'}`} /><Icon className={`h-[18px] w-[18px] ${activeSection === id ? 'text-[#EE4D2D]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />{label}</button>;
  return <><button type="button" onClick={onToggleMobile} aria-label="Abrir navegação" className="fixed left-3 top-20 z-40 grid h-10 w-10 place-items-center rounded-xl bg-[#111114] text-lg text-white shadow-xl md:hidden">☰</button><aside className={`fixed inset-y-0 left-0 z-50 w-[232px] flex-col border-r border-zinc-800 bg-[#111114] px-3 py-5 text-zinc-300 ${mobileOpen ? 'flex' : 'hidden'} md:flex`}>
    <div className="flex items-center gap-2 px-2 pb-5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b45] to-[#EE4D2D] text-lg text-white shadow-lg shadow-orange-950/40">📡</div><div className="text-sm font-black"><span className="text-[#EE4D2D]">Radar</span> <span className="text-zinc-100">de Oferta</span><div className="text-[10px] font-medium text-zinc-500">Painel de afiliados</div></div></div>
    <div className="border-t border-zinc-800" />
    <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">{groups.map((group, index) => <div key={index} className={`space-y-1 ${index > 0 ? 'border-t border-zinc-800 pt-4' : ''}`}>{group.map(renderItem)}</div>)}<div className="mt-auto space-y-1 border-t border-zinc-800 pt-4">{renderItem(['Tutoriais', BookOpen, 'tutoriais'])}{renderItem(['Suporte', LifeBuoy, 'suporte'])}<button type="button" onClick={onSettings} className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"><Settings className="h-[18px] w-[18px] text-zinc-600 group-hover:text-zinc-300" />Configurações</button></div></nav>
    <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 px-2 pt-4"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#EE4D2D] text-xs font-black text-white">NA</div><div className="min-w-0"><div className="truncate text-xs font-bold text-zinc-100">Natan</div><div className="text-[10px] font-semibold text-[#EE4D2D]">PRO · Afiliado</div></div><Bell className="ml-auto h-4 w-4 text-zinc-600" onClick={onNotifications} /></div>
  </aside></>;
};
