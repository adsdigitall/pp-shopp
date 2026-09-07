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

const sectionConfig: Record<SectionId, { label: string; icon: React.ElementType }> = {
  'visao-geral': { label: 'Início', icon: LayoutDashboard },
  'garimpar': { label: 'Garimpar', icon: WandSparkles },
  'disparar': { label: 'Disparar', icon: Send },
  'fila': { label: 'Fila', icon: Boxes },
  'ofertas': { label: 'Fila', icon: Boxes },
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
    const { label, icon: Icon } = sectionConfig[section];
    const isActive = activeSection === section;
    return (
      <button
        key={section}
        type="button"
        onClick={() => handleClick(section)}
        className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-sm shadow-[0_2px_8px_-2px_color-mix(in_srgb,_var(--brand-primary)_30%,_transparent)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className={`absolute left-0 h-4 w-0.5 rounded-r-full transition-colors ${isActive ? 'bg-[var(--brand-primary)]' : 'bg-transparent'}`} />
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
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
        className="fixed left-2 top-14 z-40 grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-0)] text-[var(--text-primary)] shadow-lg border border-[var(--border-default)] md:hidden"
      >
        ☰
      </button>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-[var(--border-default)] bg-[var(--surface-0)] px-2 py-3 text-[var(--text-secondary)] ${mobileOpen ? 'flex' : 'hidden'} md:flex`}
      >
        <div className="flex items-center gap-2 px-1 pb-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white shadow-[0_4px_12px_-4px_color-mix(in_srgb,_var(--brand-primary)_50%,_transparent)]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black">
              <span className="text-[var(--brand-primary)]">Radar</span>{' '}
              <span className="text-[var(--text-primary)]">de Oferta</span>
            </div>
            <div className="truncate text-[8px] font-medium text-[var(--text-muted)]">Painel de afiliados</div>
          </div>
        </div>
        <div className="border-t border-[var(--border-default)]" />
        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-2">
          {sidebarGroups.map((group, groupIndex) => (
            <div key={group.key} className={`space-y-0.5 ${groupIndex > 0 ? 'border-t border-[var(--border-default)] pt-2' : ''}`}>
              {group.sections.map(renderItem)}
            </div>
          ))}
          <div className="mt-auto space-y-0.5 border-t border-[var(--border-default)] pt-2">
            <button
              type="button"
              onClick={() => onNavigate('tutoriais' as SectionId)}
              className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <BookOpen className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
              Tutoriais
            </button>
            <button
              type="button"
              onClick={() => onNavigate('suporte' as SectionId)}
              className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <LifeBuoy className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
              Suporte
            </button>
            <button
              type="button"
              onClick={() => onNavigate('configuracoes' as SectionId)}
              className="group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
            >
              <Settings className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
              Config
            </button>
          </div>
        </nav>
        <div className="mt-2 flex items-center gap-2 border-t border-[var(--border-default)] px-1 pt-3">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-[10px] font-black text-white">
            CM
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-bold text-[var(--text-primary)]">
              Carolina de assunção macedo
            </div>
            <div className="text-[8px] font-semibold text-[var(--brand-primary)]">
              PRO | Afiliado Viral
            </div>
          </div>
          <button
            type="button"
            onClick={onNotifications}
            className="ml-auto btn-icon-primary h-8 w-8"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
};