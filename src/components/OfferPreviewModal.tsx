import React, { useState, useEffect } from 'react';
import { Product } from '../types/product';
import { 
  generateShareableOffer, 
  getNextReaction, 
  getNextImageStyle, 
  CopyReaction, 
  ImageStyle 
} from '../services/offerGenerator';
import { 
  X, 
  Copy, 
  Share2, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Truck, 
  ShieldCheck, 
  ExternalLink,
  Loader2,
  MessageCircle
} from 'lucide-react';

interface OfferPreviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

async function createOfferCardFile(product: Product, offer: ReturnType<typeof generateShareableOffer>, imageUrl = offer.imageUrl): Promise<File | null> {
  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#17212b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 40, 1000, 820);
    const scale = Math.max(1000 / bitmap.width, 780 / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    ctx.drawImage(bitmap, 40 + (1000 - width) / 2, 60 + (780 - height) / 2, width, height);
    ctx.fillStyle = '#ee4d2d';
    ctx.fillRect(40, 820, 1000, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px Arial';
    ctx.fillText('OFERTA SHOPEE', 70, 980);
    ctx.font = '700 40px Arial';
    ctx.fillText(product.name.slice(0, 45), 70, 1040);
    ctx.fillStyle = '#ffb000';
    ctx.font = '700 36px Arial';
    if (offer.discountBadge) ctx.fillText(offer.discountBadge, 70, 1100);
    if (offer.originalPriceFormatted) {
      ctx.fillStyle = '#aeb8c2';
      ctx.font = '500 30px Arial';
      ctx.fillText(offer.originalPriceFormatted, 70, 1150);
      const oldWidth = ctx.measureText(offer.originalPriceFormatted).width;
      ctx.strokeStyle = '#aeb8c2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(70, 1140);
      ctx.lineTo(70 + oldWidth, 1140);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px Arial';
    ctx.fillText(offer.promotionalPriceFormatted, 70, offer.originalPriceFormatted ? 1220 : 1190);
    ctx.fillStyle = '#aeb8c2';
    ctx.font = '500 24px Arial';
    ctx.fillText('Toque no link para aproveitar', 70, 1260);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ? new File([blob], `oferta-${offer.productId}.jpg`, { type: 'image/jpeg' }) : null;
  } catch {
    return null;
  }
}

export const OfferPreviewModal: React.FC<OfferPreviewModalProps> = ({
  product,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [reaction, setReaction] = useState<CopyReaction>('love');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('badge_discount');
  const [isRegeneratingCopy, setIsRegeneratingCopy] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReaction('love');
      setImageStyle('badge_discount');
      setCopiedText(false);
      setCopiedLink(false);
      setGeneratedImageUrl(null);
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const offer = generateShareableOffer(product, reaction, imageStyle);
  const displayImageUrl = generatedImageUrl || offer.imageUrl;

  // Button: Regenerar Copy
  const handleRegenerateCopy = () => {
    setIsRegeneratingCopy(true);
    setTimeout(() => {
      const next = getNextReaction(reaction);
      setReaction(next);
      setIsRegeneratingCopy(false);
      onShowToast('Copy atualizada!', undefined, 'info');
    }, 250);
  };

  // Button: Regenerar Imagem
  const handleRegenerateImage = async () => {
    setIsRegeneratingImage(true);
    try {
      const response = await fetch('/api/offer-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          description: product.shortDescription,
          discount: offer.discountBadge,
          price: offer.promotionalPriceFormatted,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && typeof data?.imageUrl === 'string') {
        setGeneratedImageUrl(data.imageUrl);
        onShowToast('Imagem gerada com IA!', undefined, 'success');
      } else {
        setImageStyle(getNextImageStyle(imageStyle));
        onShowToast('IA indisponível; visual alternativo aplicado.', undefined, 'info');
      }
    } catch {
      setImageStyle(getNextImageStyle(imageStyle));
      onShowToast('IA indisponível; visual alternativo aplicado.', undefined, 'info');
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  // Button: Copiar Texto
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(offer.copyText);
      setCopiedText(true);
      onShowToast('Texto copiado com sucesso!', 'Pronto para enviar no WhatsApp.', 'success');
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      onShowToast('Erro ao copiar texto', undefined, 'error');
    }
  };

  // Button: Copiar Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(offer.affiliateLink);
      setCopiedLink(true);
      onShowToast('Link copiado!', 'Link pronto para envio.', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      onShowToast('Erro ao copiar link', undefined, 'error');
    }
  };

  // Button: Compartilhar
  const handleShare = async () => {
    if (navigator.share) {
      try {
        let shareData: ShareData = {
          title: `Oferta Shopee: ${offer.productName}`,
          text: offer.copyText,
          url: offer.affiliateLink,
        };
        const personalizedCard = await createOfferCardFile(product, offer, displayImageUrl);
        if (personalizedCard && (!navigator.canShare || navigator.canShare({ files: [personalizedCard] }))) {
          shareData = { ...shareData, files: [personalizedCard] };
        }
        await navigator.share(shareData);
        onShowToast('Compartilhado com sucesso!', undefined, 'success');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyText();
        }
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-offer-title"
      >
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#FF7A00] flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="modal-offer-title" className="font-black text-base text-slate-900 leading-tight">
                Prévia da Oferta
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Visual exato de como aparecerá no grupo de WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-100/70">
          
          {/* Security Notice */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-800 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>100% Seguro:</strong> Suas comissões privadas não aparecem nesta mensagem.
            </span>
          </div>

          {/* REALISTIC WHATSAPP PREVIEW CARD (Matching the reference screenshot) */}
          <div className="bg-[#1f2c34] text-white rounded-3xl p-3 sm:p-4 shadow-xl border border-slate-700/50 space-y-3 relative overflow-hidden">
            
            {/* WhatsApp Header Badge */}
            <div className="flex items-center justify-between pb-1 text-[11px] text-slate-400 font-medium border-b border-slate-700/60">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Mensagem WhatsApp</span>
              </div>
              <span>Somente admins</span>
            </div>

            {/* Product Image in WhatsApp Bubble */}
            <div className="relative aspect-square w-full max-h-56 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/70 flex items-center justify-center">
              {isRegeneratingImage ? (
                <div className="flex flex-col items-center gap-2 text-orange-400">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-xs font-semibold">Atualizando imagem...</span>
                </div>
              ) : (
                <>
                  <img
                    src={displayImageUrl}
                    alt={offer.productName}
                    className="w-full h-full object-cover"
                  />

                  {/* Badges on image */}
                  {imageStyle !== 'original' && offer.discountBadge && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-[#EE4D2D] text-white shadow-md shadow-orange-600/40">
                        {offer.discountBadge}
                      </span>
                    </div>
                  )}

                  {(imageStyle === 'badge_full' || imageStyle === 'badge_shipping') && offer.isFreeShipping && (
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                        <Truck className="w-3 h-3" />
                        Frete Grátis
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Clean Copy Content (Exact WhatsApp Structure) */}
            {isRegeneratingCopy ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-orange-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-semibold">Regenerando texto...</span>
              </div>
            ) : (
              <div className="space-y-2 text-xs sm:text-sm font-sans leading-relaxed pt-1">
                {/* 1. Reaction Headline */}
                <div className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                  {offer.headline}
                </div>

                {/* 2. Product Title */}
                <div className="text-slate-200 font-semibold leading-snug">
                  {offer.productName}
                </div>

                {/* 3. Pricing */}
                <div className="pt-1 text-xs sm:text-sm space-y-0.5">
                  {offer.originalPriceFormatted && (
                    <div className="text-slate-400 line-through decoration-slate-400/80 decoration-2">
                      De: {offer.originalPriceFormatted}
                    </div>
                  )}
                  {offer.discountBadge && (
                    <div className="text-orange-300 font-bold">
                      Desconto: {offer.discountBadge}
                    </div>
                  )}
                  <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                    <span>Por {offer.promotionalPriceFormatted}</span>
                    <span className="text-emerald-400 text-base">✅</span>
                  </div>
                  {offer.isFreeShipping && (
                    <div className="text-emerald-400 font-semibold text-xs pt-0.5 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Frete Grátis disponível</span>
                    </div>
                  )}
                </div>

                {/* 4. Call to Action & Link */}
                <div className="pt-2">
                  <div className="text-slate-300 font-bold">
                    compre aqui 🛍️
                  </div>
                  <div className="text-[#38bdf8] font-semibold underline break-all text-xs pt-0.5">
                    🔗 {offer.affiliateLink}
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400 pt-1">
                  14:26
                </div>
              </div>
            )}

          </div>

          {/* REGENERATION ACTION BUTTONS (Regenerar copy & Regenerar imagem) */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleRegenerateCopy}
              disabled={isRegeneratingCopy}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#EE4D2D] ${isRegeneratingCopy ? 'animate-spin' : ''}`} />
              <span>{isRegeneratingCopy ? 'Gerando...' : 'Regenerar copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleRegenerateImage}
              disabled={isRegeneratingImage}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className={`w-3.5 h-3.5 text-[#EE4D2D] ${isRegeneratingImage ? 'animate-spin' : ''}`} />
              <span>{isRegeneratingImage ? 'Trocando...' : 'Regenerar imagem'}</span>
            </button>
          </div>

          {/* Quick Copy Link Row */}
          <div className="flex items-center gap-2 p-2 bg-white rounded-2xl border border-slate-200">
            <LinkIcon className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              readOnly
              value={offer.affiliateLink}
              className="flex-1 bg-transparent text-xs font-medium text-slate-600 outline-none truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar link'}</span>
            </button>
            <a
              href={offer.affiliateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-[#EE4D2D]"
              title="Testar link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedText ? 'Texto Copiado!' : 'Copiar texto'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#EE4D2D] hover:from-[#EE4D2D] hover:to-[#D73211] active:scale-[0.98] text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartilhar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
