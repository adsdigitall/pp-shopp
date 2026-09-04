/**
 * Camada de armazenamento simples baseada em arquivos JSON.
 * Para produção, substituir por banco de dados real (PostgreSQL, MongoDB, etc.)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DATA_DIR = join(process.cwd(), 'data');
const STORAGE_FILES = {
  credentials: 'marketplace_credentials.json',
  affiliateConfigs: 'affiliate_configs.json',
  publicationHistory: 'publication_history.json',
  autoSearchConfigs: 'auto_search_configs.json',
  productsCache: 'products_cache.json',
  clickTracking: 'click_tracking.json',
};

class DataStore {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await mkdir(DATA_DIR, { recursive: true });
      
      // Inicializa arquivos se não existirem
      for (const [key, filename] of Object.entries(STORAGE_FILES)) {
        const filepath = join(DATA_DIR, filename);
        try {
          await readFile(filepath, 'utf-8');
        } catch {
          await writeFile(filepath, JSON.stringify([], null, 2), 'utf-8');
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('[DataStore] Erro ao inicializar:', error);
      throw error;
    }
  }

  /**
   * Carrega dados de um arquivo
   */
  async load(collection) {
    if (!this.initialized) await this.init();
    
    if (this.cache.has(collection)) {
      return this.cache.get(collection);
    }
    
    const filename = STORAGE_FILES[collection];
    if (!filename) {
      throw new Error(`Coleção desconhecida: ${collection}`);
    }
    
    const filepath = join(DATA_DIR, filename);
    try {
      const data = await readFile(filepath, 'utf-8');
      const parsed = JSON.parse(data);
      this.cache.set(collection, parsed);
      return parsed;
    } catch (error) {
      console.error(`[DataStore] Erro ao carregar ${collection}:`, error);
      return [];
    }
  }

  /**
   * Salva dados em um arquivo
   */
  async save(collection, data) {
    if (!this.initialized) await this.init();
    
    const filename = STORAGE_FILES[collection];
    if (!filename) {
      throw new Error(`Coleção desconhecida: ${collection}`);
    }
    
    const filepath = join(DATA_DIR, filename);
    try {
      await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
      this.cache.set(collection, data);
    } catch (error) {
      console.error(`[DataStore] Erro ao salvar ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Adiciona item a uma coleção
   */
  async add(collection, item) {
    const data = await this.load(collection);
    data.push(item);
    await this.save(collection, data);
    return item;
  }

  /**
   * Busca item por ID
   */
  async findById(collection, id) {
    const data = await this.load(collection);
    return data.find(item => item.id === id) || null;
  }

  /**
   * Busca itens por campo
   */
  async find(collection, query) {
    const data = await this.load(collection);
    return data.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }

  /**
   * Busca um item por query
   */
  async findOne(collection, query) {
    const results = await this.find(collection, query);
    return results[0] || null;
  }

  /**
   * Atualiza item
   */
  async update(collection, id, updates) {
    const data = await this.load(collection);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
    await this.save(collection, data);
    return data[index];
  }

  /**
   * Remove item
   */
  async remove(collection, id) {
    const data = await this.load(collection);
    const filtered = data.filter(item => item.id !== id);
    await this.save(collection, filtered);
    return filtered.length !== data.length;
  }

  /**
   * Limpa cache (força reload na próxima leitura)
   */
  invalidateCache(collection = null) {
    if (collection) {
      this.cache.delete(collection);
    } else {
      this.cache.clear();
    }
  }
}

// Singleton
export const dataStore = new DataStore();

/**
 * Helpers específicos para cada tipo de dado
 */

// Credenciais de Marketplace
export const CredentialsStore = {
  async getByUserAndMarketplace(userId, marketplace) {
    return dataStore.findOne('credentials', { userId, marketplace, isActive: true });
  },

  async save(userId, marketplace, credentials) {
    const existing = await this.getByUserAndMarketplace(userId, marketplace);
    const data = {
      id: existing?.id || `cred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      marketplace,
      ...credentials,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    
    if (existing) {
      return dataStore.update('credentials', existing.id, data);
    }
    return dataStore.add('credentials', data);
  },

  async deactivate(userId, marketplace) {
    const existing = await this.getByUserAndMarketplace(userId, marketplace);
    if (existing) {
      return dataStore.update('credentials', existing.id, { isActive: false });
    }
    return null;
  },

  async getAllByUser(userId) {
    return dataStore.find('credentials', { userId, isActive: true });
  },
};

// Configurações de Afiliado
export const AffiliateConfigStore = {
  async getByUserAndMarketplace(userId, marketplace) {
    return dataStore.findOne('affiliateConfigs', { userId, marketplace });
  },

  async save(userId, marketplace, config) {
    const existing = await this.getByUserAndMarketplace(userId, marketplace);
    const data = {
      id: existing?.id || `aff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      marketplace,
      ...config,
      updatedAt: new Date().toISOString(),
    };
    
    if (existing) {
      return dataStore.update('affiliateConfigs', existing.id, data);
    }
    return dataStore.add('affiliateConfigs', data);
  },

  async getAllByUser(userId) {
    return dataStore.find('affiliateConfigs', { userId });
  },
};

// Histórico de Publicações
export const PublicationHistoryStore = {
  async add(entry) {
    return dataStore.add('publicationHistory', {
      id: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...entry,
      publishedAt: entry.publishedAt || new Date().toISOString(),
    });
  },

  async findByProductAndChannel(productId, marketplace, channelId, hoursBack = 24) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const history = await dataStore.find('publicationHistory', {
      marketplaceProductId: productId,
      marketplace,
    });
    
    return history.filter(h => 
      h.channelId === channelId && 
      h.publishedAt >= since
    );
  },

  async wasRecentlyPublished(productId, marketplace, channelId, cooldownHours = 24) {
    const recent = await this.findByProductAndChannel(productId, marketplace, channelId, cooldownHours);
    return recent.length > 0;
  },

  async getByUser(userId, limit = 100) {
    const history = await dataStore.find('publicationHistory', { userId });
    return history
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, limit);
  },

  async getStats(userId) {
    const history = await dataStore.find('publicationHistory', { userId });
    const total = history.length;
    const byMarketplace = {};
    const byChannel = {};
    
    for (const entry of history) {
      byMarketplace[entry.marketplace] = (byMarketplace[entry.marketplace] || 0) + 1;
      byChannel[entry.channelId] = (byChannel[entry.channelId] || 0) + 1;
    }
    
    return { total, byMarketplace, byChannel };
  },
};

// Configurações de Busca Automática
export const AutoSearchConfigStore = {
  async getByUser(userId) {
    return dataStore.find('autoSearchConfigs', { userId });
  },

  async getActiveByUser(userId) {
    return dataStore.find('autoSearchConfigs', { userId, isActive: true });
  },

  async save(userId, config) {
    const data = {
      id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return dataStore.add('autoSearchConfigs', data);
  },

  async update(id, updates) {
    return dataStore.update('autoSearchConfigs', id, updates);
  },

  async delete(id) {
    return dataStore.remove('autoSearchConfigs', id);
  },
};

// Cache de Produtos (para evitar re-busca)
export const ProductsCacheStore = {
  async get(marketplace, key, maxAgeMs = 30 * 60 * 1000) {
    const cached = await dataStore.findOne('productsCache', { marketplace, cacheKey: key });
    if (cached && Date.now() - new Date(cached.cachedAt).getTime() < maxAgeMs) {
      return cached.data;
    }
    return null;
  },

  async set(marketplace, key, data) {
    const existing = await dataStore.findOne('productsCache', { marketplace, cacheKey: key });
    const entry = {
      marketplace,
      cacheKey: key,
      data,
      cachedAt: new Date().toISOString(),
    };
    
    if (existing) {
      return dataStore.update('productsCache', existing.id, entry);
    }
    return dataStore.add('productsCache', entry);
  },

  async clear(marketplace = null) {
    if (marketplace) {
      const all = await dataStore.load('productsCache');
      const filtered = all.filter(item => item.marketplace !== marketplace);
      return dataStore.save('productsCache', filtered);
    }
    return dataStore.save('productsCache', []);
  },
};

// Click Tracking Store
export const ClickTrackingStore = {
  async add(data) {
    return dataStore.add('clickTracking', {
      id: `click_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...data,
      clickedAt: new Date().toISOString(),
      clicks: 0,
    });
  },

  async getById(id) {
    return dataStore.findOne('clickTracking', { id });
  },

  async getByUserAndMarketplace(userId, marketplace, sinceSeconds = 0) {
    const since = sinceSeconds > 0 ? new Date(sinceSeconds * 1000).toISOString() : '1970-01-01T00:00:00.000Z';
    const clicks = await dataStore.find('clickTracking', { userId, marketplace });
    return clicks.filter(c => c.clickedAt >= since);
  },

  async incrementClicks(id) {
    const click = await dataStore.findOne('clickTracking', { id });
    if (click) {
      return dataStore.update('clickTracking', id, { clicks: (click.clicks || 0) + 1 });
    }
    return null;
  },
};