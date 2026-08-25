import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-4 bg-slate-900/95 text-white rounded-2xl shadow-xl shadow-slate-950/20 backdrop-blur border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5 duration-300"
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' && (
            <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="p-1 bg-rose-500/20 text-rose-400 rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="p-1 bg-sky-500/20 text-sky-400 rounded-lg shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
          )}

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-semibold text-slate-100 leading-snug">{toast.title}</h4>
            {toast.description && (
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.description}</p>
            )}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
