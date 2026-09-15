import React, { useState, useCallback, useEffect } from 'react';
import { Product, QueueItem, Template, Group, DispatchStep, IntervalUnit } from '../types/product';
import { AlertTriangle, ArrowRight, Box, CalendarClock, Check, CheckCircle2, ChevronLeft, ClipboardCheck, Clock, MessageSquare, Moon, RotateCw, Search, Send, Shuffle, Trash2, Users } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { DEFAULT_OFFER_TEMPLATES } from '../services/offerTemplates';
import { inferMarketplace, marketplaceInfo } from '@/services/queueOverview';
import { DispatchStepper } from '@/components/disparar/DispatchStepper';
import { NextStepCard, WhatsAppBubble } from '@/components/disparar/NextStepCard';
import { ACTIVE_DISPATCH_STATUSES, DispatchMonitor, type DispatchSummary } from '@/components/disparar/DispatchMonitor';

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
  onRefreshGroups?: () => Promise<void>;
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

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const UNIT_LABEL: Record<IntervalUnit, string> = { seconds: 'segundos', minutes: 'minutos', hours: 'horas' };
const unitMs = (unit: IntervalUnit) => (unit === 'hours' ? 3_600_000 : unit === 'minutes' ? 60_000 : 1000);

function durationText(ms: number) {
  if (ms <= 0) return 'Imediato';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return `${Math.round(ms / 1000)} s`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

type DispatchTab = 'new' | 'ongoing' | 'history';

export const DispararPage: React.FC<DispararPageProps> = ({
  isOpen,
  queueItems,
  templates: userTemplates,
  groups,
  onSaveQueueSelection,
  onSaveMessage,
  onSaveDestinations,
  onExecuteDispatch,
  onShowToast,
  onRefreshGroups,
}) => {
  const [step, setStep] = useState<DispatchStep>(1);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('achado-vale-pena');
  const [templateMode, setTemplateMode] = useState<'fixed' | 'rotate'>('fixed');
  const [customMessage, setCustomMessage] = useState(formatTemplateMessage(defaultTemplates[0].message));
  const [rotatingCTAs, setRotatingCTAs] = useState(true);
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
  const [activeTab, setActiveTab] = useState<DispatchTab>('new');
  const [dispatchHistory, setDispatchHistory] = useState<DispatchSummary[]>([]);
  const [refreshingGroups, setRefreshingGroups] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

  const refreshHistory = useCallback(() => fetch('/api/dispatch/history?summary=1', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : null)
    .then(body => {
      const history: DispatchSummary[] = Array.isArray(body?.history) ? body.history : [];
      setDispatchHistory(history);
      return history;
    })
    .catch(() => [] as DispatchSummary[]), []);

  useEffect(() => {
    let cancelled = false;
    refreshHistory().then(history => {
      if (cancelled) return;
      // Abre direto no acompanhamento quando há disparo manual rodando.
      if (history.some(job => job.source !== 'queue_automation' && ['pending', 'running', 'waiting_connection'].includes(job.status))) setActiveTab('ongoing');
    });
    return () => { cancelled = true; };
  }, [refreshHistory]);

  useEffect(() => {
    if (activeTab === 'new' || !isOpen) return;
    void refreshHistory();
    const timer = window.setInterval(() => void refreshHistory(), 8000);
    return () => window.clearInterval(timer);
  }, [activeTab, isOpen, refreshHistory]);

  const allTemplates = [...defaultTemplates, ...(userTemplates || [])];

  useEffect(() => {
    if (step !== 1) return;
    setSelectedOffers(queueItems.filter(item => item.selected !== false).map(item => item.id));
  }, [queueItems, step]);

  // Produtos da seleção da FILA (antes a prévia buscava na lista do Garimpar e mostrava outro produto).
  const selectedProducts = queueItems.filter(item => selectedOffers.includes(item.id)).map(item => item.product);
  const previewProduct = selectedProducts[0] || queueItems[0]?.product || null;

  const previewMessage = useCallback(() => {
    const firstOffer = previewProduct;
    if (!firstOffer) return formatTemplateMessage(customMessage);
    let msg = formatTemplateMessage(customMessage);
    if (!firstOffer.originalPrice || firstOffer.currentPrice == null || firstOffer.originalPrice <= firstOffer.currentPrice) msg = msg.split('\n').filter(line => !line.includes('{PRECO_ANTIGO}')).join('\n');
    msg = msg.replace(/{TITULO}/g, firstOffer.name);
    msg = msg.replace(/{PRECO}/g, firstOffer.currentPrice ? brl(firstOffer.currentPrice) : '—');
    msg = msg.replace(/{PRECO_ANTIGO}/g, firstOffer.originalPrice ? brl(firstOffer.originalPrice) : '—');
    const desconto = firstOffer.discountPercentage ?? (firstOffer.originalPrice && firstOffer.currentPrice && firstOffer.originalPrice > firstOffer.currentPrice ? Math.round((1 - firstOffer.currentPrice / firstOffer.originalPrice) * 100) : null);
    msg = msg.replace(/{DESCONTO}/g, desconto ? `${Math.round(desconto)}% OFF` : '');
    msg = msg.replace(/{CTA}/g, rotatingCTAs ? rotatingCtaExamples[0] : 'Confira a oferta');
    msg = msg.replace(/{LINK}/g, firstOffer.affiliateUrl || firstOffer.productUrl);
    msg = msg.replace(/{CUPOM}/g, 'CUPOM10');
    const benefits = firstOffer.highlightPoints?.filter(Boolean).slice(0, 4).map(point => `✅ ${point}`).join('\n') || '✅ Oferta encontrada agora';
    msg = msg.replace(/{BENEFICIOS}/g, benefits);
    msg = msg.replace(/{VENDAS}|{SALES}/g, firstOffer.salesCountText || (firstOffer.salesCount ? `+${firstOffer.salesCount.toLocaleString('pt-BR')} vendidos` : ''));
    msg = msg.replace(/{AVALIACAO}|{RATING}/g, firstOffer.rating ? `⭐ ${firstOffer.rating.toFixed(1)} de avaliação` : '');
    return formatTemplateMessage(msg);
  }, [customMessage, previewProduct, rotatingCTAs]);

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchGroups.toLowerCase()));

  const destinationsPayload = () => ({
    groups: groups.filter(g => selectedGroups.includes(g.id)),
    schedule,
    scheduledAt: schedule === 'scheduled' ? scheduledAt : undefined,
    interval: { value: intervalValue, unit: intervalUnit },
    nightPause,
    weekendPause,
    expirePause,
  });

  const resetWizard = () => {
    setStep(1);
    setSelectedGroups([]);
    setSchedule('now');
    setScheduledAt('');
  };

  const handleExecute = async () => {
    if (selectedGroups.length === 0) {
      onShowToast('Selecione pelo menos um grupo', undefined, 'error');
      setStep(3);
      return;
    }
    onSaveDestinations(destinationsPayload());
    setDispatching(true);
    const created = await onExecuteDispatch();
    setDispatching(false);
    if (created?.jobId) {
      resetWizard();
      await refreshHistory();
      setActiveTab('ongoing');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const offersToDispatch = selectedOffers.length ? selectedOffers : queueItems.map(item => item.id);
      if (offersToDispatch.length === 0) {
        onShowToast('A fila está vazia', 'Adicione pelo menos uma oferta antes de criar o disparo.', 'error');
        return;
      }
      setSelectedOffers(offersToDispatch);
      onSaveQueueSelection(offersToDispatch);
      setStep(2);
    } else if (step === 2) {
      onSaveMessage({
        whatsapp: { enabled: whatsappEnabled, templateId: selectedTemplateId, customMessage: formatTemplateMessage(customMessage), showImage: true, rotatingCTAs: true, templateMode, templatePool: templateMode === 'rotate' ? allTemplates.map(template => ({ id: template.id, message: template.message })) : undefined },
      });
      setStep(3);
    } else if (step === 3) {
      if (selectedGroups.length === 0) {
        onShowToast('Selecione pelo menos um grupo', undefined, 'error');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (schedule === 'scheduled' && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
        onShowToast('Escolha uma data futura', 'Informe quando o disparo deve começar.', 'error');
        return;
      }
      onSaveDestinations(destinationsPayload());
      setStep(5);
    } else if (step === 5) {
      void handleExecute();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as DispatchStep);
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const handleVariableInsert = (variable: string) => {
    setCustomMessage(prev => {
      const textarea = document.querySelector('textarea[role="message-editor"]') as HTMLTextAreaElement;
      if (textarea) return prev.slice(0, textarea.selectionStart) + variable + prev.slice(textarea.selectionEnd);
      return prev + variable;
    });
  };

  const handleCancelDispatch = async (jobIds: string | string[]) => {
    const ids = Array.isArray(jobIds) ? jobIds : [jobIds];
    // O card automático agrupa vários jobs: o aviso precisa dizer quantos param.
    const confirmText = ids.length > 1
      ? `Cancelar os ${ids.length} disparos automáticos da fila? Os envios já concluídos serão mantidos, mas nenhuma dessas ofertas será enviada. A automação continua ligada e volta a garimpar no próximo ciclo.`
      : 'Cancelar este disparo? Os envios já concluídos serão mantidos, mas nenhum item pendente será enviado.';
    if (!window.confirm(confirmText)) return;
    setCancellingJobId(ids.join('|'));
    try {
      await Promise.all(ids.map(async id => {
        const response = await fetch(`/api/dispatch/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível cancelar o disparo.');
        return body;
      }));
      await refreshHistory();
      onShowToast('Disparo cancelado', 'Os envios pendentes foram interrompidos.', 'info');
    } catch (error) {
      onShowToast('Não foi possível cancelar', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally {
      setCancellingJobId(null);
    }
  };

  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text);
    onShowToast('Link copiado', undefined, 'success');
  };

  if (!isOpen) return null;

  const selectedGroupsData = groups.filter(g => selectedGroups.includes(g.id));
  const totalEnvios = selectedOffers.length * selectedGroups.length;
  const estimatedDurationMs = Math.max(0, selectedOffers.length - 1) * intervalValue * unitMs(intervalUnit);
  const activeCount = dispatchHistory.filter(job => ACTIVE_DISPATCH_STATUSES.includes(job.status)).length;
  const offersWithoutName = selectedProducts.filter(product => !product.name?.trim()).length;
  const dateLine = (() => {
    const raw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const tabs: { id: DispatchTab; label: string; badge?: number }[] = [
    { id: 'new', label: 'Novo disparo' },
    { id: 'ongoing', label: 'Em andamento', badge: activeCount },
    { id: 'history', label: 'Histórico' },
  ];

  const header = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-title)] sm:text-[34px]">Disparos</h1>
          <p className="mt-1 text-[15px] text-[var(--text-body)]">Envie ofertas para seus grupos de forma automática e segura.</p>
        </div>
        <div className="text-right text-[13px] text-[var(--text-secondary)]">
          <p>{dateLine}</p>
          <p>Que tal um bom dia de ofertas? 🚀</p>
        </div>
      </div>
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-1 text-[15px] transition-colors ${activeTab === tab.id ? 'border-[var(--brand-500)] font-semibold text-[var(--text-title)]' : 'border-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}
          >
            {tab.label}
            {tab.badge ? <span className="rdo-num rounded-full bg-[var(--brand-500)] px-1.5 text-xs font-bold text-white">{tab.badge}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );

  if (activeTab !== 'new') {
    return (
      <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-24">
        {header}
        <DispatchMonitor
          history={dispatchHistory}
          mode={activeTab === 'ongoing' ? 'ongoing' : 'history'}
          cancellingId={cancellingJobId}
          onCancel={(ids) => void handleCancelDispatch(ids)}
          onNewDispatch={() => setActiveTab('new')}
          onCopy={copyText}
        />
      </section>
    );
  }

  const panelCard = 'panel p-4 sm:p-5';
  const optionRow = (title: string, description: string, checked: boolean, onChange: (v: boolean) => void, icon: React.ReactNode) => (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.05] text-[var(--text-secondary)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--text-title)]">{title}</span>
        <span className="block text-xs text-[var(--text-secondary)]">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={(value) => onChange(value as boolean)} />
    </label>
  );

  const stepIntro: Record<number, { title: string; description: string }> = {
    1: { title: 'Selecione as ofertas que deseja disparar para sua audiência.', description: 'Você pode escolher uma ou mais ofertas da sua fila. Recomendamos de 1 a 10 ofertas por disparo para melhores resultados.' },
    2: { title: 'Personalize a mensagem que vai junto com as ofertas.', description: 'Escolha um modelo ou escreva o seu. As variáveis são trocadas pelos dados de cada produto.' },
    3: { title: 'Escolha os grupos que vão receber as ofertas.', description: 'Nenhum grupo vem marcado. Selecione só onde faz sentido para esse público.' },
    4: { title: 'Defina quando começar e o ritmo entre os envios.', description: 'Intervalos maiores parecem mais naturais nos grupos e reduzem risco no WhatsApp.' },
    5: { title: 'Revise tudo antes de disparar.', description: 'Confira ofertas, grupos, mensagem e ritmo. Ao confirmar, o Radar cria a fila e envia pelo WhatsApp conectado.' },
  };

  const footer: Record<number, { summary: string; detail: string; cta: string }> = {
    1: { summary: `${selectedOffers.length} ${selectedOffers.length === 1 ? 'oferta selecionada' : 'ofertas selecionadas'}`, detail: 'Essas ofertas serão incluídas no seu disparo.', cta: 'Continuar para mensagem' },
    2: { summary: templateMode === 'rotate' ? 'Alternando modelos' : 'Modelo fixo', detail: 'A mensagem é montada para cada oferta.', cta: 'Continuar para destinos' },
    3: { summary: `${selectedGroups.length} ${selectedGroups.length === 1 ? 'grupo selecionado' : 'grupos selecionados'}`, detail: `${totalEnvios} envio(s) no total.`, cta: 'Continuar para intervalo' },
    4: { summary: `A cada ${intervalValue} ${UNIT_LABEL[intervalUnit]}`, detail: schedule === 'scheduled' && scheduledAt ? `Começa em ${new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.` : 'Começa assim que você confirmar.', cta: 'Revisar disparo' },
    5: { summary: `${selectedOffers.length} oferta(s) · ${selectedGroups.length} grupo(s)`, detail: `${totalEnvios} envio(s) · duração estimada ${durationText(estimatedDurationMs)}.`, cta: dispatching ? 'Criando disparo…' : 'Confirmar disparo' },
  };

  const nextCard = (() => {
    if (step === 1) return <NextStepCard icon={MessageSquare} eyebrow="Próximo passo" title="Mensagem" description="Na próxima etapa, você vai personalizar a mensagem que será enviada com as ofertas selecionadas." footnote="Exemplo de como sua mensagem pode ficar nos grupos."><WhatsAppBubble product={previewProduct} text={previewMessage()} /></NextStepCard>;
    if (step === 2) return <NextStepCard icon={Users} eyebrow="Próximo passo" title="Destinos" description="Depois, escolha os grupos do WhatsApp que vão receber as ofertas." footnote="Prévia com a primeira oferta selecionada."><WhatsAppBubble product={previewProduct} text={previewMessage()} /></NextStepCard>;
    if (step === 3) return (
      <NextStepCard icon={Clock} eyebrow="Próximo passo" title="Intervalo" description="Em seguida, defina quando começa e quanto tempo esperar entre uma oferta e outra.">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-[var(--border-subtle)] p-3"><p className="rdo-num text-2xl font-bold text-[var(--text-title)]">{selectedGroups.length}</p><p className="text-xs text-[var(--text-secondary)]">grupos</p></div>
          <div className="rounded-xl border border-[var(--border-subtle)] p-3"><p className="rdo-num text-2xl font-bold text-[var(--text-title)]">{totalEnvios}</p><p className="text-xs text-[var(--text-secondary)]">envios</p></div>
        </div>
      </NextStepCard>
    );
    if (step === 4) return (
      <NextStepCard icon={ClipboardCheck} eyebrow="Próximo passo" title="Revisão" description="Por último, revise tudo e confirme o disparo.">
        <div className="rounded-xl border border-[var(--border-subtle)] p-3 text-sm text-[var(--text-body)]">
          <p className="text-xs text-[var(--text-secondary)]">Duração estimada</p>
          <p className="rdo-num text-2xl font-bold text-[var(--text-title)]">{durationText(estimatedDurationMs)}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{selectedOffers.length} oferta(s) com {intervalValue} {UNIT_LABEL[intervalUnit]} entre elas{nightPause ? ', sem enviar de madrugada' : ''}.</p>
        </div>
      </NextStepCard>
    );
    return <NextStepCard icon={Send} eyebrow="Tudo pronto" title="Confirmar disparo" description="Ao confirmar, o Radar cria a fila e envia pelo WhatsApp conectado. Você acompanha tudo em “Em andamento”." footnote="É assim que a primeira oferta vai chegar."><WhatsAppBubble product={previewProduct} text={previewMessage()} /></NextStepCard>;
  })();

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-24">
      {header}
      <DispatchStepper step={step} onGoTo={(target) => setStep(target as DispatchStep)} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <h2 className="text-lg text-[var(--text-title)]">{stepIntro[step].title}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{stepIntro[step].description}</p>
            </div>
            {step === 1 && (
              <span className="inline-flex items-center gap-2 text-[15px] text-[var(--text-title)]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--brand-500)] text-white"><Check className="h-4 w-4" /></span>
                {selectedOffers.length} {selectedOffers.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>
            )}
          </div>

          {step === 1 && (
            <div className={panelCard}>
              {queueItems.length === 0 ? (
                <div className="py-10 text-center">
                  <Box className="mx-auto h-9 w-9 text-[var(--text-muted)]" />
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Fila vazia. Garimpe ofertas primeiro.</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex justify-end">
                    <button type="button" onClick={() => setSelectedOffers(selectedOffers.length === queueItems.length ? [] : queueItems.map(item => item.id))} className="text-[13px] text-[var(--brand-400)] hover:underline">
                      {selectedOffers.length === queueItems.length ? 'Desmarcar todas' : 'Selecionar todas'}
                    </button>
                  </div>
                  <div className="max-h-[56vh] space-y-2.5 overflow-y-auto pr-1">
                    {queueItems.map(item => {
                      const isSelected = selectedOffers.includes(item.id);
                      const product = item.product;
                      const mp = marketplaceInfo(inferMarketplace(product.marketplace, product.affiliateUrl, product.productUrl));
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedOffers(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${isSelected ? 'border-[var(--border-default)] bg-[var(--surface-card-raised)]' : 'border-[var(--border-subtle)] opacity-80 hover:opacity-100'}`}
                        >
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${isSelected ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white' : 'border-[var(--border-strong)]'}`}>{isSelected && <Check className="h-4 w-4" />}</span>
                          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                            {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Box className="h-6 w-6 text-[var(--ink-500)]" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${isSelected ? 'bg-[var(--brand-500)]' : 'bg-[var(--ink-500)]'}`} />
                              <span className="truncate text-[15px] font-medium text-[var(--text-title)]">{product.name}</span>
                            </span>
                            <span className="mt-1 block text-sm">
                              {product.currentPrice != null && <strong className="rdo-num font-semibold text-[var(--text-title)]">{brl(product.currentPrice)}</strong>}
                              {product.originalPrice != null && product.currentPrice != null && product.originalPrice > product.currentPrice && <span className="rdo-num ml-2 text-[var(--text-muted)] line-through">{brl(product.originalPrice)}</span>}
                            </span>
                          </span>
                          <span className="hidden shrink-0 items-center gap-2 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-body)] sm:inline-flex">
                            {mp.logo && <img src={mp.logo} alt="" className="h-7 w-7 rounded-md object-contain" />}{mp.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {optionRow('Enviar pelo WhatsApp', 'Canal usado neste disparo (grupos conectados no WAHA).', whatsappEnabled, setWhatsappEnabled, <MessageSquare className="h-4 w-4" />)}
              {whatsappEnabled && (
                <>
                  <div className={panelCard}>
                    <h3 className="text-sm font-semibold text-[var(--text-title)]">Modelo</h3>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {([['fixed', 'Modelo fixo', 'Usa o modelo escolhido em todas as ofertas.', MessageSquare], ['rotate', 'Alternar modelos', 'Troca o modelo a cada oferta.', Shuffle]] as const).map(([mode, title, description, Icon]) => (
                        <button key={mode} type="button" onClick={() => setTemplateMode(mode)} aria-pressed={templateMode === mode} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${templateMode === mode ? 'border-[var(--border-brand)] bg-[var(--surface-active)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}`}>
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-500)]" />
                          <span><span className="block text-sm font-semibold text-[var(--text-title)]">{title}</span><span className="block text-xs text-[var(--text-secondary)]">{description}</span></span>
                        </button>
                      ))}
                    </div>
                    <select
                      value={selectedTemplateId}
                      onChange={(event) => { setSelectedTemplateId(event.target.value); setCustomMessage(formatTemplateMessage(allTemplates.find(t => t.id === event.target.value)?.message || '')); }}
                      aria-label="Modelo de mensagem"
                      className="mt-3 h-11 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] px-3 text-sm text-[var(--text-title)] outline-none focus:border-[var(--border-focus)]"
                    >
                      {allTemplates.map(t => <option key={t.id} value={t.id}>{t.name}{t.isCustom ? ' (personalizado)' : ''}</option>)}
                    </select>
                  </div>

                  <div className={panelCard}>
                    <h3 className="text-sm font-semibold text-[var(--text-title)]">Mensagem</h3>
                    <textarea
                      role="message-editor"
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      rows={9}
                      placeholder="Digite sua mensagem... Use as variáveis abaixo."
                      className="mt-2 w-full resize-y rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] p-3 font-mono text-[13px] leading-relaxed text-[var(--text-title)] outline-none focus:border-[var(--border-focus)]"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {variables.map(v => (
                        <button key={v.key} type="button" onClick={() => handleVariableInsert(v.key)} title={v.label} className="rounded-lg border border-[var(--border-brand)] bg-[var(--surface-brand-soft)] px-2 py-1 font-mono text-xs text-[var(--brand-400)] hover:bg-[var(--surface-active)]">{v.key}</button>
                      ))}
                    </div>
                  </div>

                  {optionRow('CTAs rotativas', 'Alterna a chamada para ação quando o modelo usar {CTA}.', rotatingCTAs, setRotatingCTAs, <RotateCw className="h-4 w-4" />)}
                  <p className="text-xs text-[var(--text-muted)]">A foto do produto sempre vai junto com a mensagem.</p>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className={panelCard}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" placeholder="Buscar grupos" value={searchGroups} onChange={e => setSearchGroups(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] pl-10 pr-3 text-sm text-[var(--text-title)] outline-none focus:border-[var(--border-focus)]" />
                </div>
                {onRefreshGroups && (
                  <button type="button" disabled={refreshingGroups} onClick={async () => { setRefreshingGroups(true); try { await onRefreshGroups(); } finally { setRefreshingGroups(false); } }} title="Recarregar grupos" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-body)] hover:border-[var(--border-brand)] disabled:opacity-50">
                    <RotateCw className={`h-4 w-4 ${refreshingGroups ? 'animate-spin' : ''}`} /> Atualizar
                  </button>
                )}
                <button type="button" onClick={() => setSelectedGroups(prev => prev.length === filteredGroups.length ? [] : filteredGroups.map(g => g.id))} className="inline-flex h-11 items-center rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-body)] hover:border-[var(--border-brand)]">
                  {selectedGroups.length === filteredGroups.length && filteredGroups.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{filteredGroups.length} grupo(s) carregado(s){searchGroups ? ` · filtro "${searchGroups}"` : ''}</p>
              <div className="mt-3 grid max-h-[52vh] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {filteredGroups.map(group => {
                  const checked = selectedGroups.includes(group.id);
                  return (
                    <button key={group.id} type="button" onClick={() => toggleGroup(group.id)} aria-pressed={checked} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${checked ? 'border-[var(--border-brand)] bg-[var(--surface-selected)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}`}>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${checked ? 'border-[var(--brand-500)] bg-[var(--brand-500)] text-white' : 'border-[var(--border-strong)]'}`}>{checked && <Check className="h-3.5 w-3.5" />}</span>
                      <Users className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--text-title)]">{group.name}</span>
                        <span className="block text-xs text-[var(--text-secondary)]">{Number(group.memberCount || 0).toLocaleString('pt-BR')} participantes</span>
                      </span>
                      {!group.isAdmin && <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[var(--amber-400)]" title="Você não é admin deste grupo"><AlertTriangle className="h-3.5 w-3.5" />sem admin</span>}
                    </button>
                  );
                })}
                {filteredGroups.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-secondary)] md:col-span-2">Nenhum grupo encontrado.</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className={panelCard}>
                <h3 className="text-sm font-semibold text-[var(--text-title)]">Quando começar</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([['now', 'Agora', 'Assim que confirmar'], ['scheduled', 'Agendar', 'Escolher data e hora']] as const).map(([value, title, description]) => (
                    <button key={value} type="button" onClick={() => setSchedule(value)} aria-pressed={schedule === value} className={`rounded-xl border p-3 text-left transition-colors ${schedule === value ? 'border-[var(--border-brand)] bg-[var(--surface-active)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'}`}>
                      <span className="block text-sm font-semibold text-[var(--text-title)]">{title}</span>
                      <span className="block text-xs text-[var(--text-secondary)]">{description}</span>
                    </button>
                  ))}
                </div>
                {schedule === 'scheduled' && (
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} aria-label="Data e hora de início" className="mt-3 h-11 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] px-3 text-sm text-[var(--text-title)] outline-none focus:border-[var(--border-focus)] sm:w-auto" />
                )}
              </div>

              <div className={panelCard}>
                <h3 className="text-sm font-semibold text-[var(--text-title)]">Intervalo entre ofertas</h3>
                <p className="text-xs text-[var(--text-secondary)]">Recomendamos 20 minutos ou mais para mais segurança.</p>
                <div className="mt-3 flex items-center gap-2">
                  <input type="number" min={1} max={3600} value={intervalValue} onChange={e => setIntervalValue(parseInt(e.target.value) || 1)} aria-label="Intervalo" className="h-11 w-24 rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] px-3 text-center text-sm text-[var(--text-title)] outline-none focus:border-[var(--border-focus)]" />
                  <select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as IntervalUnit)} aria-label="Unidade do intervalo" className="h-11 rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] px-3 text-sm text-[var(--text-title)] outline-none focus:border-[var(--border-focus)]">
                    <option value="seconds">segundos</option>
                    <option value="minutes">minutos</option>
                    <option value="hours">horas</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                {optionRow('Não enviar entre 23h e 6h', 'Evita disparos de madrugada.', nightPause, setNightPause, <Moon className="h-4 w-4" />)}
                {optionRow('Não enviar no fim de semana', 'Pausa sábado e domingo e retoma na segunda.', weekendPause, setWeekendPause, <CalendarClock className="h-4 w-4" />)}
                {optionRow('Não enviar ofertas expiradas', 'Evita mandar link que já saiu da promoção.', expirePause, setExpirePause, <AlertTriangle className="h-4 w-4" />)}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Ofertas', String(selectedOffers.length)],
                  ['Grupos', String(selectedGroups.length)],
                  ['Envios', String(totalEnvios)],
                  ['Intervalo', `${intervalValue} ${UNIT_LABEL[intervalUnit]}`],
                ].map(([label, value]) => (
                  <div key={label} className="panel p-4">
                    <p className="text-xs text-[var(--text-secondary)]">{label}</p>
                    <p className="rdo-num mt-1 text-xl font-bold text-[var(--text-title)]">{value}</p>
                  </div>
                ))}
              </div>
              <div className={panelCard}>
                <h3 className="text-sm font-semibold text-[var(--text-title)]">Grupos ({selectedGroupsData.length})</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedGroupsData.map(group => <span key={group.id} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-body)]">{group.name}</span>)}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[var(--text-body)] sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-[var(--text-secondary)]" />{schedule === 'scheduled' && scheduledAt ? `Começa em ${new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Começa assim que confirmar'}</p>
                  <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--text-secondary)]" />Duração estimada: {durationText(estimatedDurationMs)}</p>
                </div>
              </div>
              <div className={panelCard}>
                <h3 className="text-sm font-semibold text-[var(--text-title)]">Mensagem (primeira oferta)</h3>
                <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-3 text-[13px] leading-relaxed text-[var(--text-body)]">{previewMessage()}</p>
              </div>
              {offersWithoutName > 0 && (
                <p className="rounded-xl border border-[rgba(239,68,68,.3)] bg-[var(--surface-red-soft)] p-3 text-sm text-[var(--red-400)]">{offersWithoutName} oferta(s) sem nome. Volte e retire da seleção antes de disparar.</p>
              )}
            </div>
          )}

          <div className="dispatch-footer sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-app)]/95 p-3 backdrop-blur-xl">
            {step === 1 ? (
              <button type="button" onClick={() => setSelectedOffers([])} disabled={!selectedOffers.length} className="inline-flex h-12 items-center gap-2 rounded-xl border border-[var(--border-brand)] px-4 text-sm font-semibold text-[var(--brand-400)] hover:bg-[var(--surface-brand-soft)] disabled:opacity-40">
                <Trash2 className="h-4 w-4" /> Limpar seleção
              </button>
            ) : (
              <button type="button" onClick={handleBack} className="inline-flex h-12 items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--text-body)] hover:border-[var(--border-strong)]">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-title)]">{footer[step].summary}</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">{footer[step].detail}</p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={dispatching || (step === 1 && !queueItems.length) || (step === 5 && (selectedGroups.length === 0 || offersWithoutName > 0))}
              className="btn-brand inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold disabled:cursor-not-allowed sm:w-auto"
            >
              {footer[step].cta} {step === 5 ? <Send className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="xl:sticky xl:top-4">{nextCard}</div>
      </div>
    </section>
  );
};

export default DispararPage;
