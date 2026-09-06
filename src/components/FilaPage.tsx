import React, { useState } from 'react';
import { Product, QueueItem } from '../types/product';
import { ProductCard } from './ProductCard';
import { Trash2, Copy, CheckSquare, Square, Link as LinkIcon, Boxes, Users, Send } from 'lucide-react';

interface FilaPageProps {
  queueItems: QueueItem[];
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
