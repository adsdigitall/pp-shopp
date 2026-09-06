import React, { useState } from 'react';
import { GitBranch, Plus, Search, RotateCcw, Shuffle, List, Check, X, AlertTriangle, Copy, Trash2, Edit, Eye, Layers, Zap, Users } from 'lucide-react';
import { Group, Template } from '../types/product';

interface EspelhamentoPageProps {
  groups: Group[];
  templates: Template[];
  mirroringConfigs: any[];
  onCreateMirroring: (config: any) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const mirroringTypes = [
  { id: 'instant', name: 'Instantâneo', description: 'Espelha a oferta na hora, assim que ela aparece na origem.', icon: <Zap className="w-5 h-5" /> },
  { id: 'shuffled', name: 'Embaralhado', description: 'Junta um lote de ofertas e sorteia a ordem de envio, diferente em cada grupo.', icon: <Shuffle className="w-5 h-5" /> },
];

export const EspelhamentoPage: React.FC<EspelhamentoPageProps> = ({
  groups,
  templates,
  mirroringConfigs,
  onCreateMirroring,
  onShowToast,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [sourceGroupId, setSourceGroupId] = useState('');
  const [destinationGroupIds, setDestinationGroupIds] = useState<string[]>([]);
  const [mirroringType, setMirroringType] = useState<'instant' | 'shuffled'>('instant');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [onlyOffers, setOnlyOffers] = useState(true);
  const [couponSource, setCouponSource] = useState<'origin' | 'own'>('origin');
  const [iAmPoster, setIAmPoster] = useState(false);
  const [searchSource, setSearchSource] = useState('');
  const [searchDest, setSearchDest] = useState('');

  const adminGroups = groups.filter(g => g.isAdmin);
  const nonAdminGroups = groups.filter(g => !g.isAdmin);

  const filteredSource = groups.filter(g => g.name.toLowerCase().includes(searchSource.toLowerCase()));
  const filteredDest = groups.filter(g => g.name.toLowerCase().includes(searchDest.toLowerCase()));

  const canCreate = sourceGroupId && destinationGroupIds.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreateMirroring({
      sourceGroupId,
      destinationGroupIds,
      mirroringType,
      templateIds: selectedTemplateIds,
      onlyOffers,
      couponSource,
      iAmPoster,
    });
    setShowModal(false);
    // Reset form
    setSourceGroupId('');
    setDestinationGroupIds([]);
    setMirroringType('instant');
    setSelectedTemplateIds([]);
    setOnlyOffers(true);
    setCouponSource('origin');
    setIAmPoster(false);
  };

  const toggleDestination = (groupId: string) => {
    setDestinationGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev => prev.includes(templateId) ? prev.filter(id => id !== templateId) : [...prev, templateId]);
  };

  const renderGroupOption = (group: Group, isSource: boolean, search: string, onSearchChange: (v: string) => void) => (
    <label key={group.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 hover:border-orange-300 cursor-pointer ${group.isAdmin ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-3">
        <input
          type={isSource ? 'radio' : 'checkbox'}
          checked={isSource ? sourceGroupId === group.id : destinationGroupIds.includes(group.id)}
          onChange={() => isSource ? setSourceGroupId(group.id) : toggleDestination(group.id)}
          disabled={!isSource && !group.isAdmin}
          className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]"
        />
        <div>
          <p className="text-xs font-bold text-slate-900">{group.name}</p>
          <p className="text-[10px] text-slate-500">{group.memberCount} membros</p>
        </div>
      </div>
      {!group.isAdmin && !isSource && (
        <span className="flex items-center gap-1 text-[10px] text-red-600">
          <AlertTriangle className="w-3 h-3" /> admin necessário
        </span>
      )}
    </label>
  );

  return (
    <section id="espelhamento" className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-black text-slate-900">Espelhamento</h2>
          <p className="mt-1 text-xs text-slate-500">Monitora um grupo de WhatsApp e reposta as ofertas nos seus grupos de destino, com os links já trocados pelo seu afiliado.</p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="rounded-xl bg-[#EE4D2D] px-4 py-2.5 text-xs font-black text-white hover:bg-orange-600 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo espelhamento
        </button>
      </div>

      {mirroringConfigs.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <GitBranch className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500">Nenhum espelhamento ainda. Crie um pra começar a repostar automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mirroringConfigs.map(config => (
            <div key={config.id} className="glass p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--primary)]">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{config.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Origem → {config.destinationGroupIds.length} grupos de destino</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--success)]/12 px-3 py-1 text-[11px] font-semibold text-[var(--success)]">Ativo</span>
                  <span className="relative h-6 w-10 rounded-full bg-[var(--success)]"><span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" /></span>
                  <button type="button" className="rounded-lg p-2 hover:bg-[var(--surface-hover)]"><Edit className="h-4 w-4 text-[var(--text-secondary)]" /></button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">{config.type === 'instant' ? 'Instantâneo' : 'Embaralhado'}</span><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">Somente ofertas</span><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">Links afiliados</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><span className="block text-[11px] text-[var(--text-secondary)]">Mensagens espelhadas</span><strong className="text-lg">{config.mirroredMessages ?? 0}</strong></div><div><span className="block text-[11px] text-[var(--text-secondary)]">Falhas de envio</span><strong className="text-lg text-[var(--danger)]">{config.failedMessages ?? 0}</strong></div><div><span className="block text-[11px] text-[var(--text-secondary)]">Tipo</span><strong className="text-sm">{config.type === 'instant' ? 'Instantâneo' : 'Embaralhado'}</strong></div><div><span className="block text-[11px] text-[var(--text-secondary)]">Destinos</span><strong className="text-sm">{config.destinationGroupIds.length} grupos</strong></div></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3"><span className="text-xs text-[var(--text-secondary)]">Destinos:</span>{config.destinationGroupIds.map((id: string) => <span key={id} className="rounded-lg bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-primary)]">{groups.find(g => g.id === id)?.name || `Grupo ${id}`}</span>)}<details className="ml-auto text-xs text-[var(--text-secondary)]"><summary className="cursor-pointer">Ver falhas</summary><p className="mt-2 rounded-lg bg-[var(--danger)]/10 p-2 text-[var(--danger)]">{config.failedMessages ?? 0} falhas registradas.</p></details></div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Espelhamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-900">Novo espelhamento</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-xs text-slate-500">Escolha a origem, os destinos e como as ofertas devem sair.</p>

              {/* Origem */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Origem (de onde copiar) — escolha 1</h4>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Buscar grupo"
                    value={searchSource}
                    onChange={e => setSearchSource(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                  />
                  <button type="button" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> atualizar
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredSource.map(g => renderGroupOption(g, true, searchSource, setSearchSource))}
                </div>
              </div>

              {/* Destino */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Destino (pra onde repostar) — precisa ser admin</h4>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Buscar grupos"
                    value={searchDest}
                    onChange={e => setSearchDest(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredDest.map(g => renderGroupOption(g, false, searchDest, setSearchDest))}
                </div>
              </div>

              {/* Tipo */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Tipo de espelhamento</h4>
                <div className="grid grid-cols-2 gap-2">
                  {mirroringTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setMirroringType(type.id as 'instant' | 'shuffled')}
                      className={`rounded-xl border-2 p-3 text-left transition ${mirroringType === type.id ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-100">{type.icon}</span>
                        <span className="font-bold text-slate-900">{type.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-bold text-slate-600 mb-2">Modelos de mensagem — escolha 1 ou mais (opcional)</h4>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTemplate(t.id)}
                      className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition ${selectedTemplateIds.includes(t.id) ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {selectedTemplateIds.includes(t.id) && <Check className="w-3 h-3 text-[#EE4D2D]" />}
                        {t.name}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Nenhum selecionado: a mensagem original é repostada com o link trocado.</p>
              </div>

              {/* Opções */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={onlyOffers} onChange={e => setOnlyOffers(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900">Somente ofertas</span>
                    <p className="text-[10px] text-slate-500">Espelha só mensagens com link de loja (Shopee, Mercado Livre, Amazon, Magalu). Evita repostar links pessoais.</p>
                  </div>
                </label>

                <div>
                  <h4 className="text-xs font-bold text-slate-600 mb-2">Cupom da mensagem</h4>
                  <p className="text-[10px] text-slate-500 mb-2">De onde vem o cupom quando o modelo usa a variável {'{' + 'CUPOM' + '}'}.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setCouponSource('origin')} className={`rounded-lg border-2 p-3 text-left ${couponSource === 'origin' ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200'}`}>
                      <div className="font-bold text-slate-900">Copiar do grupo de origem</div>
                      <p className="text-[10px] text-slate-500">Tenta ler o cupom publicado na mensagem original.</p>
                    </button>
                    <button type="button" onClick={() => setCouponSource('own')} className={`rounded-lg border-2 p-3 text-left ${couponSource === 'own' ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200'}`}>
                      <div className="font-bold text-slate-900">Usar meus cupons</div>
                      <p className="text-[10px] text-slate-500">Usa os cupons de Configurações, pela plataforma da oferta.</p>
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={iAmPoster} onChange={e => setIAmPoster(e.target.checked)} className="w-4 h-4 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900">Eu sou quem posta neste grupo</span>
                    <p className="text-[10px] text-slate-500">Ligue se você mesmo escreve as ofertas na origem (grupo-mestre) e quer replicá-las nos destinos. Desligado, só espelha o que outras pessoas postam.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={handleCreate} disabled={!canCreate} className="rounded-xl bg-[#EE4D2D] px-4 py-2 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50">Criar espelhamento</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EspelhamentoPage;
