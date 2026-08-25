import React from 'react';
import { X, Bell, Flame, Tag, CheckCheck } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 1,
      title: '🔥 Smartwatch D20 Pro atingiu menor preço!',
      desc: 'Comissão aumentou para 20% hoje. Ótimo momento para postar nos grupos.',
      time: 'Há 15 min',
      unread: true,
    },
    {
      id: 2,
      title: '🏷️ Novo cupom de Frete Grátis Shopee liberado',
      desc: 'Cupons adicionais de frete grátis disponíveis para todos os compradores.',
      time: 'Há 1 hora',
      unread: true,
    },
    {
      id: 3,
      title: '💰 Fone Bluetooth Pro com alta procura',
      desc: 'Mais de 1.4k vendas registradas nas últimas 24 horas.',
      time: 'Há 3 horas',
      unread: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-[#EE4D2D] rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">
                Alertas de Oportunidades
              </h2>
              <p className="text-xs text-slate-500">
                Avisos de picos de comissão e promoções
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                n.unread
                  ? 'bg-orange-50/50 border-orange-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                  {n.title}
                </h4>
                {n.unread && (
                  <span className="w-2 h-2 rounded-full bg-[#EE4D2D] shrink-0 mt-1" />
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {n.desc}
              </p>
              <span className="text-[10px] font-medium text-slate-400 mt-2 block">
                {n.time}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            Tudo atualizado
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
