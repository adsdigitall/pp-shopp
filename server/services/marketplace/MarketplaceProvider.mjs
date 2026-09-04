/**
 * Interface base abstrata para todos os Marketplace Providers.
 * 
 * Cada marketplace (Shopee, Mercado Livre, Amazon, etc.) deve implementar esta interface.
 * Isso permite adicionar novas plataformas sem quebrar o sistema existente.
 */

import { 
  NormalizedProduct, 
  SearchResult, 
  MarketplaceCredentials,
  AffiliateConfig,
  ProductSearchFilters 
} from './types.mjs';

export class MarketplaceProvider {
  /**
   * @param {Object} config
   * @param {string} config.marketplace - Tipo do marketplace
   * @param {MarketplaceCredentials} config.credentials - Credenciais do usuário
   * @param {AffiliateConfig} [config.affiliateConfig] - Configuração de afiliado
   */
  constructor(config) {
    if (this.constructor === MarketplaceProvider) {
      throw new Error('MarketplaceProvider é uma classe abstrata e não pode ser instanciada diretamente.');
    }
    
    this.marketplace = config.marketplace;
    this.credentials = config.credentials;
    this.affiliateConfig = config.affiliateConfig;
  }

  /**
   * Busca produtos no marketplace
   * @param {ProductSearchFilters} filters
   * @returns {Promise<SearchResult>}
   */
  async searchProducts(filters) {
    throw new Error('Método searchProducts() deve ser implementado pelo provider concreto.');
  }

  /**
   * Obtém detalhes de um produto específico
   * @param {string} productId - ID do produto no marketplace
   * @returns {Promise<NormalizedProduct|null>}
   */
  async getProduct(productId) {
    throw new Error('Método getProduct() deve ser implementado pelo provider concreto.');
  }

  /**
   * Obtém categorias disponíveis no marketplace
   * @returns {Promise<Array<{id: string|number, name: string, parentId?: string|number}>>}
   */
  async getCategories() {
    throw new Error('Método getCategories() deve ser implementado pelo provider concreto.');
  }

  /**
   * Gera URL canônica do produto (sem tracking de afiliado)
   * @param {string} productId
   * @returns {string}
   */
  getProductUrl(productId) {
    throw new Error('Método getProductUrl() deve ser implementado pelo provider concreto.');
  }

  /**
   * Gera URL de afiliado para um produto
   * @param {string} productId - ID do produto
   * @param {string} [originalUrl] - URL original opcional
   * @returns {Promise<{affiliateUrl: string, provider: string, status: string}>}
   */
  async getAffiliateUrl(productId, originalUrl = null) {
    throw new Error('Método getAffiliateUrl() deve ser implementado pelo provider concreto.');
  }

  /**
   * Busca ofertas especiais/promoções do marketplace
   * @param {ProductSearchFilters} filters
   * @returns {Promise<SearchResult>}
   */
  async getOffers(filters) {
    throw new Error('Método getOffers() deve ser implementado pelo provider concreto.');
  }

  /**
   * Valida se as credenciais ainda são válidas
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validateCredentials() {
    throw new Error('Método validateCredentials() deve ser implementado pelo provider concreto.');
  }

  /**
   * Renova o access token usando refresh token
   * @returns {Promise<MarketplaceCredentials>}
   */
  async refreshAccessToken() {
    throw new Error('Método refreshAccessToken() deve ser implementado pelo provider concreto.');
  }

  /**
   * Desconecta/revoga a integração
   * @returns {Promise<{success: boolean}>}
   */
  async disconnect() {
    throw new Error('Método disconnect() deve ser implementado pelo provider concreto.');
  }

  /**
   * Normaliza produto bruto do marketplace para contrato interno
   * @param {Object} rawProduct
   * @returns {NormalizedProduct}
   */
  normalizeProduct(rawProduct) {
    throw new Error('Método normalizeProduct() deve ser implementado pelo provider concreto.');
  }

  /**
   * Calcula score da oferta (0-10)
   * @param {NormalizedProduct} product
   * @returns {number}
   */
  calculateOfferScore(product) {
    // Implementação padrão - pode ser sobrescrita
    let score = 5; // Base
    
    // Desconto (0-30 pontos)
    if (product.discountPercentage !== null) {
      score += Math.min(product.discountPercentage / 100 * 30, 30);
    }
    
    // Preço atrativo (0-15 pontos) - produtos mais baratos têm vantagem
    if (product.currentPrice !== null) {
      if (product.currentPrice < 50) score += 15;
      else if (product.currentPrice < 100) score += 10;
      else if (product.currentPrice < 200) score += 5;
    }
    
    // Relevância baseada em vendas (0-20 pontos)
    if (product.salesCount !== null) {
      if (product.salesCount > 1000) score += 20;
      else if (product.salesCount > 500) score += 15;
      else if (product.salesCount > 100) score += 10;
      else if (product.salesCount > 10) score += 5;
    }
    
    // Reputação do vendedor (0-15 pontos)
    if (product.sellerReputation !== null) {
      score += product.sellerReputation * 15;
    }
    
    // Frete grátis (0-10 pontos)
    if (product.isFreeShipping) {
      score += 10;
    }
    
    // Histórico de preço (0-10 pontos) - placeholder para futuro
    // if (product.priceHistory?.isLowest) score += 10;
    
    return Math.min(Math.max(Math.round(score * 10) / 10, 0), 10);
  }

  /**
   * Verifica se o produto atende aos filtros mínimos
   * @param {NormalizedProduct} product
   * @param {ProductSearchFilters} filters
   * @returns {boolean}
   */
  matchesFilters(product, filters) {
    if (filters.minPrice !== null && product.currentPrice !== null && product.currentPrice < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== null && product.currentPrice !== null && product.currentPrice > filters.maxPrice) {
      return false;
    }
    if (filters.minDiscount !== null && product.discountPercentage !== null && product.discountPercentage < filters.minDiscount) {
      return false;
    }
    if (filters.sellerId && product.sellerId !== filters.sellerId) {
      return false;
    }
    if (filters.productId && product.marketplaceProductId !== filters.productId) {
      return false;
    }
    return true;
  }
}