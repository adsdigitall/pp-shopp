import React, { useState, useCallback, useEffect } from 'react';
import { Product, QueueItem, Template, Group, DispatchStep, IntervalUnit } from '../types/product';
import { ChevronLeft, ChevronRight, Check, X, Send, MessageSquare, Users, Clock, Moon, Sun, Calendar, RotateCcw, AlertTriangle, CheckCircle2, Radio, Layers, Zap, Shuffle, List, Copy, Trash2, Plus, Search, AlertCircle, BarChart2, Box, Image, Eye, Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { DEFAULT_OFFER_TEMPLATES } from '../services/offerTemplates';

interface DispararPageProps {
  isOpen: boolean;
  onClose: () => void;
  offers: Product[];
  queueItems: QueueItem[];
  templates: Template[];
  groups: Group[];
  onSaveQueueSelection: (selectedIds: string[]) => void;
  onSaveMessage: (message: { whatsapp: { enabled: boolean; templateId: string; customMessage: string; showImage: boolean; rotatingCTAs: boolean; templateMode: 'fixed' | 'rotate'; templatePool?: { id: string; message: string }[] } }) => void;
  onSaveDestinations: (destinations: { groups: Group[]; schedule: 'now' | 'scheduled'; scheduledAt?: string; interval: { value: number; unit: 'seconds' | 'minutes' | 'hours' }; nightPause: boolean; weekendPause: boolean; expirePause: boolean }) => void;
  onExecuteDispatch: () => Promise<{ jobId: string; status: string } | null>;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const defaultTemplates = DEFAULT_OFFER_TEMPLATES;

const variables = [
  { key: '{TITULO}', label: 'Título do produto' },
  { key: '{PRECO}', label: 'Preço atual' },
  { key: '{PRECO_ANTIGO}', label: 'Preço original' },
  { key: '{DESCONTO}', label: 'Desconto (%)' },
  { key: '{LINK}', label: 'Link de afiliado' },
  { key: '{CUPOM}', label: 'Cupom de desconto' },
  { key: '{CTA}', label: 'Chamada para ação rotativa' },
];

const rotatingCtaExamples = [
  'Confira a oferta antes que o preço mude',
  'Garanta o seu enquanto ainda está disponível',
  'Toque no link e aproveite essa oportunidade',
];

const formatTemplateMessage = (value: string) => value
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const steps = [
  { num: 1, label: 'Ofertas' },
  { num: 2, label: 'Mensagem' },
  { num: 3, label: 'Destinos' },
] as const;

export const DispararPage: React.FC<DispararPageProps> = ({
  isOpen,
  onClose,
  offers,
  queueItems,
  templates: userTemplates,
  groups,
  onSaveQueueSelection,
  onSaveMessage,
  onSaveDestinations,
  onExecuteDispatch,
  onShowToast,
}) => {
  const [step, setStep] = useState<DispatchStep>(1);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('achado-vale-pena');
  const [templateMode, setTemplateMode] = useState<'fixed' | 'rotate'>('fixed');
  const [customMessage, setCustomMessage] = useState(formatTemplateMessage(defaultTemplates[0].message));
  const [showImage, setShowImage] = useState(true);
  const [rotatingCTAs, setRotatingCTAs] = useState(true);
  const [dispatchJob, setDispatchJob] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<'now' | 'scheduled'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [intervalValue, setIntervalValue] = useState(30);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('seconds');
  const [nightPause, setNightPause] = useState(true);
  const [weekendPause, setWeekendPause] = useState(false);
  const [expirePause, setExpirePause] = useState(true);
  const [searchGroups, setSearchGroups] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'ongoing'>('new');
  const [dispatchHistory, setDispatchHistory] = useState<any[]>([]);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [pendingCancelJobId, setPendingCancelJobId] = useState<string | null>(null);

  const refreshHistory = useCallback(() => fetch('/api/dispatch/history', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(body => {
      const history = Array.isArray(body?.history) ? body.history : [];
      setDispatchHistory(history);
      return history;
    })
    .catch(() => []), []);

  useEffect(() => {
    let cancelled = false;
    refreshHistory()
      .then(history => {
        if (cancelled) return;
        if (history.some((job: any) => ['pending', 'running', 'waiting_connection'].includes(job.status))) setActiveTab('ongoing');
      })
    return () => { cancelled = true; };
  }, [refreshHistory]);

  useEffect(() => {
    if (activeTab !== 'ongoing') return;
    void refreshHistory();
    const timer = window.setInterval(() => void refreshHistory(), 3000);
    return () => window.clearInterval(timer);
  }, [activeTab, refreshHistory]);

  const allTemplates = [...defaultTemplates, ...(userTemplates || [])];
  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId) || defaultTemplates[0];

  useEffect(() => {
    if (step !== 1) return;
    setSelectedOffers(queueItems.filter(item => item.selected !== false).map(item => item.id));
  }, [queueItems, step]);

  const previewMessage = useCallback(() => {
    const firstOffer = offers.find(o => selectedOffers.includes(o.id)) || offers[0];
    if (!firstOffer) return customMessage;
    
    let msg = formatTemplateMessage(customMessage);
    if (!firstOffer.originalPrice || firstOffer.originalPrice <= firstOffer.currentPrice) msg = msg.split('\n').filter(line => !line.includes('{PRECO_ANTIGO}')).join('\n');
    msg = msg.replace(/{TITULO}/g, firstOffer.name);
    const brl = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    msg = msg.replace(/{PRECO}/g, firstOffer.currentPrice ? `R$ ${brl(firstOffer.currentPrice)}` : '—');
    msg = msg.replace(/{PRECO_ANTIGO}/g, firstOffer.originalPrice ? `R$ ${brl(firstOffer.originalPrice)}` : '—');
    const desconto = firstOffer.discountPercentage ?? (firstOffer.originalPrice && firstOffer.currentPrice && firstOffer.originalPrice > firstOffer.currentPrice ? Math.round((1 - firstOffer.currentPrice / firstOffer.originalPrice) * 100) : null);
    msg = msg.replace(/{DESCONTO}/g, desconto ? `${desconto}% OFF` : '');
    msg = msg.replace(/{CTA}/g, rotatingCTAs ? rotatingCtaExamples[0] : 'Confira a oferta');
    msg = msg.replace(/{LINK}/g, firstOffer.affiliateUrl || firstOffer.productUrl);
    msg = msg.replace(/{CUPOM}/g, 'CUPOM10');
    const benefits = firstOffer.highlightPoints?.filter(Boolean).slice(0, 4).map(point => `✅ ${point}`).join('\n') || '✅ Oferta encontrada agora';
    msg = msg.replace(/{BENEFICIOS}/g, benefits);
    msg = msg.replace(/{VENDAS}|{SALES}/g, firstOffer.salesCountText || (firstOffer.salesCount ? `+${firstOffer.salesCount.toLocaleString('pt-BR')} vendidos` : ''));
    msg = msg.replace(/{AVALIACAO}|{RATING}/g, firstOffer.rating ? `⭐ ${firstOffer.rating.toFixed(1)} de avaliação` : '');
    return formatTemplateMessage(msg);
  }, [customMessage, offers, selectedOffers, rotatingCTAs]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchGroups.toLowerCase())
  );

  const handleNext = () => {
    if (step === 1) {
      const offersToDispatch = selectedOffers.length
        ? selectedOffers
        : queueItems.map(item => item.id);
      if (offersToDispatch.length === 0) {
        onShowToast('A fila está vazia', 'Adicione pelo menos uma oferta antes de criar o disparo.', 'error');
        return;
      }
      setSelectedOffers(offersToDispatch);
      onSaveQueueSelection(offersToDispatch);
      setStep(2);
    } else if (step === 2) {
      onSaveMessage({
        whatsapp: { enabled: whatsappEnabled, templateId: selectedTemplateId, customMessage: formatTemplateMessage(customMessage), showImage, rotatingCTAs: true, templateMode, templatePool: templateMode === 'rotate' ? allTemplates.map(template => ({ id: template.id, message: template.message })) : undefined }
      });
      setStep(3);
    } else if (step === 3) {
      if (selectedGroups.length === 0) {
        onShowToast('Selecione pelo menos um grupo', undefined, 'error');
        return;
      }
      onSaveDestinations({
        groups: groups.filter(g => selectedGroups.includes(g.id)),
        schedule,
        scheduledAt: schedule === 'scheduled' ? scheduledAt : undefined,
        interval: { value: intervalValue, unit: intervalUnit },
        nightPause,
        weekendPause,
        expirePause,
      });
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as DispatchStep);
  };

  const handleExecute = async () => {
    if (selectedGroups.length === 0) {
      onShowToast('Selecione pelo menos um grupo', undefined, 'error');
      return;
    }
    onSaveDestinations({
      groups: groups.filter(g => selectedGroups.includes(g.id)),
      schedule,
      scheduledAt: schedule === 'scheduled' ? scheduledAt : undefined,
      interval: { value: intervalValue, unit: intervalUnit },
      nightPause,
      weekendPause,
      expirePause,
    });
    setDispatching(true);
    const created = await onExecuteDispatch();
    setDispatching(false);
    if (created?.jobId) {
      setDispatchJob({ id: created.jobId, status: created.status, stats: { sent: 0, failed: 0, pending: totalEnvios } });
      await refreshHistory();
      setActiveTab('ongoing');
    }
  };

  useEffect(() => {
    if (!dispatchJob?.id || ['completed', 'failed', 'cancelled'].includes(dispatchJob.status)) return;
    const refresh = () => fetch(`/api/dispatch/${encodeURIComponent(dispatchJob.id)}`)
      .then(response => response.ok ? response.json() : null)
      .then(job => { if (job) setDispatchJob(job); })
      .catch(() => undefined);
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [dispatchJob?.id, dispatchJob?.status]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const handleVariableInsert = (variable: string) => {
    setCustomMessage(prev => {
      const textarea = document.querySelector('textarea[role="message-editor"]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        return prev.slice(0, start) + variable + prev.slice(end);
      }
      return prev + variable;
    });
  };

  const handleCancelDispatch = async (jobIds: string | string[]) => {
    if (!window.confirm('Cancelar este disparo? Os envios já concluídos serão mantidos, mas nenhum item pendente será enviado.')) return;
    const ids = Array.isArray(jobIds) ? jobIds : [jobIds];
    const requestId = ids.join('|');
    setCancellingJobId(requestId);
    try {
      const results = await Promise.all(ids.map(async id => {
        const response = await fetch(`/api/dispatch/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível cancelar o disparo.');
        return body;
      }));
      if (dispatchJob?.id && ids.includes(dispatchJob.id)) setDispatchJob(results[0]?.job);
      await refreshHistory();
      onShowToast('Disparo cancelado', 'Os envios pendentes foram interrompidos.', 'info');
    } catch (error) {
      onShowToast('Não foi possível cancelar', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally {
      setCancellingJobId(null);
    }
  };

  if (!isOpen) return null;

  const selectedGroupsData = groups.filter(g => selectedGroups.includes(g.id));
  const totalEnvios = selectedOffers.length * selectedGroups.length;
  const activeJobs = dispatchHistory.filter(job => ['pending', 'running', 'waiting_connection'].includes(job.status));
  const visibleActiveJobs = Object.values(activeJobs.reduce((result: Record<string, any>, job: any) => {
    const key = job.source === 'queue_automation' ? `automatico:${job.destinations?.sessionId || 'default'}` : job.id;
    const existing = result[key];
    if (!existing) {
      result[key] = { ...job, id: key, jobIds: [job.id], offers: [...(job.offers || [])], stats: { ...(job.stats || {}) }, destinations: { ...job.destinations, groups: [...(job.destinations?.groups || [])] } };
      return result;
    }
    existing.jobIds.push(job.id);
    existing.offers.push(...(job.offers || []));
    existing.stats.sent = (existing.stats.sent || 0) + (job.stats?.sent || 0);
    existing.stats.failed = (existing.stats.failed || 0) + (job.stats?.failed || 0);
    existing.stats.pending = (existing.stats.pending || 0) + (job.stats?.pending || 0);
    const knownGroups = new Set(existing.destinations.groups.map((group: any) => String(group.id)));
    existing.destinations.groups.push(...(job.destinations?.groups || []).filter((group: any) => !knownGroups.has(String(group.id))));
    if (job.status === 'running') existing.status = 'running';
    return result;
  }, {}));
  const recentJobs = dispatchHistory.filter(job => !['pending', 'running', 'waiting_connection'].includes(job.status));
  const dispatchTabs = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'ongoing')}>
      <TabsList className="flex gap-5 border-b border-[var(--border)] px-3 pt-3 text-[12px]">
        <TabsTrigger value="new" className={`pb-2.5 font-semibold ${activeTab === 'new' ? 'border-b-2 border-[var(--primary)] text-[var(--text-primary)]' : 'border-b-2 border-transparent text-[var(--text-secondary)]'}`}>Novo Disparo</TabsTrigger>
        <TabsTrigger value="ongoing" className={`flex items-center gap-1.5 pb-2.5 font-semibold ${activeTab === 'ongoing' ? 'border-b-2 border-[var(--primary)] text-[var(--text-primary)]' : 'border-b-2 border-transparent text-[var(--text-secondary)]'}`}>Em andamento <span className="grid min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1 text-[9px] text-white">{visibleActiveJobs.length}</span></TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (activeTab === 'ongoing') return (
<section className="dispatch-page min-h-[calc(100dvh-5rem)] w-full bg-[var(--background)] section-enter">
      {dispatchTabs}
      <div className="space-y-5 px-3 py-4 pb-24">
          <header><h2 className="text-xl font-black text-[var(--text-primary)]">Disparos em andamento</h2><p className="mt-1 text-[11px] text-[var(--text-secondary)]">A fila continua no servidor mesmo com o aplicativo fechado.</p></header>
        <div className="space-y-2.5">
          {visibleActiveJobs.map((job: any) => {
            const total = Math.max(1, (job.offers?.length || 0) * (job.destinations?.groups?.length || 0));
            const done = (job.stats?.sent || 0) + (job.stats?.failed || 0);
            const percent = Math.min(100, Math.round(done / total * 100));
            return <Card key={job.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-start justify-between gap-3"><div><span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--warning)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warning)]" />{job.status === 'waiting_connection' ? 'Aguardando conexão' : job.status === 'pending' ? 'Na fila' : 'Enviando'}</span><h3 className="mt-1 text-[13px] font-bold text-[var(--text-primary)]">{job.offers?.length || 0} oferta(s) para {job.destinations?.groups?.length || 0} grupo(s)</h3>{job.jobIds?.length > 1 && <p className="mt-1 text-[9px] text-[var(--text-secondary)]">Piloto automático: {job.jobIds.length} entradas agrupadas nesta linha.</p>}</div><span className="text-[9px] text-[var(--text-secondary)]">{new Date(job.createdAt).toLocaleString('pt-BR')}</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--primary)] transition-[width]" style={{ width: `${percent}%` }} /></div>
              <div className="mt-2 flex justify-between text-[10px] text-[var(--text-secondary)]"><span>{job.stats?.sent || 0} enviados · {job.stats?.failed || 0} falhas</span><span>{percent}% · intervalo {job.destinations?.interval?.value || 30} {job.destinations?.interval?.unit === 'minutes' ? 'min' : job.destinations?.interval?.unit === 'hours' ? 'h' : 's'}</span></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" onClick={() => void handleCancelDispatch(job.jobIds || job.id)} disabled={cancellingJobId === (job.jobIds || [job.id]).join('|')} variant="outline" className="pressable mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--error)]/60 bg-[var(--error)]/10 px-3 text-[10px] font-bold text-[var(--error)] transition hover:bg-[var(--error)]/20 disabled:cursor-wait disabled:opacity-60"><Ban className="h-3.5 w-3.5" />{cancellingJobId === (job.jobIds || [job.id]).join('|') ? 'Cancelando…' : 'Cancelar disparo'}</Button>
                </TooltipTrigger>
                <TooltipContent><span>Cancelar este disparo</span></TooltipContent>
              </Tooltip>
            </Card>;
          })}
          {!activeJobs.length && <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[11px] text-[var(--text-secondary)]">Nenhum disparo em andamento.</div>}
        </div>
        <div><h3 className="mb-2 text-[13px] font-bold text-[var(--text-primary)]">Histórico recente</h3><div className="space-y-2">{recentJobs.slice(0, 10).map(job => <Card key={job.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"><div><p className="text-[11px] font-semibold text-[var(--text-primary)]">{job.offers?.length || 0} oferta(s) · {job.destinations?.groups?.length || 0} grupo(s)</p><p className="text-[9px] text-[var(--text-secondary)]">{new Date(job.createdAt).toLocaleString('pt-BR')} · {job.stats?.sent || 0} enviados</p></div><Badge variant={job.status === 'completed' ? 'success' : 'destructive'} className={`text-[10px] font-bold ${job.status === 'completed' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--error)]/10 text-[var(--error)]'}`}>{job.status === 'completed' ? 'Concluído' : 'Falhou'}</Badge></Card>)}</div></div>
      </div>
    </section>
  );

  return (
    <section className="dispatch-page min-h-[calc(100dvh-5rem)] w-full bg-[var(--background)]">
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col overflow-hidden">
        {dispatchTabs}
        {/* Step Indicator - Top Fixed */}
        <Card className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/90 px-3 py-2.5 backdrop-blur-xl overflow-x-auto no-scrollbar">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1.5 shrink-0">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black transition ${step >= s.num ? 'bg-[var(--primary)] text-white' : 'bg-[var(--border)] text-[var(--text-secondary)]'}`}>
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className={`text-[11px] font-bold whitespace-nowrap ${step === s.num ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>{s.label}</span>
              {i < steps.length - 1 && <span className={`h-0.5 w-6 shrink-0 transition ${step > s.num ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
          <Button onClick={onClose} variant="ghost" size="icon" className="ml-auto shrink-0 rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"><X className="h-4 w-4" /></Button>
         </Card>
         <Separator className="my-2" />

         {/* Step Content */}
         <div key={step} className="dispatch-step-enter flex-1 overflow-y-auto px-3 py-3 pb-24 section-enter">
          {/* Step 1: Ofertas - Compact list with images */}
          {step === 1 && (
            <div className="space-y-3">
              <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-[13px] font-black text-[var(--text-primary)]">Escolha as ofertas</h3><p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">Toque no card para incluir ou retirar.</p></div><Badge variant="default" className="shrink-0 rounded-lg bg-[var(--primary)]/12 px-2 py-1 text-[10px] font-black text-[var(--primary)]">{selectedOffers.length} selecionadas</Badge></div>
                <Button type="button" onClick={() => setSelectedOffers(selectedOffers.length === queueItems.length ? [] : queueItems.map(item => item.id))} variant="ghost" className="mt-2 text-[10px] font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]">{selectedOffers.length === queueItems.length ? 'Desmarcar todas' : 'Selecionar todas'}</Button>
              </Card>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
                {queueItems.map(item => {
                  const isSelected = selectedOffers.includes(item.id);
                  const discount = item.product.discountPercentage || (item.product.originalPrice && item.product.currentPrice && item.product.originalPrice > item.product.currentPrice ? Math.round((1 - item.product.currentPrice / item.product.originalPrice) * 100) : null);
                  return <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => setSelectedOffers(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} className={`pressable flex w-full items-center gap-3 rounded-xl border bg-[var(--surface)] p-2.5 text-left shadow-[0_8px_20px_rgba(0,0,0,.12)] transition-all duration-200 ${isSelected ? 'border-[var(--primary)]/75 ring-1 ring-[var(--primary)]/20' : 'border-[var(--border)]'} hover:-translate-y-0.5 hover:border-[var(--primary)]/75`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border)] text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-elevated)]">
                      {item.product.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[var(--text-secondary)]"><Box className="h-5 w-5" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-[11px] font-bold leading-4 text-[var(--text-primary)]">{item.product.name}</p>{discount && <span className="shrink-0 rounded-md bg-[var(--primary)]/12 px-1.5 py-0.5 text-[9px] font-black text-[var(--primary)]">-{discount}%</span>}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                        <Badge variant="outline" className={`rounded px-1.5 py-0.5 font-bold ${item.product.marketplace === 'mercado_livre' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' : 'border-orange-300 text-orange-700 bg-orange-50'}`}>
                          {item.product.marketplace === 'shopee' ? 'Shopee' : item.product.marketplace === 'mercado_livre' ? 'Mercado Livre' : item.product.marketplace}
                        </Badge>
                        {item.product.originalPrice && <span className="line-through text-[var(--text-secondary)]">R$ {item.product.originalPrice.toFixed(2).replace('.', ',')}</span>}
                        <span className="font-black text-[var(--success)]">R$ {item.product.currentPrice?.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </button>;
                })}
              </div>
              {queueItems.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <Box className="h-8 w-8 mx-auto mb-2 text-[var(--border)]" />
                  <p className="text-[11px]">Fila vazia. Garimpe ofertas primeiro.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Mensagem */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-[11px] text-[var(--text-secondary)]">Configure a mensagem do WhatsApp.</p>

              <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={whatsappEnabled} onCheckedChange={(checked) => setWhatsappEnabled(checked as boolean)} className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]" />
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-green-100"><MessageSquare className="w-4 h-4 text-green-700" /></span>
                    <span className="font-bold text-[var(--text-primary)]">WhatsApp</span>
                  </div>
                </label>
              </Card>

              {whatsappEnabled && (
                <>
                  <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">Modelo</label>
                    <Tabs value={templateMode} onValueChange={(v) => setTemplateMode(v as 'fixed' | 'rotate')} className="mb-3">
                      <TabsList className="grid w-full grid-cols-2 gap-2">
                        <TabsTrigger value="fixed" className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 ${templateMode === 'fixed' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>
                          <span><strong className="block text-[10px] text-[var(--text-primary)]">Modelo fixo</strong><small className="text-[9px] text-[var(--text-secondary)]">Usa o modelo escolhido em todas as ofertas.</small></span>
                        </TabsTrigger>
                        <TabsTrigger value="rotate" className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 ${templateMode === 'rotate' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'}`}>
                          <span><strong className="block text-[10px] text-[var(--text-primary)]">Alternar modelos</strong><small className="text-[9px] text-[var(--text-secondary)]">Troca o template a cada oferta.</small></span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Select value={selectedTemplateId} onValueChange={(e) => { setSelectedTemplateId(e); setCustomMessage(formatTemplateMessage(allTemplates.find(t => t.id === e)?.message || '')); }}>
                      <SelectTrigger className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}{t.isCustom ? ' (personalizado)' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Card>

                  <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">Mensagem</label>
                    <Textarea
                      role="message-editor"
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      className="w-full min-h-[80px] rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
                      placeholder="Digite sua mensagem... Use as variáveis abaixo."
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {variables.map(v => (
                        <Button
                          key={v.key}
                          type="button"
                          onClick={() => handleVariableInsert(v.key)}
                          variant="outline"
                          className="rounded border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20"
                          title={v.label}
                        >
                          {v.key}
                        </Button>
                      ))}
                    </div>
                  </Card>

                  <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <h4 className="mb-2 text-[10px] font-bold text-[var(--text-secondary)]">Opções</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-elevated)] px-2 py-2">
                        <span className="flex-1"><span className="block text-[11px] font-bold text-[var(--text-primary)]">Imagem do produto</span><span className="text-[9px] text-[var(--text-secondary)]">Sempre envia a foto original junto com a legenda.</span></span>
                        <Checkbox checked aria-label="Imagem do produto sempre incluída" className="w-4 h-4 accent-[var(--primary)]" />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-elevated)] px-2 py-2">
                        <span className="flex-1"><span className="block text-[11px] font-bold text-[var(--text-primary)]">CTAs rotativas</span><span className="text-[9px] text-[var(--text-secondary)]">Alterna a chamada quando o modelo usar {'{CTA}'}.</span></span>
                        <Switch checked={rotatingCTAs} onCheckedChange={(checked) => setRotatingCTAs(checked as boolean)} />
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <h4 className="mb-2 text-[10px] font-bold text-[var(--text-secondary)]">Prévia no WhatsApp</h4>
                    <div className="grid gap-2 sm:grid-cols-[80px_1fr]">
                      {showImage && (
                        <div className="aspect-square w-full rounded-lg bg-[var(--surface-elevated)] overflow-hidden">
                          {(() => { const offer = offers.find(o => selectedOffers.includes(o.id)) || offers[0]; return offer?.imageUrl ? <img src={offer.imageUrl} alt={offer.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] text-[var(--text-secondary)]">Sem imagem</div>; })()}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-[10px] font-medium leading-5 text-[var(--text-primary)]">
                        {previewMessage()}
                      </div>
                    </div>
                    {rotatingCTAs && <div className="mt-2 flex flex-wrap gap-1">{rotatingCtaExamples.map((cta, index) => <span key={cta} className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[9px] text-[var(--text-secondary)]">CTA {index + 1}: {cta}</span>)}</div>}
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Step 3: Destinos */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-[11px] text-[var(--text-secondary)]">Escolha os grupos que vão receber — nenhum vem marcado.</p>

              <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-green-100"><Users className="w-4 h-4 text-green-700" /></span>
                    <span className="font-bold text-[var(--text-primary)]">WhatsApp · grupos</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Buscar grupos"
                    value={searchGroups}
                    onChange={e => setSearchGroups(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                  />
                  <Button
                    type="button"
                    onClick={() => setSelectedGroups(prev => prev.length === filteredGroups.length ? [] : filteredGroups.map(g => g.id))}
                    variant="outline"
                    className="rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  >
                    {selectedGroups.length === filteredGroups.length ? 'desmarcar' : 'selecionar todos'}
                  </Button>
                </div>
                <div className="max-h-[45vh] overflow-y-auto space-y-1">
                  {filteredGroups.map(group => (
                    <label key={group.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 hover:border-[var(--primary)] cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={() => toggleGroup(group.id)}
                          className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-[var(--text-primary)]">{group.name}</p>
                          <p className="text-[9px] text-[var(--text-secondary)]">{group.memberCount} membros</p>
                        </div>
                      </div>
                      {!group.isAdmin && (
                        <span className="flex items-center gap-1 text-[9px] text-red-600">
                          <AlertTriangle className="w-2.5 h-2.5" /> admin
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2.5">
                <h4 className="text-[10px] font-bold text-[var(--text-secondary)]">Quando</h4>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setSchedule('now')} variant={schedule === 'now' ? 'default' : 'outline'} className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${schedule === 'now' ? '' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>Agora</Button>
                  <Button type="button" onClick={() => setSchedule('scheduled')} variant={schedule === 'scheduled' ? 'default' : 'outline'} className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${schedule === 'scheduled' ? '' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>Agendar</Button>
                </div>
                {schedule === 'scheduled' && (
                  <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]" />
                )}

                <h4 className="text-[10px] font-bold text-[var(--text-secondary)]">Ritmo</h4>
                <p className="text-[9px] text-[var(--text-secondary)]">Recomendamos intervalos de 20+ min para segurança</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="3600"
                    value={intervalValue}
                    onChange={e => setIntervalValue(parseInt(e.target.value) || 1)}
                    className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] text-center"
                  />
                  <Select value={intervalUnit} onValueChange={(e) => setIntervalUnit(e as IntervalUnit)}>
                    <SelectTrigger className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">segundos</SelectItem>
                      <SelectItem value="minutes">minutos</SelectItem>
                      <SelectItem value="hours">horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 border-t border-[var(--border)] pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={nightPause} onCheckedChange={(checked) => setNightPause(checked as boolean)} className="w-3.5 h-3.5 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]" />
                    <div className="flex-1"><span className="text-[11px] font-bold text-[var(--text-primary)]">Não enviar 23h–6h</span><p className="text-[9px] text-[var(--text-secondary)]">Evita disparos de madrugada.</p></div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={weekendPause} onCheckedChange={(checked) => setWeekendPause(checked as boolean)} className="w-3.5 h-3.5 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]" />
                    <div className="flex-1"><span className="text-[11px] font-bold text-[var(--text-primary)]">Não enviar fim de semana</span><p className="text-[9px] text-[var(--text-secondary)]">Pausa sáb/dom, retoma segunda.</p></div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={expirePause} onCheckedChange={(checked) => setExpirePause(checked as boolean)} className="w-3.5 h-3.5 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]" />
                    <div className="flex-1"><span className="text-[11px] font-bold text-[var(--text-primary)]">Não enviar ofertas expiradas</span><p className="text-[9px] text-[var(--text-secondary)]">Evita mandar link que já saiu da promo.</p></div>
                  </label>
                </div>
              </Card>
            </div>
          )}

          {/* Step 4: Revisar */}
          {step === 4 && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--primary)]">Etapa 3 de 3</p>
                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">Revise antes de disparar</h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">Confira ofertas, grupos e o ritmo.</p>
              </div>
              <div className="grid gap-2 grid-cols-3">
                {[
                  ['Ofertas', `${selectedOffers.length} selecionada(s)`],
                  ['Grupos', `${selectedGroups.length} selecionado(s)`],
                  ['Ritmo', `${intervalValue} ${intervalUnit}`],
                ].map(([label, value]) => (
                  <Card key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                    <p className="text-[9px] text-[var(--text-secondary)]">{label}</p>
                    <p className="mt-1 font-bold text-[var(--text-primary)]">{value}</p>
                  </Card>
                ))}
              </div>
              <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <p className="text-[9px] font-bold text-[var(--text-secondary)]">Mensagem</p>
                <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[var(--text-primary)]">{previewMessage()}</p>
              </Card>
            </div>
          )}

          {/* Step 5: Confirmar / Acompanhar */}
          {step === 5 && (
            <div className="space-y-3">
              {dispatchJob ? (
                <>
                  {/* Header do disparo em andamento */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 animate-pulse" />
                        Enviando
                      </Badge>
                      <span className="text-[11px] text-[var(--text-secondary)]">criado {new Date(dispatchJob.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <Button type="button" onClick={() => { setDispatchJob(null); setStep(1); setSelectedOffers([]); setSelectedGroups([]); }} variant="outline" className="pressable inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 border-red-200 hover:bg-red-50"><Ban className="w-3.5 h-3.5" />Cancelar</Button>
                  </div>

                  {/* Grupos destinatários */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedGroupsData.map(group => (
                      <span key={group.id} className="max-w-[160px] truncate rounded-full px-2 py-0.5 text-[10px] font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">#{group.id.slice(-4)} {group.name}</span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                      <div className="h-full rounded-full transition-[width] duration-500 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)]" style={{ width: `${Math.min(100, ((dispatchJob.stats?.sent || 0) + (dispatchJob.stats?.failed || 0)) / Math.max(1, totalEnvios) * 100)}%` }} />
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--text-secondary)]">
                      {dispatchJob.stats?.sent || 0}/{totalEnvios} envios · {Math.round(((dispatchJob.stats?.sent || 0) + (dispatchJob.stats?.failed || 0)) / Math.max(1, totalEnvios) * 100)}%
                    </span>
                  </div>

                  {/* Previsão de conclusão */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Previsão: {(() => { const sent = dispatchJob.stats?.sent || 0; const failed = dispatchJob.stats?.failed || 0; const done = sent + failed; const remaining = totalEnvios - done; const intervalMs = (intervalValue * (intervalUnit === 'seconds' ? 1000 : intervalUnit === 'minutes' ? 60000 : 3600000)); const eta = remaining * intervalMs; const etaDate = new Date(Date.now() + eta); return etaDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); })()}</span>
                    <span className="inline-flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />{selectedGroupsData.length} grupo(s)</span>
                    <span className="inline-flex items-center gap-1.5"><Box className="w-3.5 h-3.5" />{selectedOffers.length} oferta(s)</span>
                  </div>

                  {/* Stats detalhadas */}
                  <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                    <Card className="rounded-lg bg-[var(--success)]/10 p-3"><b className="block text-xl text-[var(--success)]">{dispatchJob.stats?.sent || 0}</b><span className="text-[9px] text-[var(--text-secondary)]">Enviados</span></Card>
                    <Card className="rounded-lg bg-[var(--error)]/10 p-3"><b className="block text-xl text-[var(--error)]">{dispatchJob.stats?.failed || 0}</b><span className="text-[9px] text-[var(--text-secondary)]">Falhas</span></Card>
                    <Card className="rounded-lg bg-[var(--warning)]/10 p-3"><b className="block text-xl text-[var(--warning)]">{dispatchJob.stats?.pending || 0}</b><span className="text-[9px] text-[var(--text-secondary)]">Pendentes</span></Card>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><Send className="h-7 w-7" /></div>
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--primary)]">Tudo pronto</p>
                  <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">Confirmar disparo</h2>
                  <p className="mt-2 max-w-md text-[11px] leading-5 text-[var(--text-secondary)]">Ao confirmar, o Radar cria a fila e envia pelo WhatsApp conectado.</p>
                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-[11px] text-[var(--text-secondary)]">{selectedOffers.length} oferta(s) · {selectedGroups.length} grupo(s)</div>
                  {(() => {
                    const semNome = offers.filter(o => selectedOffers.includes(o.id) && !(o.name || (o as any).productName || (o as any).title)).length;
                    return semNome > 0 ? (
                      <div className="mt-3 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-[11px] font-bold text-[var(--error)]">
                        {semNome} oferta(s) sem nome — saem como "Oferta especial" no grupo. Volte e retire elas da seleção.
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2.5 backdrop-blur-xl safe-bottom">
          <Button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            variant="outline"
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </Button>
          <Button
            type="button"
            onClick={dispatchJob ? () => { setDispatchJob(null); setStep(1); setSelectedOffers([]); setSelectedGroups([]); } : step === 5 ? handleExecute : handleNext}
            disabled={dispatching || (step === 5 && (selectedGroups.length === 0 || offers.some(o => selectedOffers.includes(o.id) && !(o.name || (o as any).productName || (o as any).title))))}
            className="pressable flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-[10px] font-black text-white hover:bg-[var(--primary-hover)]"
          >
            {dispatchJob ? <>Novo <Plus className="h-3.5 w-3.5" /></> : step === 5 ? (
              <>{dispatching ? 'Criando…' : 'Confirmar'} <span className="ml-0.5 px-1 py-0.5 bg-white/20 rounded text-[9px]">{selectedGroups.length}</span></>
            ) : (
              <>Continuar <ChevronRight className="w-3.5 h-3.5" /></>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DispararPage;
