import React from 'react';
import { ArrowRight, BarChart3, Bell, CalendarDays, Clock3, Layers3, Link2, Send, Settings, Users } from 'lucide-react';

interface VisaoGeralProps {
  onNavigateToGarimpar: () => void;
  onNavigateToDispatch: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToQueue?: () => void;
  queuedCount: number;
  dispatchCount: number;
  groupsCount: number;
  clicksCount: number;
  whatsappConnected: boolean;
  shopeeConfigured: boolean;
  latestDispatch?: { status?: string; createdAt?: string };
}

export const VisaoGeral: React.FC<VisaoGeralProps> = ({ onNavigateToGarimpar, onNavigateToDispatch, onNavigateToGroups = () => undefined, onNavigateToQueue = () => undefined, queuedCount, dispatchCount, groupsCount, clicksCount, whatsappConnected, shopeeConfigured, latestDispatch }) => {
  const metrics = [
    { label: 'Disparos hoje', value: dispatchCount, note: 'Registros de hoje', icon: Send, color: 'text-[var(--primary)]' },
    { label: 'Grupos sincronizados', value: groupsCount, note: 'Conta conectada', icon: Users, color: 'text-[var(--success)]' },
    { label: 'Cliques no link', value: clicksCount, note: 'Rastreamento pendente', icon: Link2, color: 'text-[#3988ff]' },
    { label: 'Ofertas na fila', value: queuedCount, note: 'Aguardando envio', icon: Layers3, color: 'text-[#b7c7df]' },
  ];
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date());
  return <section id="visao-geral" className="space-y-3">
    <div className="flex items-end justify-between gap-2"><div><h1 className="text-2xl font-black leading-tight tracking-tight text-[var(--text-primary)]">Bom dia <span aria-hidden="true">👋</span></h1><p className="mt-0.5 text-sm text-[var(--text-secondary)]">Veja como está sua operação hoje.</p></div><div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"><CalendarDays className="h-4 w-4" /> {formattedDate}</div></div>
    <div className="grid grid-cols-2 gap-2">
      {metrics.map(({ label, value, note, icon: Icon, color }) => <div key={label} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-start justify-between gap-1.5"><Icon className={`h-6 w-6 shrink-0 ${color}`} /><ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" /></div><p className="mt-2 truncate text-xs font-semibold text-[var(--text-secondary)]">{label}</p><strong className="mt-0.5 block text-2xl font-black text-[var(--text-primary)]">{value}</strong><p className={`mt-0.5 truncate text-[10px] ${label === 'Grupos ativos' ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>{label === 'Grupos ativos' ? '↑ ' : '— '}{note}</p></div>)}
    </div>
    <button type="button" onClick={onNavigateToDispatch} className="pressable flex w-full items-center gap-3 rounded-xl bg-[var(--primary)] px-4 py-3 text-left text-white shadow-[0_8px_20px_rgba(255,90,54,.25)]"><Send className="h-7 w-7 shrink-0" /><span className="min-w-0 flex-1"><strong className="block text-base font-black">Disparar oferta</strong><span className="block text-xs text-white/80">Envie para seus grupos em segundos</span></span><ArrowRight className="h-5 w-5 shrink-0" /></button>
    <div className="grid grid-cols-3 gap-2">{[
      { label: 'Garimpar', desc: 'Encontre produtos', icon: Settings, action: onNavigateToGarimpar },
      { label: 'Grupos', desc: 'Gerencie grupos', icon: Users, action: onNavigateToGroups },
      { label: 'Fila', desc: 'Acompanhe disparos', icon: Layers3, action: onNavigateToQueue },
    ].map(({ label, desc, icon: Icon, action }) => <button key={label} type="button" onClick={action} className="pressable min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-left"><Icon className="h-6 w-6 text-[var(--text-primary)]" /><strong className="mt-2 block truncate text-xs font-black text-[var(--text-primary)]">{label}</strong><span className="mt-0.5 block text-[10px] leading-4 text-[var(--text-secondary)]">{desc}</span></button>)}</div>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-center justify-between border-b border-[var(--border)] pb-2"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[var(--success)]" /><h2 className="text-base font-black">Status da operação</h2></div><span className="text-xs text-[var(--text-secondary)]">Status atual <ArrowRight className="inline h-3 w-3" /></span></div><div className="divide-y divide-[var(--border)]"><div className="flex items-center gap-2 py-2"><span className={`h-2.5 w-2.5 rounded-full ${whatsappConnected ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} /><div className="min-w-0 flex-1"><p className="font-semibold text-sm">WhatsApp</p><p className="text-[10px] text-[var(--text-secondary)]">{whatsappConnected ? 'Conta conectada ao WAHA' : 'Nenhuma conta conectada'}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${whatsappConnected ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--error)]/10 text-[var(--error)]'}`}>{whatsappConnected ? 'Conectado' : 'Desconectado'}</span></div><div className="flex items-center gap-2 py-2"><span className={`h-2.5 w-2.5 rounded-full ${shopeeConfigured ? 'bg-[var(--success)]' : 'bg-[#8394ad]'}`} /><div className="min-w-0 flex-1"><p className="font-semibold text-sm">Shopee</p><p className="text-[10px] text-[var(--text-secondary)]">{shopeeConfigured ? 'Integração disponível' : 'Integração ainda não configurada'}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${shopeeConfigured ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>{shopeeConfigured ? 'Ativa' : 'Pendente'}</span></div><div className="flex items-center gap-2 py-2"><span className="h-2.5 w-2.5 rounded-full bg-[#8394ad]" /><div className="min-w-0 flex-1"><p className="font-semibold text-sm">Envio automático</p><p className="text-[10px] text-[var(--text-secondary)]">Processado pela fila do servidor</p></div><span className="rounded-lg bg-[var(--surface-elevated)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)]">Por fila</span></div></div></div>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-center justify-between border-b border-[var(--border)] pb-2"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5" /><h2 className="text-base font-black">Atividade recente</h2></div><span className="text-xs text-[var(--text-secondary)]">Ver todas <ArrowRight className="inline h-3 w-3" /></span></div><div className="flex items-center gap-2 pt-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)]/10"><Send className="h-4 w-4 text-[var(--primary)]" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-sm">{latestDispatch ? `Disparo ${latestDispatch.status === 'completed' ? 'concluído' : 'em processamento'}` : 'Nenhum disparo registrado'}</p><p className="text-[10px] text-[var(--text-secondary)]">{latestDispatch?.createdAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(latestDispatch.createdAt)) : 'Assim que um disparo for criado, ele aparecerá aqui.'}</p></div></div></div>
  </section>;
};

export default VisaoGeral;
