import React, { useState, useCallback, useEffect } from 'react';
import { Product, QueueItem, Template, Group } from '../types/product';
import { ChevronLeft, ChevronRight, Check, X, Send, MessageSquare, Users, Clock, Moon, Sun, Calendar, RotateCcw, AlertTriangle, CheckCircle2, Radio, Layers, Zap, Shuffle, List, Copy, Trash2, Plus, Box } from 'lucide-react';

interface DispararWizardProps {
  isOpen: boolean;
  onClose: () => void;
  offers: Product[];
  queueItems: QueueItem[];
  templates: Template[];
  groups: Group[];
  onSaveQueueSelection: (selectedIds: string[]) => void;
  onSaveMessage: (message: { whatsapp: { enabled: boolean; templateId: string; customMessage: string; showImage: boolean; rotatingCTAs: boolean } }) => void;
  onSaveDestinations: (destinations: { groups: Group[]; schedule: 'now' | 'scheduled'; scheduledAt?: string; interval: { value: number; unit: 'seconds' | 'minutes' | 'hours' }; nightPause: boolean; weekendPause: boolean; expirePause: boolean }) => void;
  onExecuteDispatch: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const defaultTemplates: Template[] = [
  { id: 'vendedor', name: 'Vendedor e humanizado', message: "💛 *Esse achado vale a pena conferir!*\n📦 *{TITULO}*\nO preço caiu de ~{PRECO_ANTIGO}~ para apenas *{PRECO}* 🔥\nPra quem já estava querendo comprar, essa pode ser uma boa hora 👀\n👉 Veja a oferta: {LINK}", isCustom: false, createdAt: new Date().toISOString() },
  { id: 'direto', name: 'Direto e agressivo', message: "🚨 *OFERTA ENCONTRADA!*\n🔥 *{TITULO}*\n~De: {PRECO_ANTIGO}~ 💰 *Por apenas: {PRECO}*\n⚡ Aproveita antes que o preço mude ou o estoque acabe:\n👉 {LINK}", isCustom: false, createdAt: new Date().toISOString() },
  { id: 'achado', name: 'Sensação de achado', message: "👀 *OLHA O QUE EU ACHEI!*\n*{TITULO}*\n❌ De: ~{PRECO_ANTIGO}~\n✅ Agora por: *{PRECO}*\nTá com um preço muito bom! 🔥\n🛒 Corre pra ver: {LINK}", isCustom: false, createdAt: new Date().toISOString() },
  { id: 'urgencia', name: 'Urgência e escassez', message: "⚠️ *PREÇO BAIXOU!*\n🔥 *{TITULO}*\nEra ~{PRECO_ANTIGO}~\nAgora está saindo por apenas *{PRECO}* 😱\n⏳ Não sei até quando esse preço fica disponível.\n👉 Pegue aqui: {LINK}", isCustom: false, createdAt: new Date().toISOString() },
];

export const DispararWizard: React.FC<DispararWizardProps> = ({
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('vendedor');
  const [customMessage, setCustomMessage] = useState(defaultTemplates[0].message);
  const [showImage, setShowImage] = useState(true);
  const [rotatingCTAs, setRotatingCTAs] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<'now' | 'scheduled'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [intervalValue, setIntervalValue] = useState(8);
  const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds');
  const [nightPause, setNightPause] = useState(true);
  const [weekendPause, setWeekendPause] = useState(false);
  const [expirePause, setExpirePause] = useState(true);
  const [searchGroups, setSearchGroups] = useState('');

  const allTemplates = [...defaultTemplates, ...(userTemplates || [])];

  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId) || defaultTemplates[0];

  const previewMessage = useCallback(() => {
    const firstOffer = offers.find(o => selectedOffers.includes(o.id)) || offers[0];
    if (!firstOffer) return customMessage;
    
    let msg = customMessage;
    msg = msg.replace(/{TITULO}/g, firstOffer.name);
    msg = msg.replace(/{PRECO}/g, firstOffer.currentPrice ? `R$ ${firstOffer.currentPrice.toFixed(2).replace('.', ',')}` : '—');
    msg = msg.replace(/{PRECO_ANTIGO}/g, firstOffer.originalPrice ? `R$ ${firstOffer.originalPrice.toFixed(2).replace('.', ',')}` : '—');
    msg = msg.replace(/{LINK}/g, firstOffer.affiliateUrl || firstOffer.productUrl);
    msg = msg.replace(/{CUPOM}/g, 'CUPOM10');
    return msg;
  }, [customMessage, offers, selectedOffers]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchGroups.toLowerCase())
  );

  const handleNext = () => {
    if (step === 1) {
      if (selectedOffers.length === 0) {
        onShowToast('Selecione pelo menos uma oferta', undefined, 'error');
        return;
      }
      onSaveQueueSelection(selectedOffers);
      setStep(2);
    } else if (step === 2) {
      onSaveMessage({
        whatsapp: { enabled: whatsappEnabled, templateId: selectedTemplateId, customMessage, showImage, rotatingCTAs }
      });
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
  };

  const handleExecute = () => {
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
    onExecuteDispatch();
    onClose();
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-4">
            {[
              { num: 1, label: 'Ofertas', icon: <Box className="w-4 h-4" /> },
              { num: 2, label: 'Mensagem', icon: <MessageSquare className="w-4 h-4" /> },
              { num: 3, label: 'Destinos', icon: <Users className="w-4 h-4" /> },
            ].map((s, i) => (
              <div key={s.num} className={`flex items-center gap-2 ${i < 2 ? 'relative' : ''}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition ${step >= s.num ? 'bg-[#EE4D2D] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`hidden sm:block text-xs font-bold ${step === s.num ? 'text-[#EE4D2D]' : 'text-slate-500'}`}>{s.label}</span>
                {i < 2 && <div className={`hidden sm:block h-0.5 flex-1 max-w-16 transition ${step > s.num ? 'bg-[#EE4D2D]' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Ofertas */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Vindas da fila. Desmarque o que não quer disparar agora.</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">{selectedOffers.length} selecionadas</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {queueItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 hover:border-orange-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOffers.includes(item.id)}
                      onChange={(e) => e.target.checked ? setSelectedOffers([...selectedOffers, item.id]) : setSelectedOffers(selectedOffers.filter(id => id !== item.id))}
                      className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5">Shopee</span>
                        <span className="rounded-full bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5">Pronta</span>
                      </div>
                      <p className="truncate text-xs font-semibold text-slate-900">{item.product.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-orange-700 font-bold">R$ {item.product.currentPrice?.toFixed(2).replace('.', ',')}</span>
                        {item.product.originalPrice && <span className="line-through text-slate-400">R$ {item.product.originalPrice.toFixed(2).replace('.', ',')}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Mensagem */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Configure a mensagem de cada app. Pode usar os dois ou só um.</p>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={whatsappEnabled} onChange={e => setWhatsappEnabled(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-green-100"><Send className="w-5 h-5 text-green-700" /></span>
                    <span className="font-bold text-slate-900">WhatsApp</span>
                  </div>
                </label>
              </div>

              {whatsappEnabled && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <label className="block text-xs font-bold text-slate-600 mb-2">Modelo</label>
                    <select
                      value={selectedTemplateId}
                      onChange={e => { setSelectedTemplateId(e.target.value); setCustomMessage(allTemplates.find(t => t.id === e.target.value)?.message || ''); }}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    >
                      {allTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}{t.isCustom ? ' (personalizado)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-600">Mensagem</label>
                    </div>
                    <textarea
                      role="message-editor"
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-orange-400 resize-none font-mono"
                      placeholder="Digite sua mensagem... Use as variáveis abaixo."
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['{TITULO}', '{PRECO}', '{PRECO_ANTIGO}', '{LINK}', '{CUPOM}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleVariableInsert(v)}
                          className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700 hover:bg-orange-100"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <h4 className="text-xs font-bold text-slate-600 mb-2">Opções</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showImage} onChange={e => setShowImage(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                        <span className="text-xs font-medium text-slate-700">Mostrar imagem</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer opacity-50">
                        <input type="checkbox" checked={rotatingCTAs} onChange={e => setRotatingCTAs(e.target.checked)} disabled className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D] opacity-50" />
                        <span className="text-xs font-medium text-slate-500">CTAs rotativas</span>
                        <span className="text-[10px] text-slate-400 ml-auto">Adicione frases no seu modelo em Configurações pra ativar.</span>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <h4 className="text-xs font-bold text-slate-600 mb-2">Como vai chegar no WhatsApp</h4>
                    <div className="rounded-lg bg-green-50 p-3 text-xs font-medium text-slate-700 whitespace-pre-wrap font-mono">
                      {previewMessage()}
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* Step 3: Destinos */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Escolha os grupos que vão receber este disparo — nenhum vem marcado.</p>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-green-100"><Send className="w-5 h-5 text-green-700" /></span>
                    <span className="font-bold text-slate-900">WhatsApp · grupos</span>
                  </div>
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Atualizar grupos
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Buscar grupos"
                    value={searchGroups}
                    onChange={e => setSearchGroups(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedGroups(prev => prev.length === filteredGroups.length ? [] : filteredGroups.map(g => g.id))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {selectedGroups.length === filteredGroups.length ? 'desmarcar todos' : 'selecionar todos'}
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredGroups.map(group => (
                    <label key={group.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-orange-300 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={e => toggleGroup(group.id)}
                          className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{group.name}</p>
                          <p className="text-[10px] text-slate-500">{group.memberCount} membros</p>
                        </div>
                      </div>
                      {!group.isAdmin && (
                        <span className="flex items-center gap-1 text-[10px] text-red-600">
                          <AlertTriangle className="w-3 h-3" /> admin necessário
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <h4 className="text-xs font-bold text-slate-600">Quando</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSchedule('now')} className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold ${schedule === 'now' ? 'border-[#EE4D2D] bg-[#EE4D2D] text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Agora</button>
                  <button type="button" onClick={() => setSchedule('scheduled')} className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold ${schedule === 'scheduled' ? 'border-[#EE4D2D] bg-[#EE4D2D] text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Agendar</button>
                </div>
                {schedule === 'scheduled' && (
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400" />
                )}

                <h4 className="text-xs font-bold text-slate-600">Ritmo</h4>
                <p className="text-[11px] text-slate-500">Recomendamos intervalos de 20 minutos para manter a segurança</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Intervalo entre envios:</span>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    value={intervalValue}
                    onChange={e => setIntervalValue(parseInt(e.target.value) || 1)}
                    className="w-20 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400 text-center"
                  />
                  <select
                    value={intervalUnit}
                    onChange={e => setIntervalUnit(e.target.value as 'seconds' | 'minutes' | 'hours')}
                    className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                  >
                    <option value="seconds">segundos</option>
                    <option value="minutes">minutos</option>
                    <option value="hours">horas</option>
                  </select>
                </div>

                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={nightPause} onChange={e => setNightPause(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-900">Não enviar das 23h às 6h</span>
                      <p className="text-[10px] text-slate-500">Evita disparos de madrugada, mesmo agendando ou continuando um envio até lá.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={weekendPause} onChange={e => setWeekendPause(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-900">Não enviar Sábados e Domingos</span>
                      <p className="text-[10px] text-slate-500">Pausa os envios no fim de semana e retoma na segunda, mesmo com disparo em andamento.</p>
                    </div>
                  </label>
                  <label className="flex items_center gap-2 cursor-pointer">
                    <input type="checkbox" checked={expirePause} onChange={e => setExpirePause(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-900">Não enviar ofertas expiradas</span>
                      <p className="text-[10px] text-slate-500">Deals do dia deixam de ser enviados depois do horário de validade, evitando mandar link que já saiu de promoção.</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <button
            type="button"
            onClick={step === 3 ? handleExecute : handleNext}
            disabled={step === 3 && selectedGroups.length === 0}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black ${step === 3 ? 'bg-[#EE4D2D] text-white hover:bg-orange-600' : 'bg-[#EE4D2D] text-white hover:bg-orange-600'}`}
          >
            {step === 3 ? (
              <>
                Disparar {selectedOffers.length}
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{selectedGroups.length}</span>
              </>
            ) : (
              <>Continuar <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispararWizard;