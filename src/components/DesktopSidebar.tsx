import React from 'react';
import {
  BarChart2,
  Bell,
  BookOpen,
  Boxes,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  PlugZap,
  Send,
  Settings,
  Users,
  WandSparkles,
  ShoppingBag,
  Globe,
  Zap,
  GitBranch,
  Layers,
} from 'lucide-react';
import { SectionId } from '../types/product';

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
}

const sectionConfig: Record<SectionId, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  'visao-geral': { label: 'Início', icon: LayoutDashboard, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'garimpar': { label: 'Garimpar', icon: WandSparkles, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'disparar': { label: 'Disparar', icon: Send, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'fila': { label: 'Fila', icon: Boxes, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'ofertas': { label: 'Fila', icon: Boxes, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'paginas': { label: 'Páginas', icon: FileText, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'templates': { label: 'Templates', icon: FileText, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'espelhamento': { label: 'Espelhar', icon: GitBranch, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'grupos': { label: 'Grupos', icon: Users, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'metricas': { label: 'Métricas', icon: BarChart2, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'extensao': { label: 'Extensão', icon: PlugZap, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'configuracoes': { label: 'Config', icon: Settings, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'tutoriais': { label: 'Tutoriais', icon: BookOpen, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'suporte': { label: 'Suporte', icon: LifeBuoy, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
  'whatsapp': { label: 'WhatsApp', icon: MessageSquare, color: 'text-[var(--primary)]', bgColor: 'bg-[var(--brand-light)]' },
};

const sidebarGroups: { key: string; sections: SectionId[] }[] = [
  { key: 'main', sections: ['visao-geral'] },
  { key: 'core', sections: ['garimpar', 'disparar', 'fila', 'paginas', 'espelhamento'] },
  { key: 'channels', sections: ['grupos', 'metricas', 'extensao'] },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeSection,
  mobileOpen,
  onToggleMobile,
  onNavigate,
  onDispatch,
  onGroups,
  onSettings,
  onNotifications,
  onAnalytics,
}) => {
  const handleClick = (section: SectionId) => onNavigate(section);

  const renderItem = (section: SectionId) => {
    const { label, icon: Icon, color, bgColor } = sectionConfig[section];
    const isActive = activeSection === section;
    return (
      <button
        key={section}
        type="button"
        onClick={() => handleClick(section)}
        className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition ${
          isActive
            ? `bg-slate-900 text-white ${bgColor} ${color}`
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className={`absolute left-0 h-4 w-0.5 rounded-r-full transition ${isActive ? 'bg-[var(--primary)]' : 'bg-transparent'}`} />
        <Icon className={`h-4 w-4 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
        {label}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <button type="button" aria-label="Fechar navegação" onClick={onToggleMobile} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[1px] md:hidden" />
      )}
      <button type="button" onClick={onToggleMobile} aria-label="Abrir navegação" className="fixed left-2 top-16 z-40 grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-base text-white shadow-xl md:hidden">☰</button>
      <aside className={`fixed inset-y-0 left-0 z-50 w-[220px] flex-col border-r border-[var(--border)] bg-[var(--aside-bg)] px-2 py-4 text-[var(--text-secondary)] backdrop-blur-xl ${mobileOpen ? 'flex' : 'hidden'} md:flex`}>
        <div className="flex items-center gap-2 px-1 pb-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary)] text-base text-white shadow-lg shadow-orange-950/40">📡</div>
          <div className="text-sm font-black"><span className="text-[var(--primary)]">Radar</span> <span className="text-[var(--text-primary)]">de Oferta</span><div className="text-[9px] font-medium text-[var(--text-secondary)]">Painel de afiliados</div></div>
        </div>
        <div className="border-t border-slate-800" />
        <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3">
          {sidebarGroups.map((group, groupIndex) => (
            <div key={group.key} className={`space-y-0.5 ${groupIndex > 0 ? 'border-t border-slate-800 pt-3' : ''}`}>
              {group.sections.map(renderItem)}
            </div>
          ))}
          <div className="mt-auto space-y-0.5 border-t border-slate-800 pt-3">
            <button type="button" onClick={() => onNavigate('tutoriais' as SectionId)} className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"><BookOpen className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />Tutoriais</button>
            <button type="button" onClick={() => onNavigate('suporte' as SectionId)} className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"><LifeBuoy className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />Suporte</button>
            <button type="button" onClick={() => onNavigate('configuracoes' as SectionId)} className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"><Settings className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />Config</button>
          </div>
        </nav>
        <div className="mt-2 flex items-center gap-2 border-t border-slate-800 px-1 pt-3">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--primary)] text-[10px] font-black text-white">CM</div>
          <div className="min-w-0"><div className="truncate text-[11px] font-bold text-[var(--text-primary)]">Carolina de assunção macedo</div><div className="text-[9px] font-semibold text-[var(--primary)]">PRO | Afiliado Viral</div></div>
          <Bell className="ml-auto h-3.5 w-3.5 text-slate-600" onClick={onNotifications} />
        </div>
      </aside>
    </>
  );
};