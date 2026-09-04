import React from 'react';
import { Product } from '../types/product';

interface DispatchWizardModalProps {
  isOpen: boolean;
  offers: Product[];
  onClose: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const groups = ['🔥 Achadinhos Shopee VIP #01', '⚡ Ofertas Relâmpago & Cupons', '📢 Canal de Promoções Diárias'];

export const DispatchWizardModal: React.FC<DispatchWizardModalProps> = ({ isOpen, offers, onClose, onShowToast }) => {
  const [step, setStep] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [destinations, setDestinations] = React.useState<number[]>([0]);
  const [message, setMessage] = React.useState('RADAR ENCONTROU!\nConfira esta oferta antes que acabe.');
  React.useEffect(() => { if (isOpen) { setStep(1); setSelected(offers.slice(0, 1).map((p) => p.id)); setDestinations([0]); } }, [isOpen, offers]);
  if (!isOpen) return null;
  const selectedOffers = offers.filter((p) => selected.includes(p.id));
  const toggleOffer = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const finish = async () => { await navigator.clipboard?.writeText(message); onShowToast('Disparo preparado', `${destinations.length} destino(s) selecionado(s). Mensagem copiada para o WhatsApp.`, 'success'); onClose(); };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"><div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
    <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">📤 Disparar oferta</h2><p className="text-xs text-slate-500">Envio manual e seguro para seus grupos</p></div><button onClick={onClose} className="rounded-xl px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Fechar">×</button></div><div className="mt-4 grid grid-cols-3 gap-2">{['Ofertas', 'Mensagem', 'Destinos'].map((label, i) => <button key={label} type="button" onClick={() => setStep(i + 1)} className={`rounded-xl px-2 py-2 text-xs font-black ${step === i + 1 ? 'bg-orange-100 text-[#EE4D2D]' : 'bg-slate-50 text-slate-400'}`}><span className="mr-1">{i + 1}</span>{label}</button>)}</div></div>
    <div className="flex-1 space-y-3 overflow-y-auto p-5">{step === 1 && <>{offers.length ? offers.map((p) => <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:border-orange-300"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleOffer(p.id)} className="h-4 w-4 accent-[#EE4D2D]" /><img src={p.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{p.name}</span><span className="text-[11px] text-slate-500">{p.originalPrice ? `De R$ ${p.originalPrice.toFixed(2)}` : ''} · Por R$ {p.currentPrice?.toFixed(2) || '—'}</span></span></label>) : <p className="rounded-2xl bg-slate-50 p-5 text-center text-xs text-slate-500">Carregue ofertas para selecionar.</p>}<p className="text-right text-xs font-black text-orange-600">{selectedOffers.length} selecionada(s)</p></>}{step === 2 && <div><label htmlFor="dispatch-wizard-message" className="text-xs font-black text-slate-700">Mensagem</label><textarea id="dispatch-wizard-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={9} className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-orange-400" /><p className="mt-2 text-[11px] text-slate-500">A comissão permanece privada e não entra no texto público.</p></div>}{step === 3 && <div className="space-y-2">{groups.map((name, i) => <label key={name} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={destinations.includes(i)} onChange={() => setDestinations((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])} className="h-4 w-4 accent-[#EE4D2D]" /><span className="text-sm font-bold text-slate-800">{name}</span></label>)}<p className="text-[11px] text-slate-500">O Radar apenas prepara e copia a mensagem. Você confirma o envio no WhatsApp.</p></div>}</div>
    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4"><button type="button" onClick={() => step === 1 ? onClose() : setStep(step - 1)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white">{step === 1 ? 'Cancelar' : 'Voltar'}</button>{step < 3 ? <button type="button" onClick={() => setStep(step + 1)} disabled={step === 1 ? !selected.length : !message.trim()} className="rounded-xl bg-[#EE4D2D] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">Continuar</button> : <button type="button" onClick={finish} disabled={!destinations.length || !selected.length} className="rounded-xl bg-[#EE4D2D] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">Copiar e preparar disparo</button>}</div>
  </div></div>;
};
