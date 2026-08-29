import { Product } from '../types/product';

export type CopyReaction = 'love' | 'look' | 'urgent' | 'found';
export type ImageStyle = 'original' | 'badge_discount' | 'badge_shipping' | 'badge_full';

export interface GeneratedOffer {
  productId: string;
  productName: string;
  imageUrl: string;
  originalPriceFormatted: string;
  promotionalPriceFormatted: string;
  discountBadge: string;
  isFreeShipping: boolean;
  affiliateLink: string;
  copyText: string;
  reaction: CopyReaction;
  headline: string;
  imageStyle: ImageStyle;
}

const REACTIONS: { id: CopyReaction; headline: string; label: string }[] = [
  { id: 'love', headline: 'EU AMEIIII!🤩❤️', label: 'Eu Amei (Viral)' },
  { id: 'look', headline: 'OLHA ESSA OFERTA!😱🔥', label: 'Olha Essa Oferta' },
  { id: 'found', headline: 'ACHADINHO PERFEITO!✨🛍️', label: 'Achadinho' },
  { id: 'urgent', headline: 'BAIXOU MUITO!💥⏳', label: 'Relâmpago / Urgente' },
];

const IMAGE_STYLES: ImageStyle[] = ['badge_discount', 'badge_full', 'badge_shipping', 'original'];

/**
 * Generates the clean, punchy WhatsApp affiliate format based directly on high-converting reference:
 *
 * EU AMEIIII!🤩❤️
 *
 * Nome do Produto
 *
 * De: R$ 299,99
 * Por R$ 224,99 ✅
 *
 * compre aqui 🛍️
 * 🔗 https://s.shopee.com.br/aff_link
 *
 * RULES:
 * - NO hashtags
 * - NO long paragraphs
 * - NO commission metrics (Strict privacy)
 */
export function generateShareableOffer(
  product: Product,
  reactionId: CopyReaction = 'love',
  imageStyle: ImageStyle = 'badge_discount'
): GeneratedOffer {
  const origPrice =
    product.originalPrice !== null &&
    product.currentPrice !== null &&
    product.originalPrice > product.currentPrice
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
      : 'Confira no link';

  const discountBadge =
    product.discountPercentage !== null && product.discountPercentage > 0
      ? `${product.discountPercentage}% OFF`
      : '';

  const isFreeShipping = Boolean(product.isFreeShipping);
  const link = product.affiliateUrl || 'https://shopee.com.br';

  const selectedReaction = REACTIONS.find((r) => r.id === reactionId) || REACTIONS[0];
  const headline = selectedReaction.headline;

  const copyLines = [
    '🚨 RADAR ENCONTROU!',
    ``,
    product.name,
    ``,
    origPrice ? `~De: ${origPrice}~` : '',
    discountBadge ? `*Desconto: ${discountBadge}*` : '',
    `*Por ${promoPrice} ✅*`,
    `🏷️ Oferta na Shopee`,
    `⚡ Pode acabar a qualquer momento`,
    isFreeShipping ? `🚚 Frete Grátis disponível` : '',
    ``,
    `compre aqui 🛍️`,
    `🔗 ${link}`,
  ].filter((line) => line !== '');

  const copyText = copyLines.join('\n');

  return {
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    originalPriceFormatted: origPrice,
    promotionalPriceFormatted: promoPrice,
    discountBadge,
    isFreeShipping,
    affiliateLink: link,
    copyText,
    reaction: reactionId,
    headline,
    imageStyle,
  };
}

export function getNextReaction(current: CopyReaction): CopyReaction {
  const currentIndex = REACTIONS.findIndex((r) => r.id === current);
  const nextIndex = (currentIndex + 1) % REACTIONS.length;
  return REACTIONS[nextIndex].id;
}

export function getNextImageStyle(current: ImageStyle): ImageStyle {
  const currentIndex = IMAGE_STYLES.indexOf(current);
  const nextIndex = (currentIndex + 1) % IMAGE_STYLES.length;
  return IMAGE_STYLES[nextIndex];
}
