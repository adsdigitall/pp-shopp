export type FilterType = 'trending' | 'top_sales' | 'high_commission' | 'high_discount';

export interface PrivateCommission {
  percentage: number; // e.g. 14 -> 14%
  estimatedValue: number; // e.g. 18.90
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  salesCount: number;
  salesCountText: string;
  rating: number;
  reviewsCount: number;
  category: string;
  shopeeUrl: string;
  affiliateUrl: string;
  isFreeShipping?: boolean;
  isHot?: boolean;
  privateCommission: PrivateCommission;
  shortDescription: string;
  highlightPoints: string[];
}

export interface AffiliateSettings {
  affiliateTag: string;
  defaultFormat: 'standard' | 'compact' | 'urgent';
  includeHashtags: boolean;
  showPrivateCommission: boolean;
}

export type OfferFormat = 'standard' | 'compact' | 'urgent';
