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

/**
 * Generates promotional text and shareable payload for an affiliate offer.
 * CRITICAL SECURITY RULE:
 * This generator NEVER includes commission %, commission R$ or private owner data.
 */
export function generateShareableOffer(product: Product, format: OfferFormat = 'standard'): GeneratedOffer {
  const origPrice = product.originalPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const promoPrice = product.currentPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const discountBadge = `-${product.discountPercentage}% OFF`;

  let copyText = '';

  if (format === 'standard') {
    // High-converting complete format for WhatsApp / Telegram groups
    copyText = [
      `🔥 *PROMOÇÃO RELÂMPAGO NA SHOPEE!* 🔥`,
      ``,
      `📦 *${product.name}*`,
      ``,
      `❌ De: ~${origPrice}~`,
      `✅ *Por apenas: ${promoPrice}* (${discountBadge})`,
      product.isFreeShipping ? `🚚 Frete Grátis disponível no app!` : '',
      `⭐ Avaliação: ${product.rating.toFixed(1)} / 5.0 (${product.salesCountText})`,
      ``,
      `✨ *Destaques do Produto:*`,
      ...product.highlightPoints.map((point) => ` • ${point}`),
      ``,
      `🛒 *COMPRE COM DESCONTO NO LINK OFICIAL:*`,
      `👇👇👇`,
      `${product.affiliateUrl}`,
      ``,
      `⚡ _Corra antes que o estoque com desconto acabe!_`,
    ]
      .filter((line) => line !== '')
      .join('\n');
  } else if (format === 'compact') {
    // Compact format for Instagram Direct / Twitter / Fast SMS
    copyText = [
      `🚨 *ACHADINHO SHOPEE:* ${product.name}`,
      `💰 De ~${origPrice}~ por APENAS *${promoPrice}* (${discountBadge})`,
      product.isFreeShipping ? `🚚 Cupom de Frete Grátis!` : '',
      `👉 Garanta o seu aqui: ${product.affiliateUrl}`,
    ]
      .filter((line) => line !== '')
      .join('\n');
  } else {
    // Urgent flash promo format
    copyText = [
      `⏳ *MENOR PREÇO HISTÓRICO!* 💥`,
      ``,
      `👉 *${product.name}*`,
      `🔥 De ~${origPrice}~ por *${promoPrice}*`,
      `🏷️ *Desconto de ${product.discountPercentage}% aplicado!*`,
      ``,
      `🔗 *Link direto com desconto:*`,
      `${product.affiliateUrl}`,
    ].join('\n');
  }

  return {
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    originalPriceFormatted: origPrice,
    promotionalPriceFormatted: promoPrice,
    discountBadge,
    affiliateLink: product.affiliateUrl,
    copyText,
    descriptionSnippet: product.shortDescription,
    highlights: product.highlightPoints,
  };
}
