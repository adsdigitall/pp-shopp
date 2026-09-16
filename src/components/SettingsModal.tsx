import React, { useState, useEffect } from 'react';
import { AffiliateSettings } from '../types/product';
import { X, Save, Key, Sliders, ShoppingBag, Link2, CheckCircle, AlertCircle, Loader2, Settings, Zap } from 'lucide-react';

type MarketplaceType = 'shopee' | 'mercado_livre';

interface MarketplaceConnection {
  marketplace: MarketplaceType;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'token_expired' | 'connecting';
  account?: { id: string; nickname: string };
  affiliateConfigured: boolean;
  affiliateProvider: string;
}

interface AffiliateProviderOption {
  value: string;
  label: string;
  description: string;
  requiresConfig: boolean;
}

const AFFILIATE_PROVIDERS: Record<string, AffiliateProviderOption[]> = {
  shopee: [
    { value: 'official', label: 'Shopee Affiliate API (Oficial)', description: 'Links gerados automaticamente pela API oficial da Shopee', requiresConfig: false },
    { value: 'manual', label: 'Manual', description: 'Você cola o link gerado no painel da Shopee', requiresConfig: false },
  ],
  mercado_livre: [
    { value: 'manual', label: 'Manual', description: 'Você cola o link gerado no painel do Mercado Livre', requiresConfig: false },
    { value: 'bot_do_afiliado', label: 'Bot do Afiliado', description: 'API terceirizada (botdoafiliado.com) - requer API Key', requiresConfig: true },
    { value: 'afilitools', label: 'AfiliTools', description: 'Extensão + servidor (afilitools.com.br) - requer API Key', requiresConfig: true },
    { value: 'afilimax', label: 'Afilimax', description: 'Pacote NPM com cookies de sessão - requer configuração', requiresConfig: true },
  ],
};

const MARKETPLACE_INFO = {
  shopee: {
    name: 'Shopee',
    icon: ShoppingBag,
    color: '#EE4D2D',
    bgColor: 'bg-[var(--surface-brand-soft)]',
    textColor: 'text-[var(--primary)]',
    borderColor: 'border-[var(--border-brand)]',
  },
  mercado_livre: {
    name: 'Mercado Livre',
    icon: ShoppingBag,
    color: '#FFE600',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
  },
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AffiliateSettings;
  onSaveSettings: (newSettings: AffiliateSettings) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onShowToast,
}) => {
  const [form, setForm] = useState<AffiliateSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'marketplaces'>('general');
  const [marketplaceStatus, setMarketplaceStatus] = useState<Record<MarketplaceType, MarketplaceConnection>>({
    shopee: { marketplace: 'shopee', connected: false, status: 'disconnected', affiliateConfigured: false, affiliateProvider: 'official' },
    mercado_livre: { marketplace: 'mercado_livre', connected: false, status: 'disconnected', affiliateConfigured: false, affiliateProvider: 'manual' },
  });
  const [loadingStatus, setLoadingStatus] = useState<Record<MarketplaceType, boolean>>({ shopee: false, mercado_livre: false });
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [affiliateConfig, setAffiliateConfig] = useState<Record<MarketplaceType, any>>({
    shopee: { affiliateTag: '', affiliateProvider: 'official', providerConfig: {}, isEnabled: true },
    mercado_livre: { affiliateTag: '', affiliateProvider: 'manual', providerConfig: {}, isEnabled: true },
  });
  const [savingAffiliate, setSavingAffiliate] = useState<MarketplaceType | null>(null);
  const [showProviderConfig, setShowProviderConfig] = useState<MarketplaceType | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMarketplaceStatus();
      fetchAffiliateConfigs();
    }
  }, [isOpen]);

  const fetchMarketplaceStatus = async () => {
    try {
      // Shopee status (check if credentials configured)
      const shopeeRes = await fetch('/api/health');
      const shopeeData = await shopeeRes.json();
      
      setMarketplaceStatus(prev => ({
        ...prev,
        shopee: {
          ...prev.shopee,
          connected: shopeeData.shopeeConfigured,
          status: shopeeData.shopeeConfigured ? 'connected' : 'disconnected',
        }
      }));
    } catch {
      setMarketplaceStatus(prev => ({
        ...prev,
        shopee: { ...prev.shopee, status: 'disconnected' }
      }));
    }

    try {
      // Mercado Livre status
      const mlRes = await fetch('/api/mercadolivre/status');
      const mlData = await mlRes.json();
      
      setMarketplaceStatus(prev => ({
        ...prev,
        mercado_livre: {
          marketplace: 'mercado_livre',
          connected: mlData.connected,
          status: mlData.status,
          account: mlData.account,
          affiliateConfigured: mlData.affiliateConfigured,
          affiliateProvider: mlData.affiliateProvider,
        }
      }));
    } catch {
      setMarketplaceStatus(prev => ({
        ...prev,
        mercado_livre: { ...prev.mercado_livre, status: 'disconnected' }
      }));
    }
  };

  const fetchAffiliateConfigs = async () => {
    try {
      const mlRes = await fetch('/api/mercadolivre/affiliate-config');
      const mlData = await mlRes.json();
      if (mlData.config) {
        setAffiliateConfig(prev => ({
          ...prev,
          mercado_livre: mlData.config
        }));
      }
    } catch {
      // Ignore
    }
  };

  const handleConnectMercadoLivre = async () => {
    setLoadingStatus(prev => ({ ...prev, mercado_livre: true }));
    try {
      const res = await fetch('/api/mercadolivre/auth-url');
      const data = await res.json();
      
      if (data.authUrl) {
        setOauthState(data.state);
        // Abre em nova janela para OAuth
        const oauthWindow = window.open(data.authUrl, 'mercadolivre_oauth', 'width=600,height=700');
        
        // Poll para verificar se completou
        const checkInterval = setInterval(async () => {
          if (oauthWindow?.closed) {
            clearInterval(checkInterval);
            await fetchMarketplaceStatus();
            await fetchAffiliateConfigs();
            onShowToast('Mercado Livre conectado!', 'Sua conta foi vinculada com sucesso.', 'success');
          }
        }, 1000);
        
        // Timeout de 5 minutos
        setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
      }
    } catch {
      onShowToast('Erro ao conectar', 'Não foi possível iniciar a conexão.', 'error');
    } finally {
      setLoadingStatus(prev => ({ ...prev, mercado_livre: false }));
    }
  };

  const handleDisconnectMercadoLivre = async () => {
    setLoadingStatus(prev => ({ ...prev, mercado_livre: true }));
    try {
      await fetch('/api/mercadolivre/disconnect', { method: 'POST' });
      await fetchMarketplaceStatus();
      onShowToast('Desconectado', 'Conta do Mercado Livre removida.', 'success');
    } catch {
      onShowToast('Erro', 'Não foi possível desconectar.', 'error');
    } finally {
      setLoadingStatus(prev => ({ ...prev, mercado_livre: false }));
    }
  };

  const handleSaveAffiliateConfig = async (marketplace: MarketplaceType) => {
    setSavingAffiliate(marketplace);
    try {
      const config = affiliateConfig[marketplace];
      const res = await fetch(`/api/mercadolivre/affiliate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Configuração salva!', 'Provedor de afiliado atualizado.', 'success');
        setShowProviderConfig(null);
        await fetchMarketplaceStatus();
      }
    } catch {
      onShowToast('Erro', 'Não foi possível salvar.', 'error');
    } finally {
      setSavingAffiliate(null);
    }
  };

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    onShowToast('Configurações salvas!', 'Suas preferências foram atualizadas.', 'success');
    onClose();
  };

  const getStatusIcon = (status: MarketplaceConnection['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-5 h-5 text-[var(--green-400)]" />;
      case 'token_expired': return <AlertCircle className="w-5 h-5 text-[var(--amber-400)]" />;
      case 'connecting': return <Loader2 className="w-5 h-5 text-[var(--blue-400)] animate-spin" />;
      default: return <AlertCircle className="w-5 h-5 text-[var(--text-muted)]" />;
    }
  };

  const getStatusText = (status: MarketplaceConnection['status']) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'token_expired': return 'Token expirado';
      case 'connecting': return 'Conectando...';
      default: return 'Desconectado';
    }
  };

  const renderMarketplaceCard = (marketplace: MarketplaceType) => {
    const info = MARKETPLACE_INFO[marketplace];
    const status = marketplaceStatus[marketplace];
    const providers = AFFILIATE_PROVIDERS[marketplace];
    const config = affiliateConfig[marketplace];
    const isLoading = loadingStatus[marketplace];
    const isConfigOpen = showProviderConfig === marketplace;
    const isSaving = savingAffiliate === marketplace;

    const Icon = info.icon;

    // Provider config display (extracted to avoid IIFE in JSX)
    const selectedProvider = providers.find(p => p.value === config.affiliateProvider);
    const showProviderConfigFields = selectedProvider?.requiresConfig;

    return (
      <div className={`border-2 rounded-2xl p-4 transition-all ${status.connected ? info.borderColor : 'border-[var(--border-default)]'} bg-[var(--surface-card)]`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${info.bgColor} ${info.textColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-[var(--text-title)]">{info.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">Integração de afiliados</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {getStatusIcon(status.status)}
            <span className="text-xs font-bold text-[var(--text-body)]">{getStatusText(status.status)}</span>
          </div>
        </div>

        {status.connected && status.account && (
          <div className="mb-4 p-3 bg-[var(--surface-input)] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-card-raised)] flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--text-body)]">
                  {status.account.nickname?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-title)]">@{status.account.nickname}</p>
                <p className="text-[11px] text-[var(--text-muted)]">ID: {status.account.id}</p>
              </div>
            </div>
            <button
              onClick={marketplace === 'mercado_livre' ? handleDisconnectMercadoLivre : undefined}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-bold text-[var(--text-negative)] hover:bg-[var(--surface-red-soft)] rounded-xl border border-[var(--red-900)] disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        )}

        {!status.connected && marketplace === 'mercado_livre' && (
          <button
            onClick={handleConnectMercadoLivre}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-yellow-500/25 disabled:opacity-50 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>{isLoading ? 'Conectando...' : 'Conectar Mercado Livre'}</span>
          </button>
        )}

        {/* Affiliate Config */}
        <div className={`mt-4 pt-4 border-t border-[var(--border-subtle)] ${isConfigOpen ? '' : 'hidden'}`}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block">
                Tag / ID de Afiliado {info.name}
              </label>
              <input
                type="text"
                value={config.affiliateTag}
                onChange={(e) => setAffiliateConfig(prev => ({ ...prev, [marketplace]: { ...prev[marketplace], affiliateTag: e.target.value } }))}
                placeholder={marketplace === 'shopee' ? 'Ex: seu_id_afiliado' : 'Ex: matt:usuario:toolid ou tag_simples'}
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--surface-input)] border border-[var(--border-default)] rounded-xl focus:bg-[var(--surface-input)] focus:border-[var(--primary)] outline-none font-medium"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                {marketplace === 'shopee' 
                  ? 'Esta tag será injetada nos links gerados automaticamente pela API oficial.'
                  : 'Formato: "tag_simples" ou "matt:usuario:toolid" (veja painel do ML).'
                }
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block">
                Provedor de Link Afiliado
              </label>
              <select
                value={config.affiliateProvider}
                onChange={(e) => setAffiliateConfig(prev => ({ ...prev, [marketplace]: { ...prev[marketplace], affiliateProvider: e.target.value } }))}
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--surface-input)] border border-[var(--border-default)] rounded-xl focus:bg-[var(--surface-input)] focus:border-[var(--primary)] outline-none font-medium text-[var(--text-title)]"
              >
                {providers.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)]">
                {marketplace === 'mercado_livre' 
                  ? '⚠️ ML não tem API oficial pública. Provedores terceiros requerem conta paga.'
                  : 'A Shopee gera links automaticamente via API oficial.'
                }
              </p>
            </div>

            {showProviderConfigFields && (
              <div className="space-y-1.5 p-3 bg-[var(--surface-amber-soft)] border border-[var(--amber-900)] rounded-xl">
                <p className="text-xs font-bold text-[var(--amber-400)]">
                  ⚙️ Configuração adicional necessária para {selectedProvider?.label}
                </p>
                <p className="text-[11px] text-[var(--amber-400)]">
                  Configure as variáveis de ambiente no servidor (.env.local) ou insira as credenciais abaixo.
                </p>
                <textarea
                  value={JSON.stringify(config.providerConfig || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setAffiliateConfig(prev => ({ ...prev, [marketplace]: { ...prev[marketplace], providerConfig: parsed } }));
                    } catch {
                      // Ignore invalid JSON while typing
                    }
                  }}
                  placeholder='{ "apiKey": "sua_chave_aqui" }'
                  className="w-full px-3 py-2 text-xs font-mono bg-[var(--surface-card-raised)] border border-[var(--border-default)] rounded-lg focus:bg-[var(--surface-input)] focus:border-[var(--border-focus)] outline-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-[var(--surface-input)] rounded-xl">
              <div className="pr-3">
                <span className="text-xs font-bold text-[var(--text-title)] block">Ativar integração de afiliado</span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                  Habilita geração automática de links para este marketplace
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setAffiliateConfig(prev => ({ ...prev, [marketplace]: { ...prev[marketplace], isEnabled: e.target.checked } }))}
                className="w-4 h-4 text-[var(--primary)] rounded border-[var(--border-input)] focus:ring-[var(--brand-500)] cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleSaveAffiliateConfig(marketplace)}
              disabled={isSaving}
              className="w-full py-2 px-3 bg-[var(--primary)] hover:bg-[var(--brand-600)] text-[var(--text-on-brand)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[var(--brand-500)]/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Salvando...' : 'Salvar configuração de afiliado'}</span>
            </button>
          </div>
        </div>

        {!isConfigOpen && (status.connected || marketplace === 'mercado_livre') && (
          <button
            onClick={() => setShowProviderConfig(marketplace)}
            className="w-full mt-3 py-2 text-[var(--text-body)] hover:text-[var(--text-title)] text-xs font-medium flex items-center justify-center gap-1"
          >
            <Settings className="w-4 h-4" />
            <span>Configurar afiliado</span>
          </button>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-scrim)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface-card)] w-full max-w-2xl rounded-3xl shadow-2xl border border-[var(--border-default)] overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(100dvh-2rem)] flex flex-col">
        
        {/* Header */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-card-raised)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--surface-card-raised)] text-[var(--text-body)] rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-[var(--text-title)]">
                Configurações
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Marketplaces, afiliado e preferências
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--surface-hover)] rounded-xl cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface-input)]">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'general' 
                ? 'border-[var(--primary)] text-[var(--primary)]' 
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-body)]'
            }`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('marketplaces')}
            className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'marketplaces' 
                ? 'border-[var(--primary)] text-[var(--primary)]' 
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-body)]'
            }`}
          >
            <Link2 className="w-4 h-4 inline mr-1" />
            Marketplaces
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'general' && (
            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              {/* Affiliate Tag (Global/Default) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block">
                  Tag / ID de Afiliado Padrão (Shopee)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.affiliateTag}
                    onChange={(e) => setForm({ ...form, affiliateTag: e.target.value })}
                    placeholder="Ex: seu_id_afiliado"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[var(--surface-input)] border border-[var(--border-default)] rounded-xl focus:bg-[var(--surface-input)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--brand-500)]/20 outline-none font-medium"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Tag padrão para links da Shopee. Cada marketplace pode ter sua própria configuração na aba Marketplaces.
                </p>
              </div>

              {/* Default Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block">
                  Formato Padrão de Cópia
                </label>
                <select
                  value={form.defaultFormat}
                  onChange={(e) => setForm({ ...form, defaultFormat: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-sm bg-[var(--surface-input)] border border-[var(--border-default)] rounded-xl focus:bg-[var(--surface-input)] focus:border-[var(--primary)] outline-none font-medium text-[var(--text-title)]"
                >
                  <option value="standard">WhatsApp & Telegram (Completo com destaques)</option>
                  <option value="compact">Stories & Direct (Curto e direto)</option>
                  <option value="urgent">Relâmpago (Menor preço histórico)</option>
                </select>
              </div>

              {/* Theme */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block">Tema do aplicativo</label>
                <select
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value as 'light' | 'dark' })}
                  className="w-full px-3.5 py-2.5 text-sm bg-[var(--surface-input)] border border-[var(--border-default)] rounded-xl focus:bg-[var(--surface-input)] focus:border-[var(--primary)] outline-none font-medium text-[var(--text-title)]"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </div>

              {/* Privacy Toggle */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3.5 bg-[var(--surface-amber-soft)] border border-[var(--amber-900)] rounded-2xl cursor-pointer">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-[var(--text-title)] block">
                      Exibir caixas de comissão privada nos cards
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                      Mostra a % de comissão e o ganho estimado em R$ no painel do afiliado.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.showPrivateCommission}
                    onChange={(e) => setForm({ ...form, showPrivateCommission: e.target.checked })}
                    className="w-4 h-4 text-[var(--primary)] rounded border-[var(--border-input)] focus:ring-[var(--brand-500)] cursor-pointer"
                  />
                </label>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-input)] text-[var(--text-body)] font-semibold text-xs hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--brand-600)] text-[var(--text-on-brand)] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[var(--brand-500)]/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar preferências</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'marketplaces' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-[var(--text-title)]">Marketplaces Conectados</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Conecte suas contas para buscar produtos e gerar links de afiliado automaticamente.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {renderMarketplaceCard('shopee')}
                {renderMarketplaceCard('mercado_livre')}
              </div>

              {/* Future marketplaces placeholder */}
              <div className="grid gap-4 sm:grid-cols-2">
                {['amazon', 'tiktok_shop', 'shein', 'aliexpress'].map((mp) => (
                  <div key={mp} className="border-2 border-dashed border-[var(--border-default)] rounded-2xl p-4 bg-[var(--surface-input)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[var(--surface-card-raised)] text-[var(--text-muted)]">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[var(--text-title)]">{mp.replace('_', ' ').toUpperCase()}</h3>
                        <p className="text-xs text-[var(--text-muted)]">Em desenvolvimento</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-[var(--text-muted)] text-center">
                      Arquitetura pronta para novos providers
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
