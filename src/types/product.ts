export type FilterType = 'trending' | 'top_sales' | 'high_commission' | 'high_discount' | 'commission_8' | 'commission_10' | 'best_value';

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
  categoryIds?: number[];
  isFlashSale?: boolean;
}

export interface AffiliateSettings {
  affiliateTag: string;
  defaultFormat: 'standard' | 'compact' | 'urgent';
  includeHashtags: boolean;
  showPrivateCommission: boolean;
  theme: 'light' | 'dark';
}

export type OfferFormat = 'standard' | 'compact' | 'urgent';
