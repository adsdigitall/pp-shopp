/**
 * Mercado Livre Provider - Implementação completa com OAuth 2.0
 * 
 * Usa a API pública do Mercado Livre para busca de produtos
 * e OAuth para conectar conta do usuário.
 * 
 * NOTA: Programa de Afiliados do ML NÃO tem API pública oficial para gerar links.
 * A geração de links afiliados é delegada para AffiliateLinkProvider (módulo separado).
 */

import { MarketplaceProvider } from './MarketplaceProvider.mjs';
import { NormalizedProduct, SearchResult, AffiliateProviderType } from './types.mjs';

const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_AUTH_URL = 'https://auth.mercadolivre.com.br/authorization';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const ML_SITE_ID = 'MLB'; // Brasil

// Escopos necessários para busca de produtos e dados do usuário
const ML_SCOPES = [
  'read',
  'write',
  'offline_access',
].join(' ');

/**
 * Cliente HTTP para API do Mercado Livre
 */
class MLApiClient {
  constructor(accessToken = null) {
    this.accessToken = accessToken;
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  async request(endpoint, options = {}) {
    const url = `${ML_API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new MLApiError(
          `ML API Error: ${response.status} ${response.statusText}`,
          { status: response.status, body: errorText }
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new MLApiError('Timeout ao conectar com Mercado Livre', { code: 'TIMEOUT' });
      }
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }
}

export class MLApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MLApiError';
    this.details = details;
  }
}

export class MercadoLivreProvider extends MarketplaceProvider {
  constructor(config) {
    super({ ...config, marketplace: 'mercado_livre' });
    this.client = new MLApiClient(this.credentials?.accessToken || null);
    this.appConfig = null;
  }

  /**
   * Inicializa configuração do app (client_id, client_secret do .env)
   */
  async init() {
    if (this.appConfig) return;

    const { loadMercadoLivreConfig } = await import('./mercadoLivreConfig.mjs');
    this.appConfig = loadMercadoLivreConfig();
  }

  /**
   * Gera URL de autorização OAuth
   * @param {string} redirectUri - URI de callback
   * @param {string} state - State para CSRF protection
   * @returns {string} URL de autorização
   */
  getAuthUrl(redirectUri, state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.appConfig.clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: ML_SCOPES,
    });

    return `${ML_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Troca código de autorização por tokens
   * @param {string} code - Código de autorização
   * @param {string} redirectUri - URI de callback usado
   * @returns {Promise<Object>} Tokens e dados do usuário
   */
  async exchangeCodeForTokens(code, redirectUri) {
    await this.init();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.appConfig.clientId,
      client_secret: this.appConfig.clientSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(ML_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new MLApiError(
        `Falha ao trocar código por tokens: ${error.error_description || error.message || response.statusText}`,
        { status: response.status, error }
      );
    }

    const tokens = await response.json();

    // Busca dados do usuário
    const userClient = new MLApiClient(tokens.access_token);
    const user = await userClient.get('/users/me');

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      userId: String(user.id),
      nickname: user.nickname,
      email: user.email,
    };
  }

  /**
   * Renova access token usando refresh token
   */
  async refreshAccessToken() {
    await this.init();

    if (!this.credentials?.refreshToken) {
      throw new MLApiError('Refresh token não disponível');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.appConfig.clientId,
      client_secret: this.appConfig.clientSecret,
      refresh_token: this.credentials.refreshToken,
    });

    const response = await fetch(ML_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new MLApiError(
        `Falha ao renovar token: ${error.error_description || error.message || response.statusText}`,
        { status: response.status, error }
      );
    }

    const tokens = await response.json();

    return {
      ...this.credentials,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || this.credentials.refreshToken,
      expiresIn: tokens.expires_in,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Garante que o token está válido, renovando se necessário
   */
  async ensureValidToken() {
    if (!this.credentials?.accessToken) {
      throw new MLApiError('Usuário não conectado ao Mercado Livre');
    }

    // Verifica se token expira nos próximos 5 minutos
    const expiresAt = this.credentials.expiresAt || 0;
    const fiveMinutes = 5 * 60 * 1000;

    if (Date.now() + fiveMinutes >= expiresAt) {
      const newCredentials = await this.refreshAccessToken();
      this.credentials = newCredentials;
      this.client.setAccessToken(newCredentials.accessToken);
      
      // Importante: o caller deve salvar as novas credenciais no banco
      return newCredentials;
    }

    this.client.setAccessToken(this.credentials.accessToken);
    return this.credentials;
  }

  /**
   * Busca produtos na API pública do Mercado Livre
   */
  async searchProducts(filters) {
    await this.ensureValidToken();

    const params = new URLSearchParams();
    
    // Site ID (Brasil)
    params.set('site_id', ML_SITE_ID);
    
    // Query de busca
    if (filters.keyword) {
      params.set('q', filters.keyword);
    }
    
    // Categoria
    if (filters.categoryId) {
      params.set('category', filters.categoryId);
    }
    
    // Filtros de preço
    if (filters.minPrice !== null) {
      params.set('price', `${filters.minPrice}-${filters.maxPrice || '*'}`);
    }
    
    // Ordenação
    const sortMap = {
      relevance: 'relevance',
      price_asc: 'price_asc',
      price_desc: 'price_desc',
      discount: 'discount', // Maior desconto
    };
    params.set('sort', sortMap[filters.sortBy] || 'relevance');
    
    // Paginação
    const offset = ((filters.page || 1) - 1) * (filters.limit || 20);
    params.set('offset', offset.toString());
    params.set('limit', (filters.limit || 20).toString());

    // Filtros adicionais
    if (filters.sellerId) {
      params.set('seller_id', filters.sellerId);
    }
    
    // Filtro de condição (novo)
    params.set('condition', 'new');
    
    // Campos desejados
    params.set('attributes', 'id,title,price,original_price,sold_quantity,permalink,thumbnail,pictures,condition,shipping,address,seller_id,seller_reputation,category_id,official_store_id,attributes');

    const data = await this.client.get(`/sites/${ML_SITE_ID}/search?${params.toString()}`);
    
    const products = (data.results || []).map(item => this.normalizeProduct(item));
    
    // Aplica filtros client-side que a API não suporta
    let filteredProducts = products.filter(p => this.matchesFilters(p, filters));
    
    // Filtro de desconto mínimo (calculado)
    if (filters.minDiscount !== null) {
      filteredProducts = filteredProducts.filter(p => 
        p.discountPercentage !== null && p.discountPercentage >= filters.minDiscount
      );
    }

    return new SearchResult({
      products: filteredProducts,
      page: filters.page || 1,
      limit: filters.limit || 20,
      hasNextPage: (data.paging?.total || 0) > offset + filteredProducts.length,
      totalCount: data.paging?.total || null,
      meta: {
        source: 'mercadolivre-public-api',
        site_id: ML_SITE_ID,
        query: filters.keyword,
      },
    });
  }

  /**
   * Obtém produto por ID (MLB)
   */
  async getProduct(productId) {
    await this.ensureValidToken();
    
    // Remove prefixo MLB se houver
    const cleanId = productId.replace(/^MLB-?/i, '');
    const data = await this.client.get(`/items/MLB${cleanId}`);
    
    return this.normalizeProduct(data);
  }

  /**
   * Obtém categorias do Mercado Livre Brasil
   */
  async getCategories() {
    await this.ensureValidToken();
    
    const data = await this.client.get(`/sites/${ML_SITE_ID}/categories`);
    
    return data.map(cat => ({
      id: cat.id,
      name: cat.name,
      parentId: null, // API não retorna hierarquia direta aqui
    }));
  }

  /**
   * URL canônica do produto no Mercado Livre
   */
  getProductUrl(productId) {
    const cleanId = productId.replace(/^MLB-?/i, '');
    return `https://produto.mercadolivre.com.br/MLB-${cleanId}`;
  }

  /**
   * Gera link de afiliado - DELEGADO para AffiliateLinkProvider
   * 
   * IMPORTANTE: ML não tem API oficial pública de afiliados.
   * Esta implementação retorna a URL original e delega a geração
   * para o módulo AffiliateLinkProvider que pode usar provedores
   * terceiros autorizados ou entrada manual.
   */
  async getAffiliateUrl(productId, originalUrl = null) {
    const product = await this.getProduct(productId);
    const url = originalUrl || product?.productUrl || this.getProductUrl(productId);
    
    // Retorna URL original - geração real é feita pelo AffiliateLinkProvider
    return {
      affiliateUrl: url, // Será substituído pelo AffiliateLinkProvider
      originalUrl: url,
      provider: AffiliateProviderType.MANUAL,
      status: 'pending_affiliate_generation',
      needsAffiliateGeneration: true,
    };
  }

  /**
   * Busca ofertas (produtos com desconto)
   */
  async getOffers(filters) {
    return this.searchProducts({
      ...filters,
      sortBy: filters.sortBy || 'discount',
    });
  }

  /**
   * Valida credenciais do usuário
   */
  async validateCredentials() {
    try {
      await this.ensureValidToken();
      await this.client.get('/users/me');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Desconecta/revoga tokens
   */
  async disconnect() {
    // Revoga tokens no ML (opcional, mas recomendado)
    if (this.credentials?.accessToken) {
      try {
        await this.client.post('/oauth/revoke', {
          token: this.credentials.accessToken,
        });
      } catch {
        // Ignora erro de revogação
      }
    }
    
    this.credentials = null;
    this.client.setAccessToken(null);
    return { success: true };
  }

  /**
   * Normaliza produto do Mercado Livre para contrato interno
   */
  normalizeProduct(item) {
    if (!item || !item.id) {
      throw new Error('Produto inválido do Mercado Livre');
    }

    // Preços
    const currentPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || null;
    const originalPrice = typeof item.original_price === 'number' ? item.original_price : 
                         (item.original_price ? parseFloat(item.original_price) : null);
    
    // Calcula desconto se tiver preço original
    let discountPercentage = null;
    if (currentPrice !== null && originalPrice !== null && originalPrice > currentPrice) {
      discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    // Imagem principal
    let imageUrl = '';
    if (item.thumbnail) {
      imageUrl = item.thumbnail.replace('http://', 'https://');
    } else if (item.pictures && item.pictures.length > 0) {
      imageUrl = item.pictures[0].secure_url || item.pictures[0].url || '';
      imageUrl = imageUrl.replace('http://', 'https://');
    }

    // Frete
    let isFreeShipping = false;
    let shippingCost = null;
    if (item.shipping) {
      isFreeShipping = item.shipping.free_shipping === true;
      shippingCost = item.shipping.free_shipping ? 0 : (item.shipping.cost || null);
    }

    // Reputação do vendedor
    let sellerReputation = null;
    if (item.seller_reputation) {
      // ML usa level_id e power_seller_status
      const level = item.seller_reputation.level_id || '';
      if (level.includes('5')) sellerReputation = 1.0;
      else if (level.includes('4')) sellerReputation = 0.8;
      else if (level.includes('3')) sellerReputation = 0.6;
      else if (level.includes('2')) sellerReputation = 0.4;
      else if (level.includes('1')) sellerReputation = 0.2;
      else sellerReputation = 0.1;
    }

    // Categoria
    let category = '';
    if (item.category_id) {
      category = item.category_id;
    }

    return new NormalizedProduct({
      id: item.id,
      marketplace: 'mercado_livre',
      marketplaceProductId: item.id,
      name: item.title || '',
      imageUrl,
      currentPrice,
      originalPrice,
      discountPercentage,
      salesCount: item.sold_quantity || null,
      rating: null, // API pública não retorna rating médio direto
      reviewsCount: null,
      category,
      categoryId: item.category_id || null,
      productUrl: item.permalink || this.getProductUrl(item.id),
      affiliateUrl: '', // Será preenchido pelo AffiliateLinkProvider
      sellerId: item.seller_id ? String(item.seller_id) : '',
      sellerName: item.seller_nickname || '',
      sellerReputation,
      isFreeShipping,
      shippingCost,
      stock: item.available_quantity || null,
      isFlashSale: false, // ML não expõe flash sale direto na API pública
      affiliateProvider: AffiliateProviderType.MANUAL,
      affiliateStatus: 'pending',
      fetchedAt: new Date().toISOString(),
    });
  }
}

export { MLApiClient };