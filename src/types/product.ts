export type FilterType = 'trending' | 'top_sales' | 'high_commission' | 'high_discount';

export interface PrivateCommission {
  percentage: number | null; // ex.: 14 -> 14% | null = API não forneceu
  estimatedValue: number | null; // ex.: 18.90 | null = API não forneceu
}

/**
 * Produto normalizado vindo do nosso backend (/api/products).
 * Campos `null` = dado não disponível na Shopee Affiliate API.
 * REGRA: NUNCA inventar valores no frontend — exibir "Não disponível".
 *
 * privateCommission é PRIVATE DATA: proibido em payloads de compartilhamento.
 */
export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercentage: number | null;
  salesCount: number | null;
  salesCountText: string | null;
  rating: number | null;
  reviewsCount: number | null;
  category: string | null;
  shopeeUrl: string | null;
  affiliateUrl: string | null;
  isFreeShipping?: boolean;
  isHot?: boolean;
  privateCommission: PrivateCommission;
  shortDescription: string | null;
  highlightPoints: string[];
}

export interface AffiliateSettings {
  affiliateTag: string;
  defaultFormat: 'standard' | 'compact' | 'urgent';
  includeHashtags: boolean;
  showPrivateCommission: boolean;
}

export type OfferFormat = 'standard' | 'compact' | 'urgent';
