import React, { useEffect, useState } from 'react';
import { Product, QueueItem, Group } from '../types/product';
import { ProductCard } from './ProductCard';
import { Trash2, Copy, CheckSquare, Square, Link as LinkIcon, Boxes, Users, Send, Zap, Clock, Save } from 'lucide-react';

const AUTOMATION_CATEGORIES = [
  { id: 'eletrônicos', label: 'Eletrônicos' },
  { id: 'moda feminina', label: 'Moda feminina' },
  { id: 'casa e banho', label: 'Casa e banho' },
  { id: 'infantil', label: 'Infantil' },
  { id: 'beleza', label: 'Beleza' },
  { id: 'acessórios', label: 'Acessórios' },
  { id: 'celular', label: 'Celulares' },
];

interface FilaPageProps {
  queueItems: QueueItem[];
  groups: Group[];
  onAddToQueue: () => void;
  onRemoveFromQueue: (queueId: string) => void;
  onClearQueue: () => void;
  onSelectAll: (selected: boolean) => void;
  onToggleSelection: (queueId: string) => void;
  onOpenDispatch: () => void;
  onOpenGroups: () => void;
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const FilaPage: React.FC<FilaPageProps> = ({
  queueItems,
  groups,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onSelectAll,
  onToggleSelection,
  onOpenDispatch,
  onOpenGroups,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'fila' | 'grupos'>('fila');
  const [automation, setAutomation] = useState<any>({ enabled: false, groups: [], interval: { value: 30, unit: 'seconds' } });
  const [savingAutomation, setSavingAutomation] = useState(false);

  useEffect(() => {
    fetch('/api/dispatch/automation', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(body => {
      if (body?.config) setAutomation(body.config);
    }).catch(() => undefined);
  }, []);

  const selectedAutomationIds = Array.isArray(automation.groups) ? automation.groups.map((group: any) => String(group.id)) : [];
  const selectedAutomationCategoryIds = Array.isArray(automation.categories) ? automation.categories.map(String) : [];
  const getAutomationCapacity = () => {
    const value = Math.max(1, Number(automation.offerInterval?.value || automation.interval?.value) || 30);
    const unit = automation.offerInterval?.unit || automation.interval?.unit || 'seconds';
    const intervalMinutes = unit === 'hours' ? value * 60 : unit === 'minutes' ? value : value / 60;
    const parseTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;
    const from = parseTime(automation.activeFrom || '');
    const until = parseTime(automation.activeUntil || '');
    const duration = from === null || until === null || from === until ? 1440 : (until - from + 1440) % 1440;
    return Math.floor(duration / intervalMinutes) + 1;
  };
  const automationCapacity = getAutomationCapacity();
  const saveAutomation = async () => {
    setSavingAutomation(true);
    try {
      const response = await fetch('/api/dispatch/automation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: automation.enabled, groupIds: selectedAutomationIds, categoryIds: selectedAutomationCategoryIds, interval: automation.interval, offerInterval: automation.offerInterval || automation.interval, aiEnabled: automation.aiEnabled === true, activeFrom: automation.activeFrom || '', activeUntil: automation.activeUntil || '' }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível salvar.');
      setAutomation(body.config);
      showToast(automation.enabled ? 'Automação ativada' : 'Automação pausada', automation.enabled ? 'As próximas ofertas adicionadas à fila serão disparadas com esta configuração.' : undefined, 'success');
    } catch (error) {
      showToast('Erro na automação', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally { setSavingAutomation(false); }
  };

  const selectedCount = queueItems.filter(item => item.selected).length;
  const selectedAll = queueItems.length > 0 && selectedCount === queueItems.length;

  const handleToggleSelectAll = () => {
    onSelectAll(!selectedAll);
  };

  const copyAffiliateLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado', 'Link de afiliado copiado.', 'success');
  };

  return (
    <section id="ofertas-fila" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">Ofertas</h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{queueItems.length} ofertas prontas. Revise e ajuste antes de mandar.</p>
        </div>
        <button type="button" onClick={onOpenDispatch} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-[11px] font-black text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> Disparar
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${automation.enabled ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)]'}`}><Zap className="h-4 w-4" /></span><div><p className="text-[12px] font-black text-[var(--text-primary)]">Fila automática</p><p className="text-[9px] text-[var(--text-secondary)]">Salve grupos e intervalo uma vez.</p></div></div>
          <button type="button" onClick={() => setAutomation((prev: any) => ({ ...prev, enabled: !prev.enabled }))} className={`relative h-6 w-11 rounded-full transition ${automation.enabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} aria-pressed={automation.enabled} aria-label="Ativar envio automático"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${automation.enabled ? 'left-6' : 'left-1'}`} /></button>
        </div>
        {automation.enabled && <div className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black text-[var(--text-primary)]">Filtro por IA</p><p className="mt-0.5 text-[9px] leading-3 text-[var(--text-secondary)]">A IA só aprova ofertas com dados reais relevantes. Sem aprovação, a oferta continua na fila manual.</p></div>
              <button type="button" onClick={() => setAutomation((prev: any) => ({ ...prev, aiEnabled: !prev.aiEnabled }))} className={`relative h-6 w-11 shrink-0 rounded-full transition ${automation.aiEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} aria-pressed={automation.aiEnabled === true} aria-label="Ativar filtro por IA"><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${automation.aiEnabled ? 'left-6' : 'left-1'}`} /></button>
            </div>
          </div>
          <label className="grid gap-1 text-[9px] font-bold text-[var(--text-secondary)]">Começar a enviar
            <input aria-label="Início do horário automático" type="time" value={automation.activeFrom || ''} onChange={event => setAutomation((prev: any) => ({ ...prev, activeFrom: event.target.value }))} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]" />
          </label>
          <label className="grid gap-1 text-[9px] font-bold text-[var(--text-secondary)]">Parar de enviar
            <input aria-label="Fim do horário automático" type="time" value={automation.activeUntil || ''} onChange={event => setAutomation((prev: any) => ({ ...prev, activeUntil: event.target.value }))} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]" />
          </label>
          <p className="sm:col-span-2 text-[9px] leading-3 text-[var(--text-secondary)]">Deixe os dois horários vazios para enviar o dia todo. Fora do horário, a oferta fica na fila manual.</p>
          <label className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[9px] font-bold text-[var(--text-secondary)]">Nova oferta a cada
            <input aria-label="Frequência de novas ofertas" type="number" min="1" value={automation.offerInterval?.value || automation.interval?.value || 30} onChange={event => setAutomation((prev: any) => ({ ...prev, offerInterval: { ...(prev.offerInterval || prev.interval || {}), value: Number(event.target.value) } }))} className="h-7 w-14 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-1.5 text-[10px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]" />
            <select aria-label="Unidade da frequência de novas ofertas" value={automation.offerInterval?.unit || automation.interval?.unit || 'seconds'} onChange={event => setAutomation((prev: any) => ({ ...prev, offerInterval: { ...(prev.offerInterval || prev.interval || {}), unit: event.target.value } }))} className="h-7 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-1.5 text-[10px] text-[var(--text-primary)]"><option value="seconds">segundos</option><option value="minutes">minutos</option><option value="hours">horas</option></select>
          </label>
          <div className="sm:col-span-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2">
            <p className="mb-1.5 text-[9px] font-black text-[var(--text-primary)]">Categorias que o piloto automático pode buscar</p>
            <div className="flex flex-wrap gap-1.5">{AUTOMATION_CATEGORIES.map(category => { const checked = selectedAutomationCategoryIds.includes(category.id); return <button key={category.id} type="button" onClick={() => setAutomation((prev: any) => ({ ...prev, categories: checked ? prev.categories.filter((item: string) => item !== category.id) : [...(prev.categories || []), category.id] }))} className={`rounded-md border px-2 py-1 text-[9px] font-bold transition ${checked ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>{checked && '✓ '}{category.label}</button>; })}</div>
            <p className="mt-1.5 text-[8px] text-[var(--text-secondary)]">Sem categoria marcada, busca ofertas em alta de todos os nichos.</p>
          </div>
          <p className="sm:col-span-2 rounded-md bg-[var(--primary)]/10 px-2 py-1.5 text-[10px] font-bold text-[var(--text-primary)]">Previsão: até {automationCapacity} {automationCapacity === 1 ? 'oferta' : 'ofertas'} neste período, contando a primeira no horário de início.</p>
        </div>}
        {automation.enabled && <div className="mt-3 border-t border-[var(--border)] pt-3"><p className="mb-2 text-[10px] font-bold text-[var(--text-secondary)]">Grupos que receberão as próximas ofertas</p><div className="grid gap-1.5 sm:grid-cols-2">{groups.map(group => { const checked = selectedAutomationIds.includes(String(group.id)); return <button type="button" key={group.id} onClick={() => setAutomation((prev: any) => ({ ...prev, groups: checked ? prev.groups.filter((item: any) => String(item.id) !== String(group.id)) : [...prev.groups, { id: group.id, name: group.name, sessionId: (group as any).sessionId }] }))} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[10px] font-bold ${checked ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text-primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'}`}><span className={`grid h-4 w-4 place-items-center rounded border ${checked ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]'}`}>{checked && <CheckSquare className="h-3 w-3" />}</span><span className="truncate">{group.name}</span></button>; })}</div><div className="mt-3 flex items-center gap-2"><Clock className="h-4 w-4 text-[var(--primary)]" /><input aria-label="Intervalo automático" type="number" min="10" value={automation.interval?.value || 30} onChange={event => setAutomation((prev: any) => ({ ...prev, interval: { ...(prev.interval || {}), value: Number(event.target.value) } }))} className="h-8 w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]" /><select aria-label="Unidade de intervalo automático" value={automation.interval?.unit || 'seconds'} onChange={event => setAutomation((prev: any) => ({ ...prev, interval: { ...(prev.interval || {}), unit: event.target.value } }))} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] text-[var(--text-primary)]"><option value="seconds">segundos</option><option value="minutes">minutos</option><option value="hours">horas</option></select><button type="button" onClick={() => void saveAutomation()} disabled={savingAutomation} className="ml-auto inline-flex h-8 items-center gap-1 rounded-md bg-[var(--primary)] px-3 text-[10px] font-black text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" />{savingAutomation ? 'Salvando' : 'Salvar'}</button></div></div>}
      </div>

      <div className="flex gap-1.5 mb-3">
        <button type="button" onClick={() => setActiveTab('fila')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 ${activeTab === 'fila' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--text-secondary)]'}`}>
          <Boxes className="w-3.5 h-3.5" /> Fila
        </button>
        <button type="button" onClick={() => setActiveTab('grupos')} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 ${activeTab === 'grupos' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--text-secondary)]'}`}>
          <Users className="w-3.5 h-3.5" /> Grupos
        </button>
      </div>

      {activeTab === 'fila' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <button type="button" onClick={onAddToQueue} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-[11px] font-black text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5">
              <span>+</span> Adicionar
            </button>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={handleToggleSelectAll} className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-1">
                {selectedAll ? <CheckSquare className="w-3.5 h-3.5 text-[var(--primary)]" /> : <Square className="w-3.5 h-3.5" />}
                Todos
              </button>
              <button type="button" onClick={onClearQueue} className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Limpar
              </button>
            </div>
          </div>

          {queueItems.length === 0 ? (
            <div className="text-center py-6">
              <Boxes className="h-8 w-8 mx-auto mb-2 text-[var(--border)]" />
              <p className="text-[11px] text-[var(--text-secondary)]">Fila vazia. Garimpe ofertas pra começar.</p>
              <button type="button" onClick={onAddToQueue} className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-[11px] font-black text-white hover:bg-[var(--primary-hover)]">
                Garimpar ofertas
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {queueItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleSelection(item.id);
                    }}
                    className={`flex-shrink-0 rounded border-2 ${item.selected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border)]'} w-4.5 h-4.5`}
                  >
                    {item.selected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <div className="relative h-10 w-10 shrink-0 rounded bg-[var(--surface-elevated)] overflow-hidden">
                    {item.product.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--text-secondary)]"><LinkIcon className="h-5 w-5" /></div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{item.product.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`rounded px-1 py-0.5 font-bold ${item.product.marketplace === 'mercado_livre' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-700'}`}>
                        {item.product.marketplace === 'shopee' ? 'SH' : item.product.marketplace === 'mercado_livre' ? 'ML' : item.product.marketplace}
                      </span>
                      <span className="text-[var(--success)] font-bold">R$ {item.product.currentPrice?.toFixed(2).replace('.', ',')}</span>
                      {item.product.originalPrice && (
                        <span className="line-through text-[var(--text-secondary)]">R$ {item.product.originalPrice.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded bg-[var(--surface-elevated)] px-1.5 py-1 text-[9px]">
                      <LinkIcon className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span className="truncate max-w-[100px] text-[var(--text-secondary)] font-mono">{item.product.affiliateUrl || item.product.productUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyAffiliateLink(item.product.affiliateUrl || item.product.productUrl)}
                        className="text-[var(--text-secondary)] hover:text-[var(--primary)]"
                        aria-label="Copiar link de afiliado"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveFromQueue(item.id)}
                      className="text-[var(--text-secondary)] hover:text-red-500 p-1"
                      aria-label="Remover oferta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-orange-100 p-2">
              <b className="block text-lg text-orange-700">{queueItems.length}</b>
              <span className="text-[9px] text-orange-700">na fila</span>
            </div>
            <div className="rounded-lg bg-emerald-100 p-2">
              <b className="block text-lg text-emerald-700">0</b>
              <span className="text-[9px] text-emerald-700">disparadas</span>
            </div>
            <div className="rounded-lg bg-[var(--border)] p-2">
              <b className="block text-lg text-[var(--text-secondary)]">Manual</b>
              <span className="text-[9px] text-[var(--text-secondary)]">modo seguro</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'grupos' && (
        <div className="mt-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)]">Meus Grupos</h3>
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">Gerencie os grupos que vão receber seus disparos.</p>
              </div>
              <button type="button" onClick={onOpenGroups} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 font-black text-white text-[10px] hover:bg-[var(--primary-hover)]">
                Abrir grupos
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-[var(--surface-elevated)] p-2">
                <b className="block text-lg text-[var(--text-primary)]">2</b>
                <span className="text-[9px] text-[var(--text-secondary)]">Grupos ativos</span>
              </div>
              <div className="rounded-lg bg-[var(--surface-elevated)] p-2">
                <b className="block text-lg text-[var(--text-primary)]">5</b>
                <span className="text-[9px] text-[var(--text-secondary)]">Membros</span>
              </div>
              <div className="rounded-lg bg-[var(--surface-elevated)] p-2">
                <b className="block text-lg text-[var(--text-primary)]">4</b>
                <span className="text-[9px] text-[var(--text-secondary)]">Enviadas</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FilaPage;
