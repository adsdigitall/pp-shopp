import React, { useEffect, useState } from 'react';
import { Product, QueueItem, Group } from '../types/product';
import { ProductCard } from './ProductCard';
import { Trash2, Copy, CheckSquare, Square, Link as LinkIcon, Boxes, Users, Send, Zap, Clock, Save, Search, Check, X, AlertTriangle, Circle, CircleDot, BarChart2, Activity, ArrowDown, RotateCcw, RotateCw, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { Checkbox } from '@/components/ui/Checkbox';

const PRIORITIZED_AUTOMATION_CATEGORIES = [
  { id: 'casa e cozinha', label: 'Casa e cozinha (50%)' },
  { id: 'beleza', label: 'Beleza e autocuidado (20%)' },
  { id: 'organizadores', label: 'Organização (15%)' },
  { id: 'moda feminina barata', label: 'Moda feminina barata (10%)' },
  { id: 'utilidades domésticas', label: 'Utilidades do dia a dia (5%)' },
  { id: 'maternidade e infantil', label: 'Maternidade e infantil' },
  { id: 'cama mesa e banho', label: 'Cama, mesa e banho' },
  { id: 'banheiro', label: 'Banheiro' },
  { id: 'acessórios femininos', label: 'Acessórios femininos' },
  { id: 'eletrônicos baratos', label: 'Eletrônicos baratos' },
];

interface FilaPageProps {
  queueItems: QueueItem[];
  groups: Group[];
  onAddToQueue: () => void;
  onRemoveFromQueue: (queueId: string) => void;
  onClearQueue: () => void;
  onSelectAll: (selected: boolean) => void;
  onToggleSelection: (queueId: string) => void;
  onSendNow?: (queueId: string) => Promise<void> | void;
  onOpenDispatch: () => void;
  onOpenGroups: () => void;
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  /** Recarrega a lista de grupos do WhatsApp (sync ao vivo). */
  onRefreshGroups?: () => Promise<void> | void;
}

const marketplaceLabel = (m?: string) =>
  m === 'shopee' ? 'Shopee'
  : m === 'mercado_livre' ? 'Mercado Livre'
  : m === 'amazon' ? 'Amazon'
  : m === 'magalu' ? 'Magalu'
  : (m || '—');

const marketplaceDot = (m?: string) =>
  m === 'shopee' ? 'bg-[#ee4d2d]'
  : m === 'mercado_livre' ? 'bg-[#ffe600]'
  : m === 'amazon' ? 'bg-[#ff9900]'
  : m === 'magalu' ? 'bg-[#0086ff]'
  : 'bg-[var(--text-secondary)]';

const todayLine = () => {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const FilaPage: React.FC<FilaPageProps> = ({
  queueItems,
  groups,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onSelectAll,
  onToggleSelection,
  onSendNow,
  onOpenDispatch,
  onOpenGroups,
  showToast,
  onRefreshGroups,
}) => {
  const [activeTab, setActiveTab] = useState<'fila' | 'grupos' | 'automacao'>('fila');
  const [refreshingGroups, setRefreshingGroups] = useState(false);
  const [automation, setAutomation] = useState<any>({ enabled: false, mode: 'manual', groups: [], interval: { value: 7, unit: 'minutes' }, offerInterval: { value: 7, unit: 'minutes' }, humanMessageInterval: { minOffers: 8, maxOffers: 12 }, repeatCooldownHours: 4, championRepostAfterHours: 6, activeFrom: '08:00', activeUntil: '23:00' });
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

  const scheduleSlots = Array.isArray(automation.scheduleSlots) ? automation.scheduleSlots : [];
  const updateScheduleSlot = (index: number, patch: any) => setAutomation((prev: any) => ({ ...prev, scheduleSlots: (Array.isArray(prev.scheduleSlots) ? prev.scheduleSlots : []).map((slot: any, i: number) => i === index ? { ...slot, ...patch } : slot) }));
  const addScheduleSlot = () => setAutomation((prev: any) => ({ ...prev, scheduleSlots: [...(Array.isArray(prev.scheduleSlots) ? prev.scheduleSlots : []), { id: `slot-${Date.now()}`, enabled: true, from: '08:00', until: '09:00', categories: ['casa-cozinha'] }] }));
  const removeScheduleSlot = (index: number) => setAutomation((prev: any) => ({ ...prev, scheduleSlots: (Array.isArray(prev.scheduleSlots) ? prev.scheduleSlots : []).filter((_: any, i: number) => i !== index) }));
  const moveScheduleSlot = (index: number, direction: -1 | 1) => setAutomation((prev: any) => { const next = [...(Array.isArray(prev.scheduleSlots) ? prev.scheduleSlots : [])]; const target = index + direction; if (target < 0 || target >= next.length) return prev; [next[index], next[target]] = [next[target], next[index]]; return { ...prev, scheduleSlots: next }; });

  const saveAutomation = async () => {
    setSavingAutomation(true);
    try {
      const response = await fetch('/api/dispatch/automation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: automation.enabled, mode: automation.mode === 'auto' ? 'auto' : 'manual', groupIds: selectedAutomationIds, categoryIds: selectedAutomationCategoryIds, interval: automation.interval, offerInterval: automation.offerInterval || automation.interval, humanMessageInterval: automation.humanMessageInterval, repeatCooldownHours: automation.repeatCooldownHours, championRepostAfterHours: automation.championRepostAfterHours, aiEnabled: automation.aiEnabled === true, activeFrom: automation.activeFrom || '08:00', activeUntil: automation.activeUntil || '23:00', scheduleSlots: automation.scheduleSlots }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível salvar.');
      setAutomation(body.config);
      showToast(automation.enabled ? 'Automação ativada' : 'Automação pausada', automation.enabled ? 'As próximas ofertas adicionadas à fila serão disparadas com esta configuração.' : undefined, 'success');
    } catch (error) {
      showToast('Erro na automação', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally { setSavingAutomation(false); }
  };

  const selectedCount = queueItems.filter(item => item.selected).length;
  const isCompleteOffer = (item: QueueItem) => Boolean(item.product.name?.trim())
    && Number.isFinite(Number(item.product.currentPrice))
    && Number(item.product.currentPrice) > 0
    && /^https?:\/\/\S+$/i.test(String(item.product.affiliateUrl || ''));
  const readyItems = queueItems.filter(isCompleteOffer);
  const incompleteItems = queueItems.filter(item => !isCompleteOffer(item));
  const selectedAll = readyItems.length > 0 && selectedCount === readyItems.length;

  const handleToggleSelectAll = () => {
    onSelectAll(!selectedAll);
  };

  const copyAffiliateLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado', 'Link de afiliado copiado.', 'success');
  };

  return (
    <section id="ofertas-fila" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-[var(--foreground)]">Fila</h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{readyItems.length} ofertas prontas pra disparar. Revise e ajuste antes de mandar.</p>
        </div>
        <p className="text-[11px] font-semibold text-[var(--text-secondary)]">{todayLine()}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v: 'fila' | 'grupos' | 'automacao') => setActiveTab(v)} className="w-full">
        <TabsList className="flex gap-6 border-b border-[var(--border)] bg-transparent px-1 pt-1 text-[12px]">
          <TabsTrigger value="fila" className={`rounded-none border-b-2 px-1 pb-2.5 font-semibold ${activeTab === 'fila' ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--text-secondary)]'}`}>Fila</TabsTrigger>
          <TabsTrigger value="grupos" className={`rounded-none border-b-2 px-1 pb-2.5 font-semibold ${activeTab === 'grupos' ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--text-secondary)]'}`}>Grupos</TabsTrigger>
          <TabsTrigger value="automacao" className={`rounded-none border-b-2 px-1 pb-2.5 font-semibold ${activeTab === 'automacao' ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--text-secondary)]'}`}>Automação</TabsTrigger>
        </TabsList>

        <TabsContent value="fila" className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onAddToQueue}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-transparent px-4 py-3.5 text-[12px] font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
          >
            <Plus className="h-4 w-4" /> Adicionar oferta
          </button>

          <div className="panel flex flex-wrap items-center gap-2 px-4 py-3">
            <button type="button" onClick={handleToggleSelectAll} aria-label="Selecionar todas" className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${selectedAll ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)] text-transparent'}`}>
              {selectedAll && <Check className="h-3.5 w-3.5" />}
            </button>
            <p className="text-[12px] font-bold text-[var(--foreground)]">{selectedCount} selecionadas de {queueItems.length} ofertas</p>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClearQueue} className="gap-1 px-2.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--error)]">
                <Trash2 className="h-3.5 w-3.5" /> Limpar fila
              </Button>
              <Button size="sm" onClick={onOpenDispatch} className="btn-brand gap-1.5 rounded-xl px-3.5 text-[11px] font-black text-white">
                <Send className="h-3.5 w-3.5" /> Ir para Disparos
              </Button>
            </div>
          </div>

          {incompleteItems.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-xs font-bold">{incompleteItems.length} registros antigos incompletos foram bloqueados</p>
                <p className="mt-0.5 text-[10px] leading-4 text-amber-100/70">Eles não têm nome, preço ou link válidos e não serão enviados. Use “Limpar fila” para removê-los e deixe a automação criar novas ofertas completas.</p>
              </div>
            </div>
          )}

          {readyItems.length === 0 ? (
            <div className="empty-state p-6 text-center">
              <Boxes className="mx-auto h-10 w-10 text-[var(--text-secondary)] opacity-50" />
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">Nenhuma oferta completa na fila</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Garimpe uma oferta ou aguarde o próximo ciclo automático.</p>
              <Button onClick={onAddToQueue} className="btn-brand mt-4 rounded-xl text-white">Garimpar ofertas</Button>
            </div>
          ) : (
            <div className="max-h-[64vh] space-y-2 overflow-y-auto pr-0.5">
              {readyItems.map((item) => (
                <div key={item.id} className="panel p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => onToggleSelection(item.id)}
                      aria-label="Selecionar oferta"
                      className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${item.selected ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)]'}`}
                    />
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-elevated)] sm:h-24 sm:w-24">
                      {item.product.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--text-secondary)]"><LinkIcon className="h-5 w-5" /></div>}
                      {item.product.discountPercentage != null && item.product.discountPercentage > 0 && (
                        <Badge className="absolute left-1.5 top-1.5 border-0 bg-[var(--primary)] px-1.5 py-0.5 text-[9px] font-black text-white">-{Math.round(item.product.discountPercentage)}%</Badge>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                        <span className="inline-flex items-center gap-1 font-bold text-[var(--text-secondary)]"><span className={`h-1.5 w-1.5 rounded-full ${marketplaceDot(item.product.marketplace)}`} />{marketplaceLabel(item.product.marketplace)}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2 py-0.5 font-bold text-[var(--success)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />Pronta</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-[var(--foreground)]">{item.product.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        {item.product.originalPrice != null && <span className="text-[10px] text-[var(--text-secondary)] line-through">R$ {item.product.originalPrice.toFixed(2).replace('.', ',')}</span>}
                        <span className="text-base font-black text-[var(--foreground)]">R$ {item.product.currentPrice?.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="mt-1.5 flex min-w-0 items-center gap-1 rounded-lg bg-[var(--surface-elevated)] p-1 pl-2 text-[9px]">
                        <LinkIcon className="h-3 w-3 shrink-0 text-[var(--success)]" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[var(--success)]">{item.product.affiliateUrl}</span>
                        <Button variant="ghost" size="icon-sm" onClick={() => copyAffiliateLink(item.product.affiliateUrl)} aria-label="Copiar link de afiliado">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {(item.product.salesCount != null || item.product.salesCountText || item.product.rating != null) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                          {item.product.salesCount != null && <span>+{item.product.salesCount.toLocaleString('pt-BR')} vendidos</span>}
                          {item.product.salesCountText && item.product.salesCount == null && <span>{item.product.salesCountText} vendidos</span>}
                          {item.product.rating != null && <span>★ {item.product.rating.toFixed(1)}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                      {onSendNow && <Button variant="outline" size="sm" onClick={() => onSendNow(item.id)} className="h-8 px-2 text-[10px] font-bold text-[var(--primary)]">Enviar agora</Button>}
                      <Button variant="ghost" size="icon-sm" onClick={() => onRemoveFromQueue(item.id)} className="text-[var(--text-secondary)] hover:text-[var(--error)]" aria-label="Remover oferta">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 p-2">
              <b className="block text-lg text-[var(--primary)]">{readyItems.length}</b>
              <span className="text-[9px] text-[var(--primary)]">prontas</span>
            </div>
            <div className="rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/10 p-2">
              <b className="block text-lg text-[var(--success)]">{selectedCount}</b>
              <span className="text-[9px] text-[var(--success)]">selecionadas</span>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2">
              <b className="block text-lg text-[var(--text-secondary)]">Manual</b>
              <span className="text-[9px] text-[var(--text-secondary)]">modo seguro</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automacao" className="mt-4 space-y-4">
          <div className="panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${automation.enabled ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Fila automática</CardTitle>
                  <CardDescription>Salve grupos e intervalo uma vez.</CardDescription>
                </div>
              </div>
              <Switch checked={automation.enabled === true} onCheckedChange={(checked) => setAutomation((prev: any) => ({ ...prev, enabled: checked }))} aria-label="Ativar envio automático" />
            </CardHeader>
            
            {automation.enabled && (
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[var(--foreground)]">Filtro por IA</p>
                        <p className="mt-0.5 text-[9px] leading-3 text-[var(--text-secondary)]">A IA só aprova ofertas com dados reais relevantes. Sem aprovação, a oferta continua na fila manual.</p>
                      </div>
                      <Switch checked={automation.aiEnabled === true} onCheckedChange={(checked) => setAutomation((prev: any) => ({ ...prev, aiEnabled: checked }))} aria-label="Ativar filtro por IA" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Modo da automação</label>
                    <Select value={automation.mode === 'auto' ? 'auto' : 'manual'} onValueChange={value => setAutomation((prev: any) => ({ ...prev, mode: value }))}>
                      <SelectTrigger className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="manual">Manual — aguardar aprovação</SelectItem><SelectItem value="auto">Automático — programar aprovadas</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Começar a enviar</label>
                      <Input type="time" value={automation.activeFrom || ''} onChange={e => setAutomation((prev: any) => ({ ...prev, activeFrom: e.target.value }))} className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Parar de enviar</label>
                      <Input type="time" value={automation.activeUntil || ''} onChange={e => setAutomation((prev: any) => ({ ...prev, activeUntil: e.target.value }))} className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)]" />
                    </div>
                    <p className="text-[9px] leading-3 text-[var(--text-secondary)] sm:col-span-2">Deixe os dois horários vazios para enviar o dia todo. Fora do horário, a oferta fica na fila manual.</p>
                    
                    <div className="space-y-1 sm:col-span-2">
                      <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">Nova oferta a cada
                        <Input type="number" min="1" value={automation.offerInterval?.value || automation.interval?.value || 30} onChange={e => setAutomation((prev: any) => ({ ...prev, offerInterval: { ...(prev.offerInterval || prev.interval || {}), value: Number(e.target.value) } }))} className="h-7 w-14 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)]" />
                        <Select value={automation.offerInterval?.unit || automation.interval?.unit || 'seconds'} onValueChange={e => setAutomation((prev: any) => ({ ...prev, offerInterval: { ...(prev.offerInterval || prev.interval || {}), unit: e } }))}>
                          <SelectTrigger className="h-7"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seconds">segundos</SelectItem>
                            <SelectItem value="minutes">minutos</SelectItem>
                            <SelectItem value="hours">horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:col-span-2 sm:grid-cols-2">
                      <div className="space-y-1"><label className="text-xs font-semibold text-[var(--text-secondary)]">Mensagem humana: mínimo</label><Input type="number" min="1" value={automation.humanMessageInterval?.minOffers || 8} onChange={e => setAutomation((prev: any) => ({ ...prev, humanMessageInterval: { ...(prev.humanMessageInterval || {}), minOffers: Number(e.target.value) } }))} className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface)]" /></div>
                      <div className="space-y-1"><label className="text-xs font-semibold text-[var(--text-secondary)]">Mensagem humana: máximo</label><Input type="number" min="1" value={automation.humanMessageInterval?.maxOffers || 12} onChange={e => setAutomation((prev: any) => ({ ...prev, humanMessageInterval: { ...(prev.humanMessageInterval || {}), maxOffers: Number(e.target.value) } }))} className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface)]" /></div>
                      <div className="space-y-1"><label className="text-xs font-semibold text-[var(--text-secondary)]">Repetir produto após (horas)</label><Input type="number" min="1" value={automation.repeatCooldownHours || 4} onChange={e => setAutomation((prev: any) => ({ ...prev, repeatCooldownHours: Number(e.target.value) }))} className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface)]" /></div>
                      <div className="space-y-1"><label className="text-xs font-semibold text-[var(--text-secondary)]">Repostar campeão após (horas)</label><Input type="number" min="1" value={automation.championRepostAfterHours || 6} onChange={e => setAutomation((prev: any) => ({ ...prev, championRepostAfterHours: Number(e.target.value) }))} className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface)]" /></div>
                    </div>
                    
                    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:col-span-2">
                      <p className="text-xs font-semibold text-[var(--foreground)]">Categorias que o piloto automático pode buscar</p>
                      <ScrollArea className="flex flex-wrap gap-1.5">
                        {PRIORITIZED_AUTOMATION_CATEGORIES.map(category => { 
                          const checked = selectedAutomationCategoryIds.includes(category.id); 
                          return (
                            <Button key={category.id} type="button" variant={checked ? 'default' : 'outline'} size="sm" onClick={() => setAutomation((prev: any) => ({ ...prev, categories: checked ? prev.categories.filter((item: string) => item !== category.id) : [...(prev.categories || []), category.id] }))}>
                              {checked && '✓ '}{category.label}
                            </Button>
                          );
                        })}
                      </ScrollArea>
                    <p className="mt-1.5 text-[8px] text-[var(--text-secondary)]">Sem categoria marcada, busca ofertas em alta de todos os nichos.</p>
                    </div>

                    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:col-span-2">
                      <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--foreground)]">Faixas de horário e categorias</p><Button type="button" variant="outline" size="sm" onClick={addScheduleSlot}>Adicionar faixa</Button></div>
                      {scheduleSlots.map((slot: any, index: number) => (
                        <div key={slot.id || index} className="grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-center">
                          <Switch checked={slot.enabled !== false} onCheckedChange={checked => updateScheduleSlot(index, { enabled: checked })} aria-label="Ativar faixa" />
                          <Input type="time" value={slot.from || ''} onChange={e => updateScheduleSlot(index, { from: e.target.value })} className="h-8" />
                          <Input type="time" value={slot.until || ''} onChange={e => updateScheduleSlot(index, { until: e.target.value })} className="h-8" />
                          <Input value={Array.isArray(slot.categories) ? slot.categories.join(', ') : ''} onChange={e => updateScheduleSlot(index, { categories: e.target.value.split(',').map((item: string) => item.trim()).filter(Boolean) })} placeholder="categorias separadas por vírgula" className="h-8" />
                          <div className="flex gap-1"><Button type="button" variant="ghost" size="icon-sm" onClick={() => moveScheduleSlot(index, -1)} aria-label="Mover faixa para cima">↑</Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => moveScheduleSlot(index, 1)} aria-label="Mover faixa para baixo">↓</Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => removeScheduleSlot(index)} aria-label="Excluir faixa"><X className="h-3.5 w-3.5" /></Button></div>
                        </div>
                      ))}
                      {!scheduleSlots.length && <p className="text-[10px] text-[var(--text-secondary)]">Nenhuma faixa personalizada. O sistema usará as faixas padrão.</p>}
                    </div>
                    
                    <p className="rounded-xl bg-[var(--primary)]/10 p-2 text-[10px] font-semibold text-[var(--foreground)] sm:col-span-2">Previsão: até {automationCapacity} {automationCapacity === 1 ? 'oferta' : 'ofertas'} neste período, contando a primeira no horário de início.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setAutomation((prev: any) => ({ ...prev, groups: groups.map(group => ({ id: group.id, name: group.name, sessionId: (group as any).sessionId })) }))}>Selecionar todos os grupos</Button></div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">Grupos que receberão as próximas ofertas ({groups.length})</p>
                      {onRefreshGroups && (
                        <button
                          type="button"
                          disabled={refreshingGroups}
                          onClick={async () => {
                            setRefreshingGroups(true);
                            try {
                              await onRefreshGroups();
                              showToast('Lista de grupos atualizada', groups.length ? undefined : 'Nenhum grupo retornado — confira a conexão do WhatsApp.', 'success');
                            } catch {
                              showToast('Não foi possível atualizar', 'Tente novamente.', 'error');
                            } finally {
                              setRefreshingGroups(false);
                            }
                          }}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] transition hover:text-[var(--foreground)] disabled:opacity-60"
                        >
                          <RotateCw className={`h-3 w-3 ${refreshingGroups ? 'animate-spin' : ''}`} />
                          {refreshingGroups ? 'Atualizando…' : 'Atualizar'}
                        </button>
                      )}
                    </div>
                    <ScrollArea className="grid max-h-40 gap-1.5 sm:grid-cols-2">
                      {groups.map(group => { 
                        const checked = selectedAutomationIds.includes(String(group.id)); 
                        return (
                          <Button key={group.id} type="button" variant={checked ? 'default' : 'outline'} className="flex items-center justify-start gap-2 text-left" onClick={() => setAutomation((prev: any) => {
                            const current = Array.isArray(prev.groups) ? prev.groups : [];
                            return { ...prev, groups: checked ? current.filter((item: any) => String(item.id) !== String(group.id)) : [...current, { id: group.id, name: group.name, sessionId: (group as any).sessionId }] };
                          })}>
                            <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${checked ? 'border-white bg-white/25 text-white' : 'border-current opacity-50'}`}>
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="truncate">{group.name}</span>
                          </Button>
                        );
                      })}
                    </ScrollArea>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[var(--primary)]" />
                      <Input type="number" min="10" value={automation.interval?.value || 30} onChange={e => setAutomation((prev: any) => ({ ...prev, interval: { ...(prev.interval || {}), value: Number(e.target.value) } }))} className="h-8 w-16 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)]" />
                      <Select value={automation.interval?.unit || 'seconds'} onValueChange={e => setAutomation((prev: any) => ({ ...prev, interval: { ...(prev.interval || {}), unit: e } }))}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">segundos</SelectItem>
                          <SelectItem value="minutes">minutos</SelectItem>
                          <SelectItem value="hours">horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-2">
                    <Button variant="outline" onClick={saveAutomation} disabled={savingAutomation} className="btn-amber-outline w-full rounded-xl sm:w-auto">
                      {savingAutomation ? 'Salvando...' : automation.enabled ? 'Atualizar automação' : 'Salvar automação'}
                    </Button>
                  </div>
                </div>
                </CardContent>
              )}
          </div>
        </TabsContent>

        <TabsContent value="grupos" className="mt-4">
          <div className="panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Meus Grupos</CardTitle>
                  <CardDescription>Gerencie os grupos que vão receber seus disparos.</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={onOpenGroups} className="btn-brand gap-1.5 rounded-xl text-white">
                <Search className="h-3.5 w-3.5" /> Selecionar grupos
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Fechamento funcional: valores reais dos grupos (sem mock).
                  Antes: 2 / 5 / 4 fixos. Agora: derivados de `groups`. */}
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2">
                  <b className="block text-lg text-[var(--foreground)]">{groups.length.toLocaleString('pt-BR')}</b>
                  <span className="text-[9px] text-[var(--text-secondary)]">Grupos ativos</span>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2">
                  <b className="block text-lg text-[var(--foreground)]">{groups.reduce((sum, g) => sum + (Number(g.memberCount) || 0), 0).toLocaleString('pt-BR')}</b>
                  <span className="text-[9px] text-[var(--text-secondary)]">Membros</span>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2">
                  <b className="block text-lg text-[var(--foreground)]">{groups.reduce((sum, g) => sum + (Number((g as any).messagesSent30d) || 0), 0).toLocaleString('pt-BR')}</b>
                  <span className="text-[9px] text-[var(--text-secondary)]">Enviadas</span>
                </div>
              </div>
            </CardContent>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default FilaPage;
