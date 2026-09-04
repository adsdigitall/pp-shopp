/**
 * Affiliate Link Provider - Abstração para geração de links de afiliado.
 * 
 * Como o Mercado Livre NÃO tem API oficial pública de afiliados,
 * este módulo permite conectar provedores terceiros autorizados
 * (Bot do Afiliado, AfiliTools, Afilimax) ou fallback manual.
 * 
 * O resto do sistema continua funcionando normalmente - apenas
 * a geração do link é delegada para este módulo.
 */

export const AffiliateProviderType = {
  OFFICIAL: 'official',           // API oficial do marketplace (ex: Shopee)
  BOT_DO_AFILIADO: 'bot_do_afiliado',
  AFILITOOLS: 'afilitools',
  AFILIMAX: 'afilimax',
  MANUAL: 'manual',               // Entrada manual pelo usuário
};

export const AffiliateLinkStatus = {
  PENDING: 'pending',
  GENERATED: 'generated',
  FAILED: 'failed',
  EXPIRED: 'expired',
  MANUAL_REQUIRED: 'manual_required',
};

/**
 * Interface base para provedores de link de afiliado
 */
export class AffiliateLinkProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Gera link de afiliado para uma URL de produto
   * @param {Object} params
   * @param {string} params.originalUrl - URL original do produto
   * @param {string} params.marketplace - Tipo do marketplace
   * @param {string} params.affiliateTag - Tag/ID do afiliado
   * @param {Object} [params.providerConfig] - Config específica do provedor
   * @returns {Promise<{affiliateUrl: string, status: string, provider: string, metadata?: Object}>}
   */
  async generateAffiliateLink(params) {
    throw new Error('Método generateAffiliateLink() deve ser implementado pelo provedor concreto.');
  }

  /**
   * Verifica se o provedor está configurado e funcional
   * @returns {Promise<{available: boolean, error?: string}>}
   */
  async checkAvailability() {
    return { available: false, error: 'Não implementado' };
  }

  /**
   * Obtém informações do provedor
   * @returns {Object}
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.constructor.name,
      requiresConfig: true,
    };
  }
}

/**
 * Provedor Manual - Usuário cola o link gerado no painel do ML
 */
export class ManualAffiliateProvider extends AffiliateLinkProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'manual';
  }

  async generateAffiliateLink({ originalUrl, affiliateTag }) {
    // Retorna a URL original - usuário deve substituir manualmente
    return {
      affiliateUrl: originalUrl,
      originalUrl,
      status: AffiliateLinkStatus.MANUAL_REQUIRED,
      provider: AffiliateProviderType.MANUAL,
      metadata: {
        message: 'Cole o link de afiliado gerado no painel do Mercado Livre',
        affiliateTag,
      },
    };
  }

  async checkAvailability() {
    return { available: true };
  }
}

/**
 * Provedor Bot do Afiliado (botdoafiliado.com)
 * Requer API Key e configuração prévia no painel deles
 */
export class BotDoAfiliadoProvider extends AffiliateLinkProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'bot_do_afiliado';
    this.apiBase = config.apiBase || 'https://botdoafiliado.com/api/v1';
    this.apiKey = config.apiKey || process.env.BOT_DO_AFILIADO_API_KEY || '';
  }

  async generateAffiliateLink({ originalUrl, marketplace, affiliateTag, providerConfig }) {
    if (!this.apiKey && !providerConfig?.apiKey) {
      throw new Error('API Key do Bot do Afiliado não configurada');
    }

    const apiKey = providerConfig?.apiKey || this.apiKey;
    
    const response = await fetch(`${this.apiBase}/convert-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ url: originalUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Bot do Afiliado erro: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      affiliateUrl: data.affiliate_url || data.url_afiliado || originalUrl,
      originalUrl: data.url_original || originalUrl,
      resolvedUrl: data.url_resolvida,
      status: data.success ? AffiliateLinkStatus.GENERATED : AffiliateLinkStatus.FAILED,
      provider: AffiliateProviderType.BOT_DO_AFILIADO,
      metadata: data,
    };
  }

  async checkAvailability() {
    if (!this.apiKey) {
      return { available: false, error: 'API Key não configurada' };
    }
    try {
      const response = await fetch(`${this.apiBase}/health`, {
        headers: { 'X-API-Key': this.apiKey },
      });
      return { available: response.ok };
    } catch {
      return { available: false, error: 'Não foi possível conectar ao Bot do Afiliado' };
    }
  }
}

/**
 * Provedor AfiliTools (afilitools.com.br)
 * Usa extensão do Chrome + servidor
 */
export class AfiliToolsProvider extends AffiliateLinkProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'afilitools';
    this.apiBase = config.apiBase || 'https://api.afilitools.com.br';
    this.apiKey = config.apiKey || process.env.AFILITOOLS_API_KEY || '';
  }

  async generateAffiliateLink({ originalUrl, marketplace, affiliateTag, providerConfig }) {
    if (!this.apiKey && !providerConfig?.apiKey) {
      throw new Error('API Key do AfiliTools não configurada');
    }

    const apiKey = providerConfig?.apiKey || this.apiKey;
    
    const response = await fetch(`${this.apiBase}/v1/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ 
        url: originalUrl,
        marketplace: marketplace,
        tag: affiliateTag,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`AfiliTools erro: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    
    return {
      affiliateUrl: data.short_url || data.affiliate_url || originalUrl,
      originalUrl,
      status: data.success ? AffiliateLinkStatus.GENERATED : AffiliateLinkStatus.FAILED,
      provider: AffiliateProviderType.AFILITOOLS,
      metadata: data,
    };
  }

  async checkAvailability() {
    if (!this.apiKey) {
      return { available: false, error: 'API Key não configurada' };
    }
    try {
      const response = await fetch(`${this.apiBase}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return { available: response.ok };
    } catch {
      return { available: false, error: 'Não foi possível conectar ao AfiliTools' };
    }
  }
}

/**
 * Provedor Afilimax (@afilimax/mercado-livre-provider)
 * Pacote NPM que usa cookies de sessão
 */
export class AfilimaxProvider extends AffiliateLinkProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'afilimax';
    this.provider = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Dynamic import do pacote NPM
      const { MercadoLivreProvider } = await import('@afilimax/mercado-livre-provider');
      this.provider = new MercadoLivreProvider({
        tag: this.config.affiliateTag || '',
        cookies: this.config.cookies || [],
      });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Falha ao carregar @afilimax/mercado-livre-provider: ${error.message}. Instale com: npm install @afilimax/mercado-livre-provider @afilimax/core`);
    }
  }

  async generateAffiliateLink({ originalUrl, marketplace, affiliateTag, providerConfig }) {
    await this.init();
    
    if (!this.provider) {
      throw new Error('Afilimax provider não inicializado');
    }

    // Atualiza tag se fornecida
    if (affiliateTag || providerConfig?.tag) {
      this.provider.tag = providerConfig?.tag || affiliateTag;
    }

    try {
      const affiliateUrl = await this.provider.createAffiliateUrl(originalUrl);
      
      return {
        affiliateUrl,
        originalUrl,
        status: AffiliateLinkStatus.GENERATED,
        provider: AffiliateProviderType.AFILIMAX,
        metadata: { method: 'cookie_based' },
      };
    } catch (error) {
      return {
        affiliateUrl: originalUrl,
        originalUrl,
        status: AffiliateLinkStatus.FAILED,
        provider: AffiliateProviderType.AFILIMAX,
        metadata: { error: error.message },
      };
    }
  }

  async checkAvailability() {
    try {
      await this.init();
      return { available: !!this.provider };
    } catch {
      return { available: false, error: 'Pacote @afilimax não instalado ou configurado' };
    }
  }
}

/**
 * Factory para criar provedores de afiliado
 */
export class AffiliateLinkProviderFactory {
  static providers = new Map([
    [AffiliateProviderType.MANUAL, ManualAffiliateProvider],
    [AffiliateProviderType.BOT_DO_AFILIADO, BotDoAfiliadoProvider],
    [AffiliateProviderType.AFILITOOLS, AfiliToolsProvider],
    [AffiliateProviderType.AFILIMAX, AfilimaxProvider],
  ]);

  static register(type, providerClass) {
    this.providers.set(type, providerClass);
  }

  static create(type, config = {}) {
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      throw new Error(`Provedor de afiliado desconhecido: ${type}. Disponíveis: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return new ProviderClass(config);
  }

  static getAvailableTypes() {
    return Array.from(this.providers.keys());
  }

  /**
   * Cria provedor baseado na configuração do usuário
   * @param {Object} affiliateConfig - Configuração salva do usuário
   * @returns {AffiliateLinkProvider}
   */
  static createFromConfig(affiliateConfig) {
    const providerType = affiliateConfig?.affiliateProvider || AffiliateProviderType.MANUAL;
    const providerConfig = affiliateConfig?.providerConfig || {};
    
    return this.create(providerType, {
      ...providerConfig,
      affiliateTag: affiliateConfig?.affiliateTag,
    });
  }
}