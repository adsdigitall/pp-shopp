import React from 'react';
import { Send, Wifi, X, CheckCircle2, AlertCircle, RotateCcw, Smartphone, QrCode } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  connected,
  onConnect,
  onDisconnect,
  onShowToast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-green-100">
              <Send className="w-5 h-5 text-green-700" />
            </div>
            <span className="font-bold text-slate-900">WhatsApp</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-4 space-y-4">
          {connected ? (
            <div className="text-center space-y-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-green-100 mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-700" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Tudo certo!</p>
                <p className="mt-1 text-xs text-slate-500">WhatsApp conectado e pronto para disparos</p>
              </div>
              <button
                onClick={onDisconnect}
                className="rounded-xl border border-red-200 bg-red-50 px-6 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 flex items-center justify-center gap-2 mx-auto"
              >
                <Wifi className="w-4 h-4" /> Desconectar dispositivo
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-orange-100 mx-auto">
                <QrCode className="w-10 h-10 text-orange-700" />
              </div>
              <div>
                <p className="font-bold text-slate-900">WhatsApp não conectado</p>
                <p className="mt-1 text-xs text-slate-500">Conecte seu WhatsApp para enviar ofertas aos grupos</p>
              </div>
              <button
                onClick={onConnect}
                className="rounded-xl bg-[#EE4D2D] px-6 py-2.5 text-xs font-black text-white hover:bg-orange-600 flex items-center justify-center gap-2 mx-auto"
              >
                <Smartphone className="w-4 h-4" /> Conectar WhatsApp
              </button>
              <p className="text-[10px] text-slate-500">Vamos abrir o WhatsApp Web pra você escanear o QR Code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;