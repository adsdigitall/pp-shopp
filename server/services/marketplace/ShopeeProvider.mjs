/**
 * Shopee Provider - Wrapper para a integração existente da Shopee Affiliate API.
 * Mantém compatibilidade total com o código atual.
 */

import { MarketplaceProvider } from './MarketplaceProvider.mjs';
import { NormalizedProduct, SearchResult } from './types.mjs';
import { loadShopeeConfig } from '../shopee/config.mjs';
import { searchProductOffers, mapFilterToShopeeArgs } from '../shopee/products.mjs';
import { normalizeProductOffers, normalizeProductOffer } from '../shopee/normalizer.mjs';
import { SHOPEE_GRAPHQL_ENDPOINT } from '../shopee/config.mjs';

/**
 * Mapeia filtro interno para args da Shopee
 */
function mapFilterToShopeeArgsInternal(filter) {
  switch (filter) {
    case 'top_sales':
      return { listType: 0, sortType: 2 };
    case 'high_commission':
      return { listType: 1, sortType: 5 };
    case 'high_discount':
      return { listType: 0, sortType: 1 };
    case 'trending':
    default:
      return { listType: 0, sortType: 1 };
  }
}

/**
 * Converte filtros genéricos para parâmetros da Shopee
 */
function convertFiltersToShopee(filters) {
  const { listType, sortType } = mapFilterToShopeeArgsInternal(filters.sortBy || 'trending');
  
  return {
    keyword: filters.keyword || '',
    filter: filters.sortBy || 'trending',
    page: filters.page || 1,
    limit: filters.limit || 12,
    categoryId: filters.categoryId || null,
  };
}

export class ShopeeProvider extends MarketplaceProvider {
  constructor(config) {
    super({ ...config, marketplace: 'shopee' });
    this.config = null;
    this.initialized = false;
  }

  /**
   * Inicializa configuração (carrega do .env)
   */
  async init() {
    if (this.initialized) return;
    
    // Credenciais do app (server-side only) vêm do .env
    const appConfig = loadShopeeConfig();
    
    // Credenciais do usuário (OAuth) vêm do banco
    this.config = {
      ...appConfig,
      userAccessToken: this.credentials?.accessToken || null,
      userRefreshToken: this.credentials?.refreshToken || null,
      userExpiresAt: this.credentials?.expiresAt || null,
    };
    
    this.initialized = true;
  }

  /**
   * Busca produtos na Shopee Affiliate API
   */
  async searchProducts(filters) {
    await this.init();
    
    const shopeeFilters = convertFiltersToShopee(filters);
    const { listType, sortType } = mapFilterToShopeeArgsInternal(shopeeFilters.filter);
    
    // Monta query GraphQL
    const args = [
      `listType: ${listType}`,
      `sortType: ${sortType}`,
      `page: ${shopeeFilters.page}`,
      `limit: ${shopeeFilters.limit}`,
    ];
    
    if (shopeeFilters.keyword.trim()) {
      args.unshift(`keyword: "${shopeeFilters.keyword.trim().replace(/"/g, '\\"')}"`);
    }
    if (shopeeFilters.categoryId) {
      args.unshift(`productCatId: ${shopeeFilters.categoryId}`);
    }
    
    const query = `{
      productOfferV2(${args.join(', ')}) {
        nodes {
          itemId
          productName
          productLink
          offerLink
          imageUrl
          priceMin
          priceMax
          priceDiscountRate
          sales
          ratingStar
          commissionRate
          commission
          shopId
          shopName
          productCatIds
          periodStartTime
          periodEndTime
        }
        pageInfo {
          page
          limit
          hasNextPage
        }
      }
    }`;
    
    // Usa o client existente
    const { shopeeGraphqlRequest } = await import('../shopee/client.mjs');
    const data = await shopeeGraphqlRequest({ query, config: this.config });
    const result = data?.productOfferV2;
    
    const nodes = Array.isArray(result?.nodes) ? result.nodes : [];
    const products = normalizeProductOffers(nodes, shopeeFilters.filter);
    
    return new SearchResult({
      products: products.map(p => this.normalizeProduct(p)),
      page: result?.pageInfo?.page || shopeeFilters.page,
      limit: result?.pageInfo?.limit || shopeeFilters.limit,
      hasNextPage: Boolean(result?.pageInfo?.hasNextPage),
      meta: {
        source: 'shopee-affiliate-api',
        operation: 'productOfferV2',
        listType,
        sortType,
      },
    });
  }

  /**
   * Obtém produto por ID
   */
  async getProduct(productId) {
    // A Shopee Affiliate API não tem endpoint de produto único
    // Busca na listagem geral
    const result = await this.searchProducts({ 
      productId, 
      limit: 1, 
      sortBy: 'trending' 
    });
    
    return result.products.find(p => p.marketplaceProductId === productId) || null;
  }

  /**
   * Categorias da Shopee (cacheadas/localizadas)
   */
  async getCategories() {
    // Retorna categorias conhecidas da Shopee BR
    return [
      { id: 100001, name: 'Eletrônicos', parentId: null },
      { id: 100002, name: 'Celulares', parentId: 100001 },
      { id: 100003, name: 'Informática', parentId: 100001 },
      { id: 200001, name: 'Casa e Cozinha', parentId: null },
      { id: 200002, name: 'Cama, Mesa e Banho', parentId: 200001 },
      { id: 200003, name: 'Eletrodomésticos', parentId: 200001 },
      { id: 300001, name: 'Moda', parentId: null },
      { id: 300002, name: 'Roupas Femininas', parentId: 300001 },
      { id: 300003, name: 'Roupas Masculinas', parentId: 300001 },
      { id: 400001, name: 'Beleza e Perfumaria', parentId: null },
      { id: 500001, name: 'Esportes e Lazer', parentId: null },
      { id: 600001, name: 'Brinquedos e Games', parentId: null },
    ];
  }

  /**
   * URL canônica do produto na Shopee
   */
  getProductUrl(productId) {
    return `https://shopee.com.br/product/${productId}`;
  }

  /**
   * Gera link de afiliado - a Shopee já retorna offerLink com tracking
   */
  async getAffiliateUrl(productId, originalUrl = null) {
    const product = await this.getProduct(productId);
    
    if (product?.affiliateUrl) {
      return {
        affiliateUrl: product.affiliateUrl,
        provider: 'official',
        status: 'generated',
      };
    }
    
    // Fallback: usa a URL original + tag do afiliado se configurada
    const url = originalUrl || this.getProductUrl(productId);
    const tag = this.affiliateConfig?.affiliateTag || 'aff_shopp_vip';
    
    return {
      affiliateUrl: `${url}?afid=${tag}`,
      provider: 'manual',
      status: 'generated_with_fallback',
    };
  }

  /**
   * Busca ofertas (mesma coisa que searchProducts com filtro de desconto)
   */
  async getOffers(filters) {
    return this.searchProducts({
      ...filters,
      sortBy: filters.sortBy || 'high_discount',
    });
  }

  /**
   * Valida credenciais do app (não do usuário)
   */
  async validateCredentials() {
    try {
      await this.init();
      // Tenta uma busca simples
      await this.searchProducts({ keyword: 'teste', limit: 1, page: 1 });
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Renova token do usuário (Shopee usa tokens de longa duração)
   */
  async refreshAccessToken() {
    // Shopee Affiliate API usa appId/secret, não OAuth de usuário
    // Se houver token de usuário, a renovação seria via Shopee Open Platform
    return this.credentials;
  }

  /**
   * Desconecta (remove credenciais do usuário)
   */
  async disconnect() {
    this.config = null;
    this.initialized = false;
    return { success: true };
  }

  /**
   * Normaliza produto Shopee para contrato interno
   */
  normalizeProduct(rawProduct) {
    const normalized = normalizeProductOffer(rawProduct);
    
    return new NormalizedProduct({
      id: normalized.id,
      marketplace: 'shopee',
      marketplaceProductId: normalized.id,
      name: normalized.title,
      imageUrl: normalized.imageUrl,
      currentPrice: normalized.currentPrice,
      originalPrice: normalized.originalPrice,
      discountPercentage: normalized.discountPercentage,
      salesCount: normalized.soldCount,
      rating: normalized.rating,
      productUrl: normalized.productUrl,
      affiliateUrl: normalized.affiliateUrl,
      isFlashSale: normalized.isFlashSale,
      commissionRate: normalized.commissionRate,
      commissionAmount: normalized.commissionAmount,
      affiliateProvider: 'official',
      affiliateStatus: normalized.affiliateUrl ? 'generated' : 'pending',
      fetchedAt: new Date().toISOString(),
    });
  }
}