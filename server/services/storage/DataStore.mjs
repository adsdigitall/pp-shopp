/**
 * Camada de armazenamento simples baseada em arquivos JSON.
 * Para produção, substituir por banco de dados real (PostgreSQL, MongoDB, etc.)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DATA_DIR = join(process.cwd(), 'data');
const IS_SERVERLESS = Boolean(process.env.VERCEL);
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_FILES = {
  credentials: 'marketplace_credentials.json',
  affiliateConfigs: 'affiliate_configs.json',
  publicationHistory: 'publication_history.json',
  autoSearchConfigs: 'auto_search_configs.json',
  productsCache: 'products_cache.json',
  clickTracking: 'click_tracking.json',
  dispatches: 'dispatches.json',
  dispatchAutomations: 'dispatch_automations.json',
  webhookEvents: 'webhook_events.json',
  mirroringConfigs: 'mirroring_configs.json',
  whatsappSessions: 'whatsapp_sessions.json',
  whatsappGroups: 'whatsapp_groups.json',
  workerStatus: 'worker_status.json',
};

class DataStore {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
  }

  async init() {
    if (this.initialized) return;

    // Vercel functions have a read-only deployment filesystem. Keep a
    // per-invocation memory cache there; durable production state belongs in
    // the configured database/worker deployment, while WAHA owns sessions.
    if (USE_SUPABASE || IS_SERVERLESS) {
      this.initialized = true;
      return;
    }
    
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
    
    if (!USE_SUPABASE && this.cache.has(collection)) {
      return this.cache.get(collection);
    }

    if (USE_SUPABASE) {
      const response = await this.supabaseRequest(`/rest/v1/radar_store?collection=eq.${encodeURIComponent(collection)}&select=data`);
      return response.map(row => row.data);
    }
    
    if (IS_SERVERLESS) return this.cache.get(collection) || [];

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

    if (USE_SUPABASE) {
      await this.supabaseRequest(`/rest/v1/radar_store?collection=eq.${encodeURIComponent(collection)}`, { method: 'DELETE' });
      if (data.length) {
        await this.supabaseRequest('/rest/v1/radar_store', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(data.map(item => this.toRow(collection, item))),
        });
      }
      return data;
    }

    if (IS_SERVERLESS) {
      this.cache.set(collection, data);
      return data;
    }
    
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
    if (USE_SUPABASE) {
      await this.supabaseRequest('/rest/v1/radar_store', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(this.toRow(collection, item)),
      });
      return item;
    }
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
    if (USE_SUPABASE) {
      const existing = await this.findById(collection, id);
      if (!existing) return null;
      const next = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      await this.supabaseRequest(`/rest/v1/radar_store?id=eq.${encodeURIComponent(this.rowId(collection, id))}`, {
        method: 'PATCH',
        body: JSON.stringify({ data: next, user_id: next.userId || next.user_id || null, updated_at: new Date().toISOString() }),
      });
      return next;
    }
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
    if (USE_SUPABASE) {
      const existing = await this.findById(collection, id);
      if (!existing) return false;
      await this.supabaseRequest(`/rest/v1/radar_store?id=eq.${encodeURIComponent(this.rowId(collection, id))}`, { method: 'DELETE' });
      return true;
    }
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

  rowId(collection, id) {
    return `${collection}:${id}`;
  }

  toRow(collection, item) {
    const itemId = item.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return { id: this.rowId(collection, itemId), collection, user_id: item.userId || item.user_id || null, data: { ...item, id: itemId }, updated_at: new Date().toISOString() };
  }

  async supabaseRequest(path, options = {}) {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) throw new Error(`Supabase storage ${response.status}: ${await response.text()}`);
    if (response.status === 204) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
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
  async save(userId, entry) {
    const item = { id: entry.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, userId, ...entry, publishedAt: entry.publishedAt || new Date().toISOString() };
    const existing = await dataStore.findById('publicationHistory', item.id);
    return existing ? dataStore.update('publicationHistory', item.id, item) : dataStore.add('publicationHistory', item);
  },

  async update(userId, id, updates) {
    const item = await dataStore.findById('publicationHistory', id);
    if (!item || item.userId !== userId) return null;
    return dataStore.update('publicationHistory', id, updates);
  },

  async delete(userId, id) {
    const item = await dataStore.findById('publicationHistory', id);
    if (!item || item.userId !== userId) return false;
    return dataStore.remove('publicationHistory', id);
  },

  async clear(userId) {
    const items = await dataStore.find('publicationHistory', { userId });
    await Promise.all(items.map(item => dataStore.remove('publicationHistory', item.id)));
    return true;
  },

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

// WhatsApp Groups Store
export const WhatsAppGroupsStore = {
  async get(userId) {
    const groups = await dataStore.find('whatsappGroups', { userId });
    return groups.map(g => ({
      id: g.groupId || g.id,
      sessionId: g.sessionId,
      name: g.name,
      memberCount: g.memberCount || 0,
      isAdmin: g.isAdmin || false,
      status: g.status || 'active',
      messagesSent30d: g.messagesSent30d || 0,
      messagesReceived30d: g.messagesReceived30d || 0,
      lastActivity: g.lastActivity,
      addedAt: g.addedAt,
    }));
  },

  async save(userId, groups) {
    const old = await dataStore.find('whatsappGroups', { userId });
    for (const item of old) await dataStore.remove('whatsappGroups', item.id);
    for (const group of groups) {
      await dataStore.add('whatsappGroups', {
        id: `group_${group.sessionId || 'default'}_${group.id}`,
        userId,
        groupId: group.id,
        sessionId: group.sessionId || 'default',
        ...group,
        savedAt: new Date().toISOString(),
      });
    }
    return groups;
  },
  async update(userId, id, updates) {
    const groups = await this.get(userId);
    const next = groups.map(group => group.id === id ? { ...group, ...updates, id } : group);
    await this.save(userId, next);
    return next.find(group => group.id === id) || null;
  },
  async remove(userId, id) {
    const groups = await this.get(userId);
    await this.save(userId, groups.filter(group => group.id !== id));
    return groups.length !== (await this.get(userId)).length;
  },
};

export const DispatchStore = {
  async list(userId, limit = 100) {
    const rows = await dataStore.find('dispatches', { userId });
    return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit);
  },
  async get(userId, id) { return dataStore.findOne('dispatches', { userId, id }); },
  async save(job) {
    const existing = await dataStore.findOne('dispatches', { id: job.id });
    return existing ? dataStore.update('dispatches', job.id, job) : dataStore.add('dispatches', job);
  },
};

export const DispatchAutomationStore = {
  async get(userId) { return dataStore.findOne('dispatchAutomations', { userId }); },
  async save(userId, config) {
    const existing = await this.get(userId);
    const value = { id: existing?.id || `dispatch_auto_${Date.now()}`, userId, ...existing, ...config, updatedAt: new Date().toISOString(), createdAt: existing?.createdAt || new Date().toISOString() };
    return existing ? dataStore.update('dispatchAutomations', existing.id, value) : dataStore.add('dispatchAutomations', value);
  },
};

export const WebhookEventStore = {
  async add(event) { return dataStore.add('webhookEvents', { id: event.id || `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...event, receivedAt: event.receivedAt || new Date().toISOString() }); },
  async has(id) { return Boolean(id && await dataStore.findOne('webhookEvents', { id })); },
};

export const MirroringConfigStore = {
  async list(userId) { return dataStore.find('mirroringConfigs', { userId }); },
  async get(userId, id) { return dataStore.findOne('mirroringConfigs', { userId, id }); },
  async save(config) {
    const existing = await dataStore.findOne('mirroringConfigs', { id: config.id });
    return existing ? dataStore.update('mirroringConfigs', config.id, config) : dataStore.add('mirroringConfigs', config);
  },
  async remove(id) { return dataStore.remove('mirroringConfigs', id); },
};

export const WhatsAppSessionStore = {
  async list(userId) { return dataStore.find('whatsappSessions', { userId }); },
  async get(userId, id) { return dataStore.findOne('whatsappSessions', { userId, id }); },
  async getByWahaId(userId, wahaSessionId) { return dataStore.findOne('whatsappSessions', { userId, wahaSessionId }); },
  async save(session) {
    const existing = await dataStore.findOne('whatsappSessions', { id: session.id });
    return existing ? dataStore.update('whatsappSessions', session.id, session) : dataStore.add('whatsappSessions', session);
  },
  async update(id, updates) { return dataStore.update('whatsappSessions', id, updates); },
  async remove(id) { return dataStore.remove('whatsappSessions', id); },
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
