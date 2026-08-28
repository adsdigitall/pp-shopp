import React, { useState } from 'react';
import { AffiliateSettings } from '../types/product';
import { X, Save, Key, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AffiliateSettings;
  onSaveSettings: (newSettings: AffiliateSettings) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onShowToast,
}) => {
  const [form, setForm] = useState<AffiliateSettings>(settings);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    onShowToast('Configurações salvas!', 'Suas preferências de afiliado foram atualizadas.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-[#EE4D2D] rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                Configurações do Afiliado
              </h2>
              <p className="text-xs text-slate-500">
                Parâmetros locais e identificação para ofertas
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Affiliate Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Tag / ID de Afiliado Shopee
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={form.affiliateTag}
                onChange={(e) => setForm({ ...form, affiliateTag: e.target.value })}
                placeholder="Ex: seu_id_afiliado"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#EE4D2D] focus:ring-2 focus:ring-orange-500/20 outline-none font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Esta tag será injetada nos links gerados automaticamente.
            </p>
          </div>

          {/* Default Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Formato Padrão de Cópia
            </label>
            <select
              value={form.defaultFormat}
              onChange={(e) => setForm({ ...form, defaultFormat: e.target.value as any })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#EE4D2D] outline-none font-medium text-slate-800"
            >
              <option value="standard">WhatsApp & Telegram (Completo com destaques)</option>
              <option value="compact">Stories & Direct (Curto e direto)</option>
              <option value="urgent">Relâmpago (Menor preço histórico)</option>
            </select>
          </div>

          {/* Privacy Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Tema do aplicativo</label>
            <select
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value as 'light' | 'dark' })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#EE4D2D] outline-none font-medium text-slate-800"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </div>

          {/* Privacy Toggle */}
          <div className="pt-2">
            <label className="flex items-center justify-between p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl cursor-pointer">
              <div className="pr-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Exibir caixas de comissão privada nos cards
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Mostra a % de comissão e o ganho estimado em R$ no painel do afiliado.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.showPrivateCommission}
                onChange={(e) => setForm({ ...form, showPrivateCommission: e.target.checked })}
                className="w-4 h-4 text-[#EE4D2D] rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar preferências</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
