/**
 * Tipos base para o sistema de Marketplace Providers.
 * Arquitetura aberta para adicionar novas plataformas (Amazon, TikTok Shop, Shein, AliExpress, etc.)
 */

export const MarketplaceType = {
  SHOPEE: 'shopee',
  MERCADO_LIVRE: 'mercado_livre',
  AMAZON: 'amazon',
  TIKTOK_SHOP: 'tiktok_shop',
  SHEIN: 'shein',
  ALIEXPRESS: 'aliexpress',
};

export const AffiliateProviderType = {
  OFFICIAL: 'official',
  BOT_DO_AFILIADO: 'bot_do_afiliado',
  AFILITOOLS: 'afilitools',
  AFILIMAX: 'afilimax',
  MANUAL: 'manual',
};

export const ProductSearchFilters = {
  keyword: '',
  categoryId: null,
  minPrice: null,
  maxPrice: null,
  minDiscount: null,
  sellerId: null,
  productId: null,
  productUrl: null,
  sortBy: 'relevance',
  page: 1,
  limit: 20,
};

export const OfferScoreWeights = {
  discount: 0.30,
  price: 0.15,
  relevance: 0.20,
  sellerReputation: 0.15,
  freeShipping: 0.10,
  priceHistory: 0.10,
};

export const OfferScoreThresholds = {
  AUTO_PUBLISH_MIN: 7.0,
  HIGH_QUALITY: 8.5,
  EXCELLENT: 9.0,
};

export const CooldownDefaults = {
  DEFAULT_HOURS: 24,
  MIN_HOURS: 1,
  MAX_HOURS: 168,
};

/**
 * Interface para um produto normalizado (contrato interno do app)
 */
export class NormalizedProduct {
  constructor(data = {}) {
    this.id = data.id || '';
    this.marketplace = data.marketplace || '';
    this.marketplaceProductId = data.marketplaceProductId || '';
    this.name = data.name || '';
    this.imageUrl = data.imageUrl || '';
    this.currentPrice = data.currentPrice ?? null;
    this.originalPrice = data.originalPrice ?? null;
    this.discountPercentage = data.discountPercentage ?? null;
    this.salesCount = data.salesCount ?? null;
    this.rating = data.rating ?? null;
    this.reviewsCount = data.reviewsCount ?? null;
    this.category = data.category || '';
    this.categoryId = data.categoryId ?? null;
    this.productUrl = data.productUrl || '';
    this.affiliateUrl = data.affiliateUrl || '';
    this.sellerId = data.sellerId || '';
    this.sellerName = data.sellerName || '';
    this.sellerReputation = data.sellerReputation ?? null;
    this.isFreeShipping = data.isFreeShipping ?? false;
    this.shippingCost = data.shippingCost ?? null;
    this.stock = data.stock ?? null;
    this.isFlashSale = data.isFlashSale ?? false;
    this.fetchedAt = data.fetchedAt || new Date().toISOString();
    this.affiliateProvider = data.affiliateProvider || AffiliateProviderType.MANUAL;
    this.affiliateStatus = data.affiliateStatus || 'pending';
    this.commissionRate = data.commissionRate ?? null;
    this.commissionAmount = data.commissionAmount ?? null;
    this.offerScore = data.offerScore ?? null;
  }
}

/**
 * Resultado de busca paginado
 */
export class SearchResult {
  constructor(data = {}) {
    this.products = data.products || [];
    this.page = data.page || 1;
    this.limit = data.limit || 20;
    this.hasNextPage = data.hasNextPage || false;
    this.totalCount = data.totalCount ?? null;
    this.meta = data.meta || {};
  }
}

/**
 * Credenciais de marketplace (armazenadas no backend)
 */
export class MarketplaceCredentials {
  constructor(data = {}) {
    this.marketplace = data.marketplace || '';
    this.userId = data.userId || '';
    this.accessToken = data.accessToken || '';
    this.refreshToken = data.refreshToken || '';
    this.expiresAt = data.expiresAt || null;
    this.scope = data.scope || '';
    this.accountId = data.accountId || '';
    this.accountNickname = data.accountNickname || '';
    this.isActive = data.isActive ?? true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}

/**
 * Configuração de afiliado para um marketplace
 */
export class AffiliateConfig {
  constructor(data = {}) {
    this.marketplace = data.marketplace || '';
    this.userId = data.userId || '';
    this.affiliateTag = data.affiliateTag || '';
    this.affiliateProvider = data.affiliateProvider || AffiliateProviderType.MANUAL;
    this.providerConfig = data.providerConfig || {};
    this.isEnabled = data.isEnabled ?? true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
}

/**
 * Histórico de divulgação para evitar duplicatas
 */
export class PublicationHistory {
  constructor(data = {}) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.marketplace = data.marketplace || '';
    this.productId = data.productId || '';
    this.marketplaceProductId = data.marketplaceProductId || '';
    this.productName = data.productName || '';
    this.price = data.price ?? null;
    this.originalPrice = data.originalPrice ?? null;
    this.affiliateUrl = data.affiliateUrl || '';
    this.originalUrl = data.originalUrl || '';
    this.channelId = data.channelId || '';
    this.channelName = data.channelName || '';
    this.publishedAt = data.publishedAt || new Date().toISOString();
    this.offerScore = data.offerScore ?? null;
    this.affiliateProvider = data.affiliateProvider || AffiliateProviderType.MANUAL;
  }
}

/**
 * Configuração de busca automática
 */
export class AutoSearchConfig {
  constructor(data = {}) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.marketplace = data.marketplace || '';
    this.name = data.name || '';
    this.isActive = data.isActive ?? false;
    this.filters = data.filters || {};
    this.minOfferScore = data.minOfferScore || OfferScoreThresholds.AUTO_PUBLISH_MIN;
    this.cooldownHours = data.cooldownHours || CooldownDefaults.DEFAULT_HOURS;
    this.targetChannels = data.targetChannels || [];
    this.schedule = data.schedule || '*/30 * * * *';
    this.maxResultsPerRun = data.maxResultsPerRun || 5;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastRunAt = data.lastRunAt || null;
  }
}