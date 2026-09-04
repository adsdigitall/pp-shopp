export type FilterType = 'trending' | 'top_sales' | 'high_commission' | 'high_discount' | 'commission_8' | 'commission_10' | 'best_value';
export type MarketplaceType = 'shopee' | 'mercado_livre' | 'amazon' | 'tiktok_shop' | 'shein' | 'aliexpress';
export type AffiliateProviderType = 'official' | 'bot_do_afiliado' | 'afilitools' | 'afilimax' | 'manual';
export type AffiliateLinkStatus = 'pending' | 'generated' | 'failed' | 'expired' | 'manual_required';

export interface PrivateCommission {
  percentage: number | null; // e.g. 14 -> 14%
  estimatedValue: number | null; // e.g. 18.90
}

export interface Product {
  // Identificação
  id: string;                          // ID interno único
  marketplace: MarketplaceType;        // 'shopee' | 'mercado_livre' | ...
  marketplaceProductId: string;        // ID original no marketplace (MLB123, itemId Shopee)
  
  // Dados básicos
  name: string;
  imageUrl: string;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercentage: number | null;
  salesCount: number | null;
  salesCountText: string | null;
  rating: number | null;
  reviewsCount: number | null;
  category: string;
  categoryId: string | number | null;
  
  // URLs
  productUrl: string;                  // URL canônica do produto no marketplace
  affiliateUrl: string;                // URL com tracking de afiliado
  originalUrl?: string;                // URL original antes de conversão afiliada
  
  // Vendedor
  sellerId: string;
  sellerName: string;
  sellerReputation: number | null;     // 0-1 score de reputação
  
  // Entrega
  isFreeShipping: boolean;
  shippingCost: number | null;
  stock: number | null;
  
  // Promoções
  isFlashSale: boolean;
  isHot?: boolean;
  
  // Afiliado
  affiliateProvider: AffiliateProviderType;
  affiliateStatus: AffiliateLinkStatus;
  
  // Comissão privada (apenas painel interno)
  privateCommission: PrivateCommission;
  commissionRate: number | null;       // % de comissão
  commissionAmount: number | null;     // R$ estimado
  
  // Scoring
  offerScore: number | null;           // 0-10
  
  // Metadados
  shortDescription: string;
  highlightPoints: string[];
  categoryIds?: number[];
  fetchedAt: string;                   // ISO date
}

export interface AffiliateSettings {
  affiliateTag: string;
  defaultFormat: 'standard' | 'compact' | 'urgent';
  includeHashtags: boolean;
  showPrivateCommission: boolean;
  theme: 'light' | 'dark';
}

export interface MarketplaceConnection {
  marketplace: MarketplaceType;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'token_expired' | 'connecting';
  account?: { id: string; nickname: string; email?: string };
  affiliateConfigured: boolean;
  affiliateProvider: AffiliateProviderType;
  tokenExpiresAt?: number;
}

export interface AffiliateConfig {
  marketplace: MarketplaceType;
  affiliateTag: string;
  affiliateProvider: AffiliateProviderType;
  providerConfig: Record<string, any>;
  isEnabled: boolean;
}

export interface AutoSearchConfig {
  id: string;
  name: string;
  marketplace: MarketplaceType;
  filters: Record<string, any>;
  minOfferScore: number;
  cooldownHours: number;
  targetChannels: string[];
  schedule: string; // cron expression
  maxResultsPerRun: number;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationHistoryEntry {
  id: string;
  userId: string;
  marketplace: MarketplaceType;
  productId: string;
  marketplaceProductId: string;
  productName: string;
  price: number | null;
  originalPrice: number | null;
  affiliateUrl: string;
  originalUrl: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  offerScore: number | null;
  affiliateProvider: AffiliateProviderType;
}

export type OfferFormat = 'standard' | 'compact' | 'urgent';