import type { ElementType } from 'react';
import { BarChart3, Search, Send, Users } from 'lucide-react';
import { Icon3D } from '@/components/ui/Icon3D';

interface QuickActionsProps {
  onGarimpar: () => void;
  onDisparar: () => void;
  onGrupos: () => void;
  onMetricas: () => void;
}

export function QuickActions({ onGarimpar, onDisparar, onGrupos, onMetricas }: QuickActionsProps) {
  const actions: { label: string; desc: string; icon: ElementType; onClick: () => void }[] = [
    { label: 'Garimpar ofertas', desc: 'Encontrar produtos', icon: Search, onClick: onGarimpar },
    { label: 'Disparar campanha', desc: 'Enviar para os grupos', icon: Send, onClick: onDisparar },
    { label: 'Gerenciar grupos', desc: 'Organizar sua audiência', icon: Users, onClick: onGrupos },
    { label: 'Ver métricas', desc: 'Analisar resultados', icon: BarChart3, onClick: onMetricas },
  ];
  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="text-lg font-bold text-[var(--text-title)]">Ações rápidas</h2>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Acesse as principais funções da plataforma.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(({ label, desc, icon: Icon, onClick }, index) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="group flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] px-3 py-4 text-center transition-colors hover:border-[var(--border-brand)] hover:bg-[var(--surface-selected)]"
          >
            <Icon3D icon={Icon} size={52} tone={index % 2 ? 'dark' : 'orange'} dot={index % 2 === 1} lift className="mb-1" />
            <span className="text-sm font-semibold text-[var(--text-title)]">{label}</span>
            <span className="text-xs text-[var(--text-muted)]">{desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
