import React from 'react';
import { X, Users, MessageCircle, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

interface GroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const GroupsModal: React.FC<GroupsModalProps> = ({ isOpen, onClose, onShowToast }) => {
  if (!isOpen) return null;

  const connectedGroups = [
    {
      id: 'g1',
      name: '🔥 Achadinhos Shopee VIP #01',
      platform: 'WhatsApp',
      members: '840 membros',
      active: true,
      lastPost: 'Hoje às 14:20',
    },
    {
      id: 'g2',
      name: '⚡ Ofertas Relâmpago & Cupons',
      platform: 'WhatsApp',
      members: '1.024 membros (Lotado)',
      active: true,
      lastPost: 'Hoje às 11:05',
    },
    {
      id: 'g3',
      name: '📢 Canal de Promoções Diárias',
      platform: 'Telegram',
      members: '2.850 inscritos',
      active: true,
      lastPost: 'Ontem',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                Seus Grupos de Divulgação
              </h2>
              <p className="text-xs text-slate-500">
                Canais e grupos conectados para envio de ofertas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {connectedGroups.map((grp) => (
            <div
              key={grp.id}
              className="p-4 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-200 rounded-2xl transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {grp.name}
                    </h4>
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {grp.platform}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {grp.members} • Último envio: {grp.lastPost}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    onShowToast('Grupo selecionado!', `Pronto para divulgar no ${grp.name}.`, 'info');
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 hover:border-emerald-600 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  Divulgar
                </button>
              </div>
            </div>
          ))}

          {/* Info Banner */}
          <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-2.5 text-xs text-orange-950 mt-4">
            <Sparkles className="w-4 h-4 text-[#EE4D2D] shrink-0 mt-0.5" />
            <p>
              <strong>Dica de Afiliado:</strong> Para máxima conversão, divulgue ofertas com desconto acima de 40% nos horários de pico (12h às 14h e 19h às 22h).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
