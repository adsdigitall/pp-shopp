export type FilterType = 'trending' | 'top_sales' | 'high_commission' | 'high_discount' | 'commission_8' | 'commission_10' | 'best_value';
export type MarketplaceType = 'shopee' | 'mercado_livre' | 'amazon' | 'tiktok_shop' | 'shein' | 'aliexpress';
export type AffiliateProviderType = 'official' | 'bot_do_afiliado' | 'afilitools' | 'afilimax' | 'manual';
export type AffiliateLinkStatus = 'pending' | 'generated' | 'failed' | 'expired' | 'manual_required';

export interface PrivateCommission {
  percentage: number | null;
  estimatedValue: number | null;
}

export interface Product {
  id: string;
  marketplace: MarketplaceType;
  marketplaceProductId: string;
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
  productUrl: string;
  affiliateUrl: string;
  originalUrl?: string;
  sellerId: string;
  sellerName: string;
  sellerReputation: number | null;
  isFreeShipping: boolean;
  shippingCost: number | null;
  stock: number | null;
  isFlashSale: boolean;
  isHot?: boolean;
  affiliateProvider: AffiliateProviderType;
  affiliateStatus: AffiliateLinkStatus;
  privateCommission: PrivateCommission;
  commissionRate: number | null;
  commissionAmount: number | null;
  offerScore: number | null;
  shortDescription: string;
  highlightPoints: string[];
  categoryIds?: number[];
  fetchedAt: string;
}

export interface AffiliateSettings {
  affiliateTag: string;
  defaultFormat: 'standard' | 'compact' | 'urgent';
  includeHashtags: boolean;
  showPrivateCommission: boolean;
  theme: 'light' | 'dark' | 'system';
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
  schedule: string;
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

export type SectionId = 
  | 'visao-geral' 
  | 'garimpar' 
  | 'disparar' 
  | 'fila' 
  | 'ofertas'
  | 'paginas' 
  | 'templates'
  | 'espelhamento' 
  | 'grupos' 
  | 'metricas' 
  | 'extensao' 
  | 'configuracoes'
  | 'tutoriais'
  | 'suporte'
  | 'whatsapp';

export interface QueueItem {
  id: string;
  product: Product;
  addedAt: string;
  selected: boolean;
}

export interface DispatchJob {
  id: string;
  status: 'draft' | 'pending' | 'running' | 'completed' | 'failed';
  step: 1 | 2 | 3;
  offers: QueueItem[];
  message: {
    whatsapp: {
      enabled: boolean;
      templateId: string;
      customMessage: string;
      showImage: boolean;
      rotatingCTAs: boolean;
    };
  };
  destinations: {
    groups: Group[];
    schedule: 'now' | 'scheduled';
    scheduledAt?: string;
    interval: { value: number; unit: 'seconds' | 'minutes' | 'hours' };
    nightPause: boolean;
    weekendPause: boolean;
    expirePause: boolean;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  stats: { sent: number; failed: number; pending: number };
}

export interface Group {
  id: string;
  name: string;
  memberCount: number;
  isAdmin: boolean;
  status: 'active' | 'healthy' | 'warning';
  messagesSent30d: number;
  messagesReceived30d: number;
  lastActivity: string;
  addedAt: string;
}

export interface MirroringConfig {
  id: string;
  name: string;
  sourceGroupId: string;
  destinationGroupIds: string[];
  type: 'instant' | 'shuffled';
  templateIds: string[];
  onlyOffers: boolean;
  couponSource: 'origin' | 'own';
  iAmPoster: boolean;
  status: 'active' | 'paused';
  createdAt: string;
}

export interface PublicPage {
  id: string;
  name: string;
  type: 'vitrine' | 'convite' | 'linktree';
  status: 'draft' | 'published';
  slug: string;
  products: string[];
  customization: {
    theme: 'light' | 'dark';
    primaryColor: string;
    logo?: string;
    description?: string;
  };
  createdAt: string;
  publishedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  message: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  platform: 'shopee' | 'mercado_livre' | 'amazon' | 'magalu';
  code: string;
  description?: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface Settings {
  channels: {
    whatsapp: { connected: boolean; phone?: string; instanceId?: string };
    telegram: { connected: boolean; botToken?: string; chatId?: string };
  };
  platforms: {
    shopee: { appId: string; secret: string; validated: boolean };
    mercadoLivre: { affiliateTag: string; accessToken?: string };
    amazon: { associateTag: string };
    magalu: { storeSlug: string };
  };
  templates: Template[];
  coupons: Coupon[];
  security: {
    safeInterval: boolean;
  };
  account: {
    name: string;
    email: string;
    plan: 'free' | 'pro' | 'viral';
    subscriptionStatus: 'active' | 'canceled' | 'past_due';
  };
}

export type GarimparTab = 'buscar' | 'categorias' | 'mais-buscados' | 'lojas' | 'links';
export type GarimparPlatform = 'shopee' | 'mercado_livre' | 'amazon' | 'magalu';
export type GarimparFilter = 'mais-vendidos' | 'maior-comissao' | 'menor-preco' | 'com-desconto' | 'avaliacao-4';
export type DispatchStep = 1 | 2 | 3 | 4 | 5;
export type PageType = 'vitrine' | 'convite' | 'linktree';
export type PageStatus = 'draft' | 'published';
export type MirroringType = 'instant' | 'shuffled';
export type CouponSource = 'origin' | 'own';
export type DispatchSchedule = 'now' | 'scheduled';
export type IntervalUnit = 'seconds' | 'minutes' | 'hours';
export type GroupsTab = 'monitor' | 'protecao' | 'campanhas';
export type SettingsTab = 'canais' | 'plataformas' | 'templates' | 'cupons' | 'seguranca' | 'conta';

export interface WhatsAppSession {
  id: string;
  userId: string;
  name: string;
  status: 'disconnected' | 'connecting' | 'qr_code' | 'working' | 'failed';
  qrCode?: string;
  phone?: string;
  connectedAt?: string;
  createdAt: string;
}

export interface DispatchPayload {
  waha_session: string;
  template_type: string;
  delay_between_groups: number;
  delay_between_products: number;
  groups: Array<{ id: string; name: string }>;
  products: Array<{
    marketplace: string;
    product_id: string;
    title: string;
    original_price: number;
    current_price: number;
    discount_percentage: number;
    commission_percentage: number;
    image_url: string;
    affiliate_url: string;
    category: string;
    message: string;
  }>;
}
