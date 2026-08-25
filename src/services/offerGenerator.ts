import { Product, OfferFormat } from '../types/product';

export interface GeneratedOffer {
  productId: string;
  productName: string;
  imageUrl: string;
  originalPriceFormatted: string;
  promotionalPriceFormatted: string;
  discountBadge: string;
  affiliateLink: string;
  copyText: string;
  descriptionSnippet: string;
  highlights: string[];
}

const UNAVAILABLE = 'Não disponível';

/**
 * Generates promotional text and shareable payload for an affiliate offer.
 * CRITICAL SECURITY RULE:
 * This generator NEVER includes commission %, commission R$ or private owner data.
 * Campos ausentes na API são tratados como "Não disponível" — nunca inventados.
 */
export function generateShareableOffer(product: Product, format: OfferFormat = 'standard'): GeneratedOffer {
  const origPrice =
    product.originalPrice !== null && product.currentPrice !== null && product.originalPrice > product.currentPrice
      ? product.originalPrice.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '';
  const promoPrice =
    product.currentPrice !== null
      ? product.currentPrice.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : UNAVAILABLE;
  const discountBadge =
    product.discountPercentage !== null && product.discountPercentage > 0
      ? `-${product.discountPercentage}% OFF`
      : '';

  const ratingText =
    product.rating !== null
      ? `⭐ Avaliação: ${product.rating.toFixed(1)} / 5.0${
          product.salesCountText ? ` (${product.salesCountText})` : ''
        }`
      : product.salesCountText
        ? `📦 ${product.salesCountText}`
        : '';

  const highlights = Array.isArray(product.highlightPoints)
    ? product.highlightPoints.filter(Boolean)
    : [];

  const link = product.affiliateUrl || 'Link indisponível';

  let copyText = '';

  if (format === 'standard') {
    // High-converting complete format for WhatsApp / Telegram groups
    copyText = [
      `🔥 *PROMOÇÃO RELÂMPAGO NA SHOPEE!* 🔥`,
      ``,
      `📦 *${product.name}*`,
      ``,
      origPrice ? `❌ De: ~${origPrice}~` : '',
      `✅ *Por apenas: ${promoPrice}*${discountBadge ? ` (${discountBadge})` : ''}`,
      product.isFreeShipping ? `🚚 Frete Grátis disponível no app!` : '',
      ratingText,
      ``,
      ...(highlights.length > 0
        ? [`✨ *Destaques do Produto:*`, ...highlights.map((point) => ` • ${point}`), ``]
        : []),
      `🛒 *COMPRE COM DESCONTO NO LINK OFICIAL:*`,
      `👇👇👇`,
      `${link}`,
      ``,
      `⚡ _Corra antes que o estoque com desconto acabe!_`,
    ]
      .filter((line) => line !== '')
      .join('\n');
  } else if (format === 'compact') {
    // Compact format for Instagram Direct / Twitter / Fast SMS
    copyText = [
      `🚨 *ACHADINHO SHOPEE:* ${product.name}`,
      `💰 ${origPrice ? `De ~${origPrice}~ por APENAS` : 'Por apenas'} *${promoPrice}*${discountBadge ? ` (${discountBadge})` : ''}`,
      product.isFreeShipping ? `🚚 Cupom de Frete Grátis!` : '',
      `👉 Garanta o seu aqui: ${link}`,
    ]
      .filter((line) => line !== '')
      .join('\n');
  } else {
    // Urgent flash promo format
    copyText = [
      `⏳ *MENOR PREÇO HISTÓRICO!* 💥`,
      ``,
      `👉 *${product.name}*`,
      `🔥 De ~${origPrice || UNAVAILABLE}~ por *${promoPrice}*`,
      discountBadge ? `🏷️ *Desconto de ${discountBadge} aplicado!*` : '',
      ``,
      `🔗 *Link direto com desconto:*`,
      `${link}`,
    ]
      .filter((line) => line !== '')
      .join('\n');
  }

  return {
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    originalPriceFormatted: origPrice,
    promotionalPriceFormatted: promoPrice,
    discountBadge,
    affiliateLink: link,
    copyText,
    descriptionSnippet: product.shortDescription || UNAVAILABLE,
    highlights,
  };
}
