import React, { useState } from 'react';
import { Product, OfferFormat } from '../types/product';
import { generateShareableOffer } from '../services/offerGenerator';
import { 
  X, 
  Copy, 
  Share2, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink, 
  MessageSquare, 
  Layers, 
  Zap,
  Tag
} from 'lucide-react';

interface OfferPreviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const OfferPreviewModal: React.FC<OfferPreviewModalProps> = ({
  product,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<OfferFormat>('standard');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !product) return null;

  // Generate safe shareable copy without commission data
  const offer = generateShareableOffer(product, selectedFormat);

  const handleCopyOffer = async () => {
    try {
      await navigator.clipboard.writeText(offer.copyText);
      setCopied(true);
      onShowToast(
        'Oferta copiada com sucesso!',
        'O texto pronto e link já estão na sua área de transferência.',
        'success'
      );
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      onShowToast('Erro ao copiar', 'Tente selecionar o texto manualmente.', 'error');
    }
  };

  const handleCopyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(offer.affiliateLink);
      setCopiedLink(true);
      onShowToast('Link copiado!', 'Link de afiliado pronto para envio.', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      onShowToast('Erro ao copiar link', 'Tente selecionar o link manualmente.', 'error');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Oferta Shopee: ${offer.productName}`,
          text: offer.copyText,
          url: offer.affiliateLink,
        });
        onShowToast('Compartilhado com sucesso!', undefined, 'success');
      } catch (err: any) {
        // User cancelled share or aborted
        if (err?.name !== 'AbortError') {
          handleCopyOffer();
        }
      }
    } else {
      // Fallback to copy if Web Share API is not available
      handleCopyOffer();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-offer-title"
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-[#EE4D2D] rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-offer-title" className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                Pré-visualização da Oferta
              </h2>
              <p className="text-xs text-slate-500">
                Modelo pronto e seguro para postar em grupos e redes sociais
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Security Notice: Confirming private commissions are hidden */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>100% Seguro:</strong> As comissões e dados privados foram removidos deste texto.
            </span>
          </div>

          {/* Product Summary Card */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 items-center sm:items-start">
            <img
              src={offer.imageUrl}
              alt={offer.productName}
              className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shrink-0 border border-slate-200 shadow-xs"
            />
            <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EE4D2D] bg-orange-100/90 px-2 py-0.5 rounded-md">
                <Tag className="w-3 h-3" />
                {offer.discountBadge || 'Oferta Shopee'}
              </span>
              <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                {offer.productName}
              </h3>
              <div className="flex items-baseline justify-center sm:justify-start gap-2 pt-0.5">
                {offer.originalPriceFormatted && (
                  <span className="text-xs text-slate-400 line-through">
                    {offer.originalPriceFormatted}
                  </span>
                )}
                <span className="text-lg font-black text-emerald-700">
                  {offer.promotionalPriceFormatted}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {offer.descriptionSnippet}
              </p>
            </div>
          </div>

          {/* Format Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Formato da Mensagem:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat('standard')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  selectedFormat === 'standard'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp / Grupos</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('compact')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  selectedFormat === 'compact'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Curto / Stories</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('urgent')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                  selectedFormat === 'urgent'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Relâmpago</span>
              </button>
            </div>
          </div>

          {/* Textarea Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Texto formatado para envio:
              </label>
              <button
                onClick={handleCopyOffer}
                className="text-xs text-[#EE4D2D] hover:underline font-semibold flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={offer.copyText}
                rows={7}
                className="w-full p-3.5 bg-slate-900 text-slate-100 rounded-2xl text-xs sm:text-sm font-mono leading-relaxed border border-slate-800 focus:outline-none resize-none shadow-inner"
              />
            </div>
          </div>

          {/* Affiliate Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Link de Afiliado Exemplo:
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={offer.affiliateLink}
                className="flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none truncate"
              />
              <button
                onClick={handleCopyLinkOnly}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors shrink-0 flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedLink ? 'Copiado' : 'Copiar Link'}
              </button>
              <a
                href={offer.affiliateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-slate-400 hover:text-[#EE4D2D]"
                title="Testar link no navegador"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar</span>
          </button>

          <button
            type="button"
            onClick={handleCopyOffer}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EE4D2D] hover:from-[#EE4D2D] hover:to-[#D73211] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Oferta Copiada!' : 'Copiar Oferta'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
