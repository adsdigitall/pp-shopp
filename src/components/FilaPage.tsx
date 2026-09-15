import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Sun, Target, XCircle } from 'lucide-react';
import { KpiCard } from '@/components/visao-geral/KpiCard';
import { QueueRow, IconAction } from '@/components/fila/QueueRow';
import { QueueDetailPanel } from '@/components/fila/QueueDetailPanel';
import { fetchQueueOverview, formatBRL, formatInterval, formatWhen, inferMarketplace, type QueueOverview } from '@/services/queueOverview';
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
import { Icon3D } from '@/components/ui/Icon3D';

// Ids = slugs do plano de descoberta do backend (AUTOMATION_CATEGORY_PLAN);
// os rótulos exibidos continuam humanos. Não mudar os ids sem alinhar com
// canonicalAutomationCategoryId no backend, senão o salvo não dá match.
const PRIORITIZED_AUTOMATION_CATEGORIES = [
  { id: 'essenciais-dia-a-dia', label: 'Essenciais do dia a dia (casa, limpeza, higiene, café)' },
  { id: 'casa-cozinha', label: 'Casa e cozinha (50%)' },
  { id: 'beleza-autocuidado', label: 'Beleza e autocuidado (20%)' },
  { id: 'organizacao', label: 'Organização (15%)' },
  { id: 'moda-feminina', label: 'Moda feminina barata (10%)' },
  { id: 'utilidades', label: 'Utilidades do dia a dia (5%)' },
  { id: 'maternidade-infantil', label: 'Maternidade e infantil' },
  { id: 'cama-mesa-banho', label: 'Cama, mesa e banho' },
  { id: 'banheiro', label: 'Banheiro' },
  { id: 'acessorios-femininos', label: 'Acessórios femininos' },
  { id: 'eletronicos-baratos', label: 'Eletrônicos baratos' },
];

const DEFAULT_SLOT_CATEGORIES = [
  ['casa-cozinha'], ['organizacao'], ['utilidades', 'casa-cozinha'],
  ['beleza-autocuidado'], ['moda-feminina'], ['casa-cozinha', 'utilidades'],
  ['melhores-ofertas'], ['eletronicos-baratos', 'beleza-autocuidado'],
];

const normalizeScheduleSlotsForUi = (slots: any[]) => slots.map((slot, index) => ({
  ...slot,
  categories: Array.isArray(slot?.categories) && slot.categories.length
    ? slot.categories
    : (DEFAULT_SLOT_CATEGORIES[index] || ['utilidades']),
}));

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
  /** Puxa a lista completa de grupos em silêncio ao abrir a Automação. */
  onRefreshGroups?: () => Promise<void> | void;
  /** Remove várias ofertas com um único aviso. */
  onRemoveManyFromQueue: (queueIds: string[]) => void;
  /** Tela visível: só então consulta os disparos. */
  isActive: boolean;
}

const marketplaceLabel = (m?: string) =>
  m === 'shopee' ? 'Shopee'
  : m === 'mercado_livre' ? 'Mercado Livre'
  : m === 'amazon' ? 'Amazon'
  : m === 'magalu' ? 'Magalu'
  : (m || '—');

const marketplaceDot = (m?: string) =>
  m === 'shopee' ? 'bg-[var(--primary)]'
  : m === 'mercado_livre' ? 'bg-[#ffe600]'
  : m === 'amazon' ? 'bg-[#ff9900]'
  : m === 'magalu' ? 'bg-[#0086ff]'
  : 'bg-[var(--text-secondary)]';

type QueueView = 'pendentes' | 'agendadas' | 'enviadas' | 'falhas' | 'automacao' | 'grupos';
const PAGE_SIZE = 6;

const todayLine = () => {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Espelho dos horários padrão do backend (server/services/automation/rhythm.mjs).
const RHYTHM_DEFAULTS = [
  { id: 'bom-dia', label: 'Bom dia', time: '07:30', enabled: true },
  { id: 'aquecimento', label: 'Aquecimento (10 min antes)', time: '07:50', enabled: true },
  { id: 'almoco', label: 'Pausa do almoço', time: '12:00', enabled: true },
  { id: 'voltei', label: 'Voltei do almoço', time: '13:00', enabled: true },
  { id: 'tarde', label: 'Fim de tarde', time: '18:00', enabled: true },
  { id: 'boa-noite', label: 'Boa noite', time: '22:50', enabled: true },
];

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
  onRemoveManyFromQueue,
  isActive,
}) => {
  const [view, setView] = useState<QueueView>('pendentes');
  const [overview, setOverview] = useState<QueueOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<'recentes' | 'antigas' | 'desconto'>('recentes');

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await fetchQueueOverview());
      setOverviewError(null);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Não foi possível carregar os disparos.');
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    void loadOverview();
    const id = window.setInterval(() => { void loadOverview(); }, 30_000);
    return () => window.clearInterval(id);
  }, [isActive, loadOverview]);
  const [automation, setAutomation] = useState<any>({ enabled: false, mode: 'manual', groups: [], interval: { value: 7, unit: 'minutes' }, offerInterval: { value: 7, unit: 'minutes' }, humanMessageInterval: { minOffers: 8, maxOffers: 12 }, repeatCooldownHours: 4, championRepostAfterHours: 6, activeFrom: '08:00', activeUntil: '23:00', activeDays: [0, 1, 2, 3, 4, 5, 6], humanTone: true, rhythmEnabled: true, dailyRhythm: undefined });
  const [savingAutomation, setSavingAutomation] = useState(false);

  // Ao abrir a Automação, puxa a lista completa em silêncio: sem botão,
  // só scroll com todos os grupos (união ao vivo + salvos).
  useEffect(() => {
    if (view !== 'automacao' || !onRefreshGroups) return;
    Promise.resolve(onRefreshGroups()).catch(() => undefined);
  }, [view, onRefreshGroups]);

  useEffect(() => {
    fetch('/api/dispatch/automation', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(body => {
      if (body?.config) setAutomation({
        ...body.config,
        scheduleSlots: Array.isArray(body.config.scheduleSlots)
          ? normalizeScheduleSlotsForUi(body.config.scheduleSlots)
          : body.config.scheduleSlots,
      });
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
      const response = await fetch('/api/dispatch/automation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: automation.enabled, mode: automation.mode === 'auto' ? 'auto' : 'manual', groupIds: selectedAutomationIds, categoryIds: selectedAutomationCategoryIds, interval: automation.interval, offerInterval: automation.offerInterval || automation.interval, humanMessageInterval: automation.humanMessageInterval, repeatCooldownHours: automation.repeatCooldownHours, championRepostAfterHours: automation.championRepostAfterHours, batchSize: automation.batchSize || 10, aiEnabled: automation.aiEnabled === true, activeFrom: automation.activeFrom || '08:00', activeUntil: automation.activeUntil || '23:00', activeDays: automation.activeDays, humanTone: automation.humanTone !== false, rhythmEnabled: automation.rhythmEnabled !== false, dailyRhythm: (automation.dailyRhythm || []).map((s: any) => ({ id: s.id, time: s.time, enabled: s.enabled !== false })), scheduleSlots: automation.scheduleSlots }) });
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

  const tabsValue = view === 'automacao' || view === 'grupos' ? view : 'fila';
  const scheduledCount = overview?.counts.scheduled ?? 0;
  const statusTabs: { id: QueueView; label: string; count: number | null }[] = [
    { id: 'pendentes', label: 'Pendentes', count: readyItems.length },
    { id: 'agendadas', label: 'Agendadas', count: overview ? scheduledCount : null },
    { id: 'enviadas', label: 'Enviadas', count: overview ? overview.sent.length : null },
    { id: 'falhas', label: 'Falhas', count: overview ? overview.failed.length : null },
  ];

  const sortedPending = [...readyItems].sort((a, b) => {
    if (sort === 'desconto') return (Number(b.product.discountPercentage) || 0) - (Number(a.product.discountPercentage) || 0);
    const diff = new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    return sort === 'antigas' ? -diff : diff;
  });

  const listKeys: string[] = view === 'pendentes' ? sortedPending.map((item) => `p:${item.id}`)
    : view === 'agendadas' ? (overview?.scheduled || []).map((d) => `s:${d.jobId}`)
    : view === 'enviadas' ? (overview?.sent || []).map((e) => `e:${e.jobId}:${e.at}`)
    : view === 'falhas' ? (overview?.failed || []).map((e) => `f:${e.jobId}:${e.at}`)
    : [];
  const totalPages = Math.max(1, Math.ceil(listKeys.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const activeFocus = focusKey && listKeys.includes(focusKey) ? focusKey : listKeys[pageStart] || null;
  const automationGroupList: { id: string; name?: string }[] = Array.isArray(automation.groups) ? automation.groups.map((g: any) => ({ id: String(g.id), name: g.name })) : [];

  const cancelDispatch = async (jobId: string) => {
    if (!window.confirm('Cancelar este disparo? Os envios já feitos continuam nos grupos.')) return;
    try {
      const response = await fetch(`/api/dispatch/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível cancelar.');
      showToast('Disparo cancelado', undefined, 'info');
      void loadOverview();
    } catch (error) {
      showToast('Não foi possível cancelar', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    }
  };

  const sendNow = async (queueId: string) => {
    if (!onSendNow) return;
    await onSendNow(queueId);
    window.setTimeout(() => { void loadOverview(); }, 1500);
  };

  const removeSelected = () => {
    const ids = queueItems.filter((item) => item.selected).map((item) => item.id);
    if (!ids.length || !window.confirm(`Remover ${ids.length} oferta(s) selecionada(s) da fila?`)) return;
    onRemoveManyFromQueue(ids);
  };

  const clearQueue = () => {
    if (!queueItems.length || !window.confirm('Limpar a fila inteira? Todas as ofertas pendentes serão removidas.')) return;
    onClearQueue();
  };

  const pagination = listKeys.length > PAGE_SIZE && (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Página anterior" className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--text-body)] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
        .map((n, index, arr) => (
          <span key={n} className="flex items-center gap-1.5">
            {index > 0 && n - arr[index - 1] > 1 && <span className="text-[var(--text-muted)]">…</span>}
            <button type="button" onClick={() => setPage(n)} aria-current={n === safePage ? 'page' : undefined} className={`h-9 min-w-9 rounded-xl border px-2 text-sm ${n === safePage ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] text-[var(--text-secondary)]'}`}>{n}</button>
          </span>
        ))}
      <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Próxima página" className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--text-body)] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );

  const renderRows = () => {
    const slice = (keys: string[]) => keys.slice(pageStart, pageStart + PAGE_SIZE);
    if (view === 'pendentes') {
      const visible = sortedPending.slice(pageStart, pageStart + PAGE_SIZE);
      return visible.map((item) => {
        const key = `p:${item.id}`;
        const product = item.product;
        return (
          <QueueRow
            key={key}
            image={product.imageUrl || null}
            title={product.name}
            subtitle={<>
              {product.currentPrice != null && <strong className="font-semibold text-[var(--text-body)]">{formatBRL(product.currentPrice)}</strong>}
              {product.discountPercentage != null && product.discountPercentage > 0 && <span className="text-[var(--green-400)]"> · {Math.round(product.discountPercentage)}% OFF</span>}
              {product.salesCount != null && product.salesCount > 0 && <span> · {product.salesCount.toLocaleString('pt-BR')} vendidos</span>}
            </>}
            marketplace={inferMarketplace(product.marketplace, product.affiliateUrl, product.productUrl)}
            groupsLabel={automationGroupList.length ? `${automationGroupList.length} ${automationGroupList.length === 1 ? 'grupo' : 'grupos'}` : 'Sem grupos'}
            intervalLabel="Imediato"
            whenLabel={formatWhen(item.addedAt)}
            pill={{ tone: 'pending', label: 'Pendente' }}
            selectable={{ checked: item.selected, onToggle: () => onToggleSelection(item.id) }}
            focused={activeFocus === key}
            onFocus={() => setFocusKey(key)}
            iconActions={<>
              <IconAction label="Copiar link de afiliado" onClick={() => copyAffiliateLink(product.affiliateUrl)}><Copy className="h-4 w-4" /></IconAction>
              <IconAction label="Remover da fila" danger onClick={() => onRemoveFromQueue(item.id)}><Trash2 className="h-4 w-4" /></IconAction>
            </>}
            primaryAction={onSendNow ? (
              <button type="button" onClick={() => void sendNow(item.id)} disabled={!automationGroupList.length} title={automationGroupList.length ? 'Enviar agora para os grupos da automação' : 'Defina os grupos na Automação'} className="btn-brand inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold disabled:cursor-not-allowed">
                <Send className="h-4 w-4" /> Disparar agora
              </button>
            ) : undefined}
          />
        );
      });
    }
    if (view === 'agendadas') {
      const byKey = new Map((overview?.scheduled || []).map((d) => [`s:${d.jobId}`, d]));
      return slice(listKeys).map((key) => {
        const d = byKey.get(key)!;
        const statusPill = d.status === 'running' ? { tone: 'running' as const, label: 'Enviando' }
          : d.status === 'paused' ? { tone: 'pending' as const, label: 'Pausada' }
          : d.status === 'waiting_connection' ? { tone: 'failed' as const, label: 'Aguardando WhatsApp' }
          : { tone: 'scheduled' as const, label: 'Agendada' };
        return (
          <QueueRow
            key={key}
            image={d.product.image}
            title={d.product.name}
            subtitle={<>{d.automatic ? 'Automação' : 'Disparo manual'}{d.offersCount > 1 ? ` · ${d.offersCount} ofertas` : ''} · {d.sent} de {d.total} envio(s)</>}
            marketplace={inferMarketplace(d.product.marketplace, d.product.affiliateUrl)}
            groupsLabel={`${d.groupsCount} ${d.groupsCount === 1 ? 'grupo' : 'grupos'}`}
            intervalLabel={formatInterval(d.interval)}
            whenLabel={formatWhen(d.scheduledAt || d.createdAt)}
            pill={statusPill}
            focused={activeFocus === key}
            onFocus={() => setFocusKey(key)}
            iconActions={<IconAction label="Cancelar disparo" danger onClick={() => void cancelDispatch(d.jobId)}><XCircle className="h-4 w-4" /></IconAction>}
          />
        );
      });
    }
    const events = view === 'enviadas' ? overview?.sent || [] : overview?.failed || [];
    const prefix = view === 'enviadas' ? 'e' : 'f';
    const byKey = new Map(events.map((e) => [`${prefix}:${e.jobId}:${e.at}`, e]));
    return slice(listKeys).map((key) => {
      const e = byKey.get(key)!;
      return (
        <QueueRow
          key={key}
          image={e.product.image}
          title={e.product.name}
          subtitle={view === 'falhas' && e.error ? <span className="text-[var(--red-400)]">{e.error}</span> : <>{e.automatic ? 'Automação' : 'Disparo manual'}{e.product.price != null ? ` · ${formatBRL(e.product.price)}` : ''}</>}
          marketplace={inferMarketplace(e.product.marketplace, e.product.affiliateUrl)}
          groupsLabel={`${e.groupsCount} ${e.groupsCount === 1 ? 'grupo' : 'grupos'}`}
          intervalLabel={e.automatic ? 'Automático' : 'Manual'}
          whenLabel={formatWhen(e.at)}
          pill={view === 'enviadas' ? { tone: 'sent', label: 'Enviada' } : { tone: 'failed', label: 'Falha' }}
          focused={activeFocus === key}
          onFocus={() => setFocusKey(key)}
          iconActions={e.product.affiliateUrl ? <IconAction label="Copiar link de afiliado" onClick={() => copyAffiliateLink(e.product.affiliateUrl!)}><Copy className="h-4 w-4" /></IconAction> : null}
        />
      );
    });
  };

  const renderPanel = () => {
    if (!activeFocus) return null;
    const close = () => setFocusKey(null);
    if (activeFocus.startsWith('p:')) {
      const item = readyItems.find((q) => `p:${q.id}` === activeFocus);
      if (!item) return null;
      return (
        <QueueDetailPanel
          kind="pending"
          item={item}
          groupsCatalog={groups}
          automationGroups={automationGroupList}
          onClose={close}
          onCopy={() => copyAffiliateLink(item.product.affiliateUrl)}
          onRemove={() => onRemoveFromQueue(item.id)}
          onSendNow={onSendNow ? () => void sendNow(item.id) : undefined}
          onSeeGroups={() => setView('automacao')}
        />
      );
    }
    if (activeFocus.startsWith('s:')) {
      const dispatch = overview?.scheduled.find((d) => `s:${d.jobId}` === activeFocus);
      return dispatch ? <QueueDetailPanel kind="scheduled" dispatch={dispatch} groupsCatalog={groups} onClose={close} onCancel={() => void cancelDispatch(dispatch.jobId)} /> : null;
    }
    const isSent = activeFocus.startsWith('e:');
    const event = (isSent ? overview?.sent : overview?.failed)?.find((e) => `${isSent ? 'e' : 'f'}:${e.jobId}:${e.at}` === activeFocus);
    return event ? <QueueDetailPanel kind={isSent ? 'sent' : 'failed'} event={event} groupsCatalog={groups} onClose={close} onCopy={() => event.product.affiliateUrl && copyAffiliateLink(event.product.affiliateUrl)} /> : null;
  };

  const emptyText: Record<string, { title: string; hint: string }> = {
    pendentes: { title: 'Nenhuma oferta pendente', hint: 'Garimpe ofertas ou aguarde o próximo ciclo automático.' },
    agendadas: { title: 'Nenhum disparo agendado', hint: 'Disparos criados e ofertas da automação aparecem aqui até serem enviados.' },
    enviadas: { title: 'Nada enviado ainda', hint: 'As ofertas entregues aos grupos aparecem aqui.' },
    falhas: { title: 'Nenhuma falha', hint: 'Se algum envio der erro, o motivo aparece aqui.' },
  };

  return (
    <section id="ofertas-fila" className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Sun className="h-4 w-4" /> {todayLine()}</p>
          <h1 className="mt-1.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-title)] sm:text-[34px]">Fila</h1>
          <p className="mt-1 text-[15px] text-[var(--text-body)]">Organize, edite e acompanhe as ofertas prontas para disparo.</p>
        </div>
        <button type="button" onClick={() => setView('automacao')} className="panel flex items-center gap-4 p-4 text-left transition-colors hover:border-[var(--border-brand)] lg:min-w-[330px]">
          <Icon3D icon={Target} size={56} />
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-[var(--text-title)]">Mantenha sua fila organizada.</span>
            <span className="block text-[13px] text-[var(--text-secondary)]">Ajuste a automação e os grupos.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Clock} label="Pendentes" info="Ofertas completas esperando revisão na fila." display={readyItems.length.toLocaleString('pt-BR')} value={readyItems.length} previous={0} series={[]} comparison="" note="prontas pra disparar" />
        <KpiCard icon={CalendarDays} label="Agendadas" info="Disparos criados que ainda não terminaram (inclui a automação)." display={overview ? scheduledCount.toLocaleString('pt-BR') : '—'} value={scheduledCount} previous={0} series={[]} comparison="" note={overview ? 'aguardando envio' : 'carregando…'} />
        <KpiCard icon={Send} label="Enviadas hoje" info="Ofertas entregues aos grupos hoje (horário de Brasília)." display={overview ? overview.counts.sentToday.toLocaleString('pt-BR') : '—'} value={overview?.counts.sentToday ?? 0} previous={overview?.counts.sentYesterday ?? 0} series={overview?.series.sent ?? []} comparison="vs. ontem" unavailable={!overview} footnote={overview ? undefined : overviewError || 'carregando…'} />
        <KpiCard icon={AlertCircle} label="Falhas" info="Ofertas que falharam hoje ao enviar para algum grupo." display={overview ? overview.counts.failedToday.toLocaleString('pt-BR') : '—'} value={overview?.counts.failedToday ?? 0} previous={overview?.counts.failedYesterday ?? 0} series={overview?.series.failed ?? []} comparison="vs. ontem" invertTone unavailable={!overview} footnote={overview ? undefined : overviewError || 'carregando…'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusTabs.map((tab) => {
          const active = view === tab.id;
          return (
            <button key={tab.id} type="button" onClick={() => { setView(tab.id); setPage(1); setFocusKey(null); }} aria-pressed={active} className={`inline-flex h-11 items-center gap-2.5 rounded-xl border px-4 text-sm font-medium transition-colors ${active ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}>
              {tab.label}
              <span className={`rdo-num min-w-6 rounded-full px-1.5 py-0.5 text-xs font-bold ${active ? 'bg-[var(--brand-500)] text-white' : 'bg-white/[.07] text-[var(--text-body)]'}`}>{tab.count ?? '—'}</span>
            </button>
          );
        })}
        <span className="mx-1 hidden h-6 w-px bg-[var(--border-default)] sm:block" />
        {([['automacao', 'Automação', Zap], ['grupos', 'Grupos', Users]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${view === id ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <Tabs value={tabsValue} className="w-full">
        <TabsContent value="fila" className="mt-0">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] xl:items-start">
            <div className="min-w-0 space-y-3">
              {view === 'pendentes' && (
                <div className="panel flex flex-wrap items-center gap-2 p-2.5">
                  <button type="button" onClick={handleToggleSelectAll} aria-pressed={selectedAll} className="inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-[13px] text-[var(--text-body)]">
                    <span className={`grid h-5 w-5 place-items-center rounded-md border ${selectedAll ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white' : 'border-[var(--border-strong)]'}`}>{selectedAll && <Check className="h-3.5 w-3.5" />}</span>
                    Selecionar todos
                  </button>
                  <button type="button" onClick={onOpenDispatch} disabled={!selectedCount} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-title)] hover:border-[var(--border-brand)] disabled:opacity-40"><Send className="h-4 w-4 text-[var(--brand-500)]" /> Disparar selecionados{selectedCount ? ` (${selectedCount})` : ''}</button>
                  <button type="button" onClick={removeSelected} disabled={!selectedCount} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--red-400)] hover:border-[rgba(239,68,68,.45)] disabled:opacity-40"><Trash2 className="h-4 w-4" /> Remover</button>
                  <button type="button" onClick={clearQueue} disabled={!queueItems.length} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] text-[var(--text-secondary)] hover:text-[var(--red-400)] disabled:opacity-40">Limpar fila</button>
                  <div className="ml-auto flex items-center gap-2">
                    <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }} aria-label="Ordenar" className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-input)] px-3 text-[13px] text-[var(--text-title)] outline-none">
                      <option value="recentes">Mais recentes</option>
                      <option value="antigas">Mais antigas</option>
                      <option value="desconto">Maior desconto</option>
                    </select>
                    <button type="button" onClick={() => onAddToQueue()} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-title)] hover:border-[var(--border-brand)]"><Plus className="h-4 w-4 text-[var(--brand-500)]" /> Garimpar</button>
                  </div>
                </div>
              )}

              {view === 'pendentes' && incompleteItems.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-[rgba(245,158,11,.3)] bg-[var(--surface-amber-soft)] p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber-400)]" />
                  <p className="text-xs text-[var(--text-body)]"><strong className="text-[var(--amber-400)]">{incompleteItems.length} oferta(s) incompleta(s) bloqueada(s).</strong> Sem nome, preço ou link válido, não serão enviadas. Use "Limpar fila" para removê-las.</p>
                </div>
              )}

              {view !== 'pendentes' && !overview && (
                <div className="panel p-6 text-center text-sm text-[var(--text-secondary)]">{overviewError ? <span className="text-[var(--red-400)]">{overviewError}</span> : 'Carregando disparos…'}</div>
              )}

              {(view === 'pendentes' || overview) && (listKeys.length === 0 ? (
                <div className="empty-state p-8 text-center">
                  <Boxes className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                  <p className="mt-2 text-sm font-semibold text-[var(--text-title)]">{emptyText[view]?.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{emptyText[view]?.hint}</p>
                  {view === 'pendentes' && <button type="button" onClick={() => onAddToQueue()} className="btn-brand mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold">Garimpar ofertas</button>}
                </div>
              ) : (
                <div className="space-y-2.5">{renderRows()}</div>
              ))}

              {listKeys.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-[13px] text-[var(--text-secondary)]">Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, listKeys.length)} de {listKeys.length}</p>
                  {pagination}
                </div>
              )}
            </div>

            <div className="xl:sticky xl:top-4">{renderPanel()}</div>
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
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Dias de envio</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label, day) => {
                          const active = (automation.activeDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(day);
                          return (
                            <Button key={day} type="button" variant={active ? 'default' : 'outline'} size="sm" onClick={() => setAutomation((prev: any) => {
                              const current: number[] = Array.isArray(prev.activeDays) ? prev.activeDays : [0, 1, 2, 3, 4, 5, 6];
                              const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort();
                              return { ...prev, activeDays: next.length ? next : current };
                            })} className="h-8 w-9 px-0 text-xs font-black" aria-pressed={active} title={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day]}>
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] leading-3 text-[var(--text-secondary)]">Dias apagados não enviam nada — parece gente, não robô de todo dia.</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:col-span-2">
                      <div>
                        <p className="text-xs font-semibold text-[var(--foreground)]">Tom humano feminino</p>
                        <p className="text-[9px] leading-3 text-[var(--text-secondary)]">Mensagens variadas e naturais, como mulher falando com mulheres. Sem nome, sem assinatura.</p>
                      </div>
                      <Switch checked={automation.humanTone !== false} onCheckedChange={(checked) => setAutomation((prev: any) => ({ ...prev, humanTone: checked }))} aria-label="Ativar tom humano" />
                    </div>
                    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 sm:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[var(--foreground)]">Ritmo diário humanizado</p>
                          <p className="text-[9px] leading-3 text-[var(--text-secondary)]">Bom dia, aquecimento, almoço, voltei, fim de tarde e boa noite — todo dia, no mesmo ritmo.</p>
                        </div>
                        <Switch checked={automation.rhythmEnabled !== false} onCheckedChange={(checked) => setAutomation((prev: any) => ({ ...prev, rhythmEnabled: checked }))} aria-label="Ativar ritmo diário" />
                      </div>
                      {(automation.rhythmEnabled !== false) && (
                        <div className="space-y-1.5">
                          {(Array.isArray(automation.dailyRhythm) && automation.dailyRhythm.length ? automation.dailyRhythm : RHYTHM_DEFAULTS).map((slot: any) => (
                            <div key={slot.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                              <Switch checked={slot.enabled !== false} onCheckedChange={(checked) => setAutomation((prev: any) => {
                                const base = Array.isArray(prev.dailyRhythm) && prev.dailyRhythm.length ? prev.dailyRhythm : RHYTHM_DEFAULTS;
                                return { ...prev, dailyRhythm: base.map((s: any) => (s.id === slot.id ? { ...s, enabled: checked } : s)) };
                              })} aria-label={`Ativar ${slot.label}`} />
                              <Input type="time" value={slot.time || ''} onChange={e => setAutomation((prev: any) => {
                                const base = Array.isArray(prev.dailyRhythm) && prev.dailyRhythm.length ? prev.dailyRhythm : RHYTHM_DEFAULTS;
                                return { ...prev, dailyRhythm: base.map((s: any) => (s.id === slot.id ? { ...s, time: e.target.value } : s)) };
                              })} className="h-7 w-24 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)] text-xs" />
                              <span className="text-[11px] font-semibold text-[var(--text-primary)]">{slot.label || slot.id}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1 sm:col-span-2">
                      <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">Ofertas por ciclo (tudo da categoria)
                        <Input type="number" min="1" max="50" value={automation.batchSize || 10} onChange={e => setAutomation((prev: any) => ({ ...prev, batchSize: Math.min(50, Math.max(1, Number(e.target.value) || 1)) }))} className="h-7 w-14 rounded-lg border-[var(--border)] bg-[var(--surface-elevated)]" />
                        <span className="text-[9px] font-normal text-[var(--text-secondary)]">quantas entram por vez (1–50)</span>
                      </label>
                    </div>
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
                    </div>
                    <ScrollArea className="grid h-64 max-h-[45vh] gap-1.5 pr-1 sm:grid-cols-2">
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
