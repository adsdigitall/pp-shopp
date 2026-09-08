import React, { useState } from 'react';
import { GitBranch, Plus, Search, RotateCcw, Shuffle, List, Check, X, AlertTriangle, Copy, Trash2, Edit, Eye, Layers, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Group, Template } from '../types/product';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/Dialog';
import { Checkbox } from './ui/Checkbox';
import { Tabs, TabsList, TabsTrigger } from './ui/Tabs';
import { Badge } from './ui/Badge';

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
    <label key={group.id} className={cn(`flex items-center justify-between rounded-lg border px-3 py-2 hover:border-[var(--primary)]/50 cursor-pointer ${group.isAdmin ? '' : 'opacity-50'}`)}>
      <div className="flex items-center gap-3">
        {isSource ? (
          <input type="radio" checked={sourceGroupId === group.id} onChange={() => setSourceGroupId(group.id)} disabled={!isSource} className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]" />
        ) : (
          <Checkbox checked={destinationGroupIds.includes(group.id)} onCheckedChange={() => toggleDestination(group.id)} disabled={!group.isAdmin} />
        )}
        <div>
          <p className="text-xs font-bold text-[var(--text-primary)]">{group.name}</p>
          <p className="text-[10px] text-[var(--text-secondary)]">{group.memberCount} membros</p>
        </div>
      </div>
      {!group.isAdmin && !isSource && (
        <span className="flex items-center gap-1 text-[10px] text-[var(--error)]">
          <AlertTriangle className="w-3 h-3" /> admin necessário
        </span>
      )}
    </label>
  );

  return (
    <section id="espelhamento" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">Espelhamento</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Monitora um grupo de WhatsApp e reposta as ofertas nos seus grupos de destino, com os links já trocados pelo seu afiliado.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white">
          <Plus className="w-4 h-4" /> Novo espelhamento
        </Button>
      </div>

      {mirroringConfigs.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 bg-[var(--surface-elevated)] text-[var(--text-secondary)] rounded-xl flex items-center justify-center mx-auto">
            <GitBranch className="w-6 h-6" />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Nenhum espelhamento ainda. Crie um pra começar a repostar automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mirroringConfigs.map(config => (
            <div key={config.id} className="glass p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{config.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">Origem → {config.destinationGroupIds.length} grupos de destino</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Ativo</Badge>
                  <span className="relative h-6 w-10 rounded-full bg-[var(--success)]"><span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" /></span>
                  <button type="button" className="rounded-lg p-2 hover:bg-[var(--surface-hover)]"><Edit className="h-4 w-4 text-[var(--text-secondary)]" /></button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">{config.type === 'instant' ? 'Instantâneo' : 'Embaralhado'}</span><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">Somente ofertas</span><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-secondary)]">Links afiliados</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><span className="block text-[11px] text-[var(--text-secondary)]">Mensagens espelhadas</span><strong className="text-lg">{config.mirroredMessages ?? 0}</strong></div><div><span className="block text-[11px] text-[var(--text-secondary)]">Falhas de envio</span><strong className="text-lg text-[var(--error)]">{config.failedMessages ?? 0}</strong></div><div><span className="block text-[11px] text-[var(--text-secondary)]">Tipo</span><strong className="text-sm">{config.type === 'instant' ? 'Instantâneo' : 'Embaralhado'}</strong></div><div><span className="block text-[11px] text-[var(--text-secondary)]">Destinos</span><strong className="text-sm">{config.destinationGroupIds.length} grupos</strong></div></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3"><span className="text-xs text-[var(--text-secondary)]">Destinos:</span>{config.destinationGroupIds.map((id: string) => <span key={id} className="rounded-lg bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-primary)]">{groups.find(g => g.id === id)?.name || `Grupo ${id}`}</span>)}<details className="ml-auto text-xs text-[var(--text-secondary)]"><summary className="cursor-pointer">Ver falhas</summary><p className="mt-2 rounded-lg bg-[var(--danger)]/10 p-2 text-[var(--danger)]">{config.failedMessages ?? 0} falhas registradas.</p></details></div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Novo espelhamento</DialogTitle>
            <DialogDescription>Escolha a origem, os destinos e como as ofertas devem sair.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">Escolha a origem, os destinos e como as ofertas devem sair.</p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">Origem (de onde copiar) — escolha 1</h4>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Buscar grupo"
                  value={searchSource}
                  onChange={e => setSearchSource(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-orange-400"
                />
                <button type="button" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> atualizar
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredSource.map(g => renderGroupOption(g, true, searchSource, setSearchSource))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">Destino (pra onde repostar) — precisa ser admin</h4>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Buscar grupos"
                  value={searchDest}
                  onChange={e => setSearchDest(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-orange-400"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredDest.map(g => renderGroupOption(g, false, searchDest, setSearchDest))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">Tipo de espelhamento</h4>
              <Tabs value={mirroringType} onValueChange={(v) => setMirroringType(v as 'instant' | 'shuffled')}>
                <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
                  {mirroringTypes.map(type => (
                    <TabsTrigger key={type.id} value={type.id} className={cn(
                      'flex items-center gap-2 p-3 text-left transition rounded-xl border-2',
                      mirroringType === type.id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                    )}>
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-elevated)]">{type.icon}</span>
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{type.name}</div>
                        <p className="text-[10px] text-[var(--text-secondary)]">{type.description}</p>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">Modelos de mensagem — escolha 1 ou mais (opcional)</h4>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTemplate(t.id)}
                    className={cn(
                      'rounded-lg border-2 px-3 py-2 text-xs font-medium transition',
                      selectedTemplateIds.includes(t.id) ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {selectedTemplateIds.includes(t.id) && <Check className="w-3 h-3 text-[var(--primary)]" />}
                      {t.name}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-secondary)]">Nenhum selecionado: a mensagem original é repostada com o link trocado.</p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={onlyOffers} onCheckedChange={(checked) => setOnlyOffers(checked as boolean)} />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Somente ofertas</span>
                  <p className="text-[10px] text-[var(--text-secondary)]">Espelha só mensagens com link de loja (Shopee, Mercado Livre, Amazon, Magalu). Evita repostar links pessoais.</p>
                </div>
              </label>

              <div>
                <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">Cupom da mensagem</h4>
                <p className="text-[10px] text-[var(--text-secondary)] mb-2">De onde vem o cupom quando o modelo usa a variável {'{' + 'CUPOM' + '}'}.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCouponSource('origin')} className={cn(
                    'rounded-lg border-2 p-3 text-left',
                    couponSource === 'origin' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
                  )}>
                    <div className="font-bold text-[var(--text-primary)]">Copiar do grupo de origem</div>
                    <p className="text-[10px] text-[var(--text-secondary)]">Tenta ler o cupom publicado na mensagem original.</p>
                  </button>
                  <button type="button" onClick={() => setCouponSource('own')} className={cn(
                    'rounded-lg border-2 p-3 text-left',
                    couponSource === 'own' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
                  )}>
                    <div className="font-bold text-[var(--text-primary)]">Usar meus cupons</div>
                    <p className="text-[10px] text-[var(--text-secondary)]">Usa os cupons de Configurações, pela plataforma da oferta.</p>
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={iAmPoster} onCheckedChange={(checked) => setIAmPoster(checked as boolean)} />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Eu sou quem posta neste grupo</span>
                  <p className="text-[10px] text-[var(--text-secondary)]">Ligue se você mesmo escreve as ofertas na origem (grupo-mestre) e quer replicá-las nos destinos. Desligado, só espelha o que outras pessoas postam.</p>
                </div>
              </label>
            </div>
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 flex justify-end gap-2">
            <DialogClose asChild>
              <button type="button" className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Cancelar</button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={!canCreate} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white disabled:opacity-50">
              Criar espelhamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EspelhamentoPage;