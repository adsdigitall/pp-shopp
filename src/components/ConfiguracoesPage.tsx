import React, { useState, useEffect } from 'react';
import { Settings, Users, Globe, Tag, Shield, User, Bell, Lock, Key, CreditCard, LogOut, Save, Check, X, AlertCircle, Eye, EyeOff, Copy, Edit, Trash2, Plus, Wifi, Smartphone, Mail, Lock as LockIcon, Shield as ShieldIcon, FileText, Send } from 'lucide-react';
import { Template, Coupon, Settings as SettingsType } from '../types/product';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

interface ConfiguracoesPageProps {
  settings: SettingsType;
  templates: Template[];
  coupons: Coupon[];
  onSaveSettings: (settings: Partial<SettingsType>) => void;
  onSaveTemplate: (template: Template) => void;
  onDeleteTemplate: (templateId: string) => void;
  onSaveCoupon: (coupon: Coupon) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  whatsappConnected: boolean;
  onDisconnectWhatsApp: () => void;
}

const tabs = [
  { id: 'canais', label: 'Canais', icon: <Users className="w-4 h-4" /> },
  { id: 'plataformas', label: 'Plataformas', icon: <Globe className="w-4 h-4" /> },
  { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
  { id: 'cupons', label: 'Cupons', icon: <Tag className="w-4 h-4" /> },
  { id: 'seguranca', label: 'Segurança', icon: <Shield className="w-4 h-4" /> },
  { id: 'conta', label: 'Conta', icon: <User className="w-4 h-4" /> },
];

const defaultTemplates = [
  { id: 'clique-agora', name: 'Clique agora e garanta', message: '[OFERTA QUE PODE ACABAR AGORA!]\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\n❌ *Por apenas: {PRECO}*\n_{DESCONTO}% OFF_\n\n*{CTA}:*\n{LINK}\n\n[URGENTE] Pode acabar a qualquer momento ou o preco mudar sem aviso.' },
  { id: 'achado-barato', name: 'Achado barato', message: '[ACHADO DO MOMENTO]\n\n*{TITULO}*\n\n~De: {PRECO_ANTIGO}~\nX *Agora por {PRECO}* - _{DESCONTO}% OFF_\n\n*Clique aqui agora e veja:*\n{LINK}\n\nSe gostou, corre: esse preco pode acabar hoje.' },
  { id: 'vendedor', name: 'Vendedor e humanizado', message: "💛 *Esse achado vale a pena conferir!*\n📦 *{TITULO}*\nO preço caiu de ~{PRECO_ANTIGO}~ para apenas *{PRECO}* 🔥\nPra quem já estava querendo comprar, essa pode ser uma boa hora 👀\n👉 Veja a oferta: {LINK}" },
  { id: 'direto', name: 'Direto e agressivo', message: "🚨 *OFERTA ENCONTRADA!*\n🔥 *{TITULO}*\n~De: {PRECO_ANTIGO}~ 💰 *Por apenas: {PRECO}*\n⚡ Aproveita antes que o preço mude ou o estoque acabe:\n👉 {LINK}" },
  { id: 'achado', name: 'Sensação de achado', message: "👀 *OLHA O QUE EU ACHEI!*\n*{TITULO}*\n❌ De: ~{PRECO_ANTIGO}~\n✅ Agora por: *{PRECO}*\nTá com um preço muito bom! 🔥\n🛒 Corre pra ver: {LINK}" },
  { id: 'urgencia', name: 'Urgência e escassez', message: "⚠️ *PREÇO BAIXOU!*\n🔥 *{TITULO}*\nEra ~{PRECO_ANTIGO}~\nAgora está saindo por apenas *{PRECO}* 😱\n⏳ Não sei até quando esse preço fica disponível.\n👉 Pegue aqui: {LINK}" },
];

export const ConfiguracoesPage: React.FC<ConfiguracoesPageProps> = ({
  settings,
  templates: userTemplates,
  coupons,
  onSaveSettings,
  onSaveTemplate,
  onDeleteTemplate,
  onSaveCoupon,
  onShowToast,
  whatsappConnected,
  onDisconnectWhatsApp,
}) => {
  const [activeTab, setActiveTab] = useState<'canais' | 'plataformas' | 'templates' | 'cupons' | 'seguranca' | 'conta'>('canais');
  const [showPassword, setShowPassword] = useState(false);
  const [validating, setValidating] = useState(false);
  // Shopee via backend real (/api/integrations/shopee/*). O Secret NUNCA
  // entra no settings/localStorage: vive só nestes estados locais.
  const [shopeeStatus, setShopeeStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [shopeeMasked, setShopeeMasked] = useState('');
  const [shopeeAppId, setShopeeAppId] = useState('');
  const [shopeeSecret, setShopeeSecret] = useState('');
  const [shopeeSaving, setShopeeSaving] = useState(false);
  const [shopeeError, setShopeeError] = useState('');
  const [shopeeEditing, setShopeeEditing] = useState(false);
  // Mercado Livre via OAuth real (/api/mercadolivre/*). Sem segredos no front.
  const [mlStatus, setMlStatus] = useState<'loading' | 'connected' | 'token_expired' | 'disconnected'>('loading');
  const [mlAccount, setMlAccount] = useState('');
  const [mlBusy, setMlBusy] = useState(false);
  const [mlError, setMlError] = useState('');
  // AfiliTools: tag + API key geram links com comissão de verdade.
  const [mlTag, setMlTag] = useState(settings.platforms.mercadoLivre.affiliateTag || '');
  const [mlApiKey, setMlApiKey] = useState('');
  const [mlTestUrl, setMlTestUrl] = useState('');
  const [mlProvider, setMlProvider] = useState('manual');
  const [mlHasApiKey, setMlHasApiKey] = useState(false);
  const [mlProviderSaving, setMlProviderSaving] = useState(false);
  const [mlTesting, setMlTesting] = useState(false);
  const [mlTestResult, setMlTestResult] = useState<{ ok: boolean; link?: string; provider?: string; error?: string } | null>(null);

  // Após reload, busca o status real no backend.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/integrations/shopee/status', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (cancelled || !body) return;
        setShopeeStatus(body.connected ? 'connected' : 'disconnected');
        setShopeeMasked(typeof body.appIdMasked === 'string' ? body.appIdMasked : '');
      })
      .catch(() => {
        if (!cancelled) setShopeeStatus('disconnected');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Status real do Mercado Livre após reload.
  const refreshMlStatus = async () => {
    try {
      const res = await fetch('/api/mercadolivre/status', { cache: 'no-store' });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (!body) {
        setMlStatus('disconnected');
        return;
      }
      if (body.connected && body.status !== 'token_expired') {
        setMlStatus('connected');
        setMlAccount(typeof body.account?.nickname === 'string' ? body.account.nickname : '');
      } else if (body.status === 'token_expired') {
        setMlStatus('token_expired');
        setMlAccount(typeof body.account?.nickname === 'string' ? body.account.nickname : '');
      } else {
        setMlStatus('disconnected');
        setMlAccount('');
      }
    } catch {
      setMlStatus('disconnected');
    }
  };

  useEffect(() => {
    void refreshMlStatus();
    // Provedor de afiliado salvo (AfiliTools): tag + se já tem chave.
    fetch('/api/mercadolivre/affiliate-config', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (!body) return;
        if (typeof body.config?.affiliateProvider === 'string') setMlProvider(body.config.affiliateProvider);
        if (body.hasApiKey) setMlHasApiKey(true);
        const savedTag = typeof body.config?.affiliateTag === 'string' ? body.config.affiliateTag : '';
        if (savedTag) setMlTag(prev => prev || savedTag);
      })
      .catch(() => undefined);
  }, []);

  const handleMlProviderSave = async () => {
    const tag = mlTag.trim();
    const key = mlApiKey.trim();
    if (!tag) {
      setMlError('Informe a tag de afiliado.');
      return;
    }
    if (!key && !mlHasApiKey) {
      setMlError('Informe a API Key do AfiliTools.');
      return;
    }
    setMlProviderSaving(true);
    setMlError('');
    try {
      // Preserva a chave já salva se o campo veio vazio.
      const current = await fetch('/api/mercadolivre/affiliate-config', { cache: 'no-store' })
        .then(res => (res.ok ? res.json() : null))
        .catch(() => null);
      const providerConfig = { ...(current?.config?.providerConfig || {}) };
      if (key) providerConfig.apiKey = key;
      const res = await fetch('/api/mercadolivre/affiliate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateTag: tag, affiliateProvider: 'afilitools', providerConfig, isEnabled: true }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error?.message || 'Não foi possível salvar.');
      }
      // Mantém a etiqueta espelhada em dia (extensão e Por links leem dela).
      onSaveSettings({ platforms: { ...settings.platforms, mercadoLivre: { ...settings.platforms.mercadoLivre, affiliateTag: tag } } });
      setMlApiKey('');
      setMlHasApiKey(true);
      setMlProvider('afilitools');
      onShowToast('AfiliTools salvo', 'Tag e chave configuradas. Teste um link abaixo.', 'success');
    } catch (err) {
      setMlError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setMlProviderSaving(false);
    }
  };

  const handleMlTestLink = async () => {
    const url = mlTestUrl.trim();
    if (!url) {
      setMlError('Cole um link de anúncio do ML para testar.');
      return;
    }
    setMlTesting(true);
    setMlTestResult(null);
    setMlError('');
    try {
      const res = await fetch('/api/mercadolivre/test-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Falha no teste.');
      }
      setMlTestResult({ ok: true, link: String(body?.affiliateUrl || ''), provider: String(body?.provider || 'afilitools') });
    } catch (err) {
      setMlTestResult({ ok: false, error: err instanceof Error ? err.message : 'Falha no teste.' });
    } finally {
      setMlTesting(false);
    }
  };

  const handleMlConnect = async () => {
    if (mlBusy) return;
    setMlBusy(true);
    setMlError('');
    try {
      const res = await fetch('/api/mercadolivre/auth-url');
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.authUrl) {
        throw new Error(
          res.status === 503
            ? 'Integração do Mercado Livre não configurada no servidor. Fale com o suporte.'
            : 'Não foi possível iniciar a conexão. Tente novamente.',
        );
      }
      const oauthWindow = window.open(body.authUrl, 'mercadolivre_oauth', 'width=600,height=700');
      if (!oauthWindow) {
        throw new Error('O navegador bloqueou a janela. Permita popups e tente de novo.');
      }
      // Quando a janela fecha, confere se autorizou de verdade.
      const oauthTimeout = window.setTimeout(() => {
        window.clearInterval(checkInterval);
        setMlBusy(false);
      }, 5 * 60 * 1000);
      const checkInterval = window.setInterval(async () => {
        if (!oauthWindow.closed) return;
        window.clearInterval(checkInterval);
        window.clearTimeout(oauthTimeout);
        await refreshMlStatus();
        setMlBusy(false);
        onShowToast('Conta verificada', 'Confira o status acima.', 'info');
      }, 1000);
    } catch (err) {
      setMlError(err instanceof Error ? err.message : 'Não foi possível conectar. Tente novamente.');
      setMlBusy(false);
    }
  };

  const handleMlDisconnect = async () => {
    if (mlBusy) return;
    setMlBusy(true);
    setMlError('');
    try {
      await fetch('/api/mercadolivre/disconnect', { method: 'POST' });
      setMlStatus('disconnected');
      setMlAccount('');
      onShowToast('Mercado Livre desconectado', undefined, 'info');
    } catch {
      setMlError('Não foi possível desconectar. Tente novamente.');
    } finally {
      setMlBusy(false);
    }
  };

  const handleShopeeSave = async () => {
    const appId = shopeeAppId.trim();
    const secret = shopeeSecret.trim();
    if (!appId || !secret) {
      setShopeeError('Informe o App ID e o Secret da Shopee.');
      return;
    }
    setShopeeSaving(true);
    setShopeeError('');
    try {
      const res = await fetch('/api/integrations/shopee/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, secret }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Não foi possível salvar. Tente novamente.');
      }
      setShopeeStatus('connected');
      setShopeeMasked(typeof body?.appIdMasked === 'string' ? body.appIdMasked : '');
      setShopeeSecret('');
      setShopeeEditing(false);
      onShowToast('Shopee conectada', 'Credenciais validadas e salvas.', 'success');
    } catch (err) {
      setShopeeError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setShopeeSaving(false);
    }
  };

  const handleShopeeDisconnect = async () => {
    setShopeeSaving(true);
    setShopeeError('');
    try {
      await fetch('/api/integrations/shopee/disconnect', { method: 'POST' });
      setShopeeStatus('disconnected');
      setShopeeMasked('');
      setShopeeAppId('');
      setShopeeSecret('');
      setShopeeEditing(false);
      onShowToast('Shopee desconectada', undefined, 'info');
    } catch {
      setShopeeError('Não foi possível desconectar. Tente novamente.');
    } finally {
      setShopeeSaving(false);
    }
  };
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newCoupon, setNewCoupon] = useState<{ platform: 'shopee' | 'mercado_livre' | 'amazon' | 'magalu'; code: string; description: string }>({ platform: 'shopee', code: '', description: '' });

  const allTemplates = [...defaultTemplates, ...(userTemplates || [])];

  const handleTemplateEdit = (template: Template) => {
    setEditingTemplate({ ...template });
  };

  const handleTemplateSave = () => {
    if (editingTemplate) {
      onSaveTemplate(editingTemplate);
      setEditingTemplate(null);
      onShowToast('Template salvo', undefined, 'success');
    }
  };

  const handleTemplateDelete = (id: string) => {
    onDeleteTemplate(id);
    onShowToast('Template removido', undefined, 'success');
  };

  const handleCouponSave = () => {
    if (newCoupon.code.trim()) {
      onSaveCoupon({ ...newCoupon, id: `coupon-${Date.now()}`, expiresAt: null, isActive: true });
      setNewCoupon({ platform: 'shopee', code: '', description: '' });
      onShowToast('Cupom salvo', undefined, 'success');
    }
  };

  // Valida TODAS as integrações de uma vez: Shopee (chamada real à API,
  // que só responde 200 com credenciais válidas) + WhatsApp (sessão WAHA).
  const handleValidateAll = async () => {
    if (validating) return;
    setValidating(true);
    const parts: string[] = [];
    let okCount = 0;
    try {
      const prodRes = await fetch('/api/products?limit=1');
      if (prodRes.ok) {
        okCount++;
        parts.push('Shopee: conectado');
      } else {
        parts.push(`Shopee: falha (${prodRes.status})`);
      }
    } catch {
      parts.push('Shopee: servidor sem resposta');
    }
    try {
      const waRes = await fetch('/api/whatsapp/status');
      const waBody = waRes.ok ? await waRes.json().catch(() => null) : null;
      const waOk = !!waBody && (waBody.status === 'connected' || waBody.status === 'working');
      if (waOk) {
        okCount++;
        parts.push('WhatsApp: conectado');
      } else {
        parts.push('WhatsApp: desconectado');
      }
    } catch {
      parts.push('WhatsApp: servidor sem resposta');
    }
    setValidating(false);
    onShowToast(
      okCount === 2 ? 'Tudo conectado' : 'Validação concluída',
      parts.join(' · '),
      okCount === 2 ? 'success' : 'error',
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'canais':
        return (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">Conecte os canais onde suas ofertas serão enviadas.</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success)]/10">
                    <Send className="w-5 h-5 text-[var(--success)]" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">WhatsApp</p>
                    {whatsappConnected ? (
                      <Badge variant="success">Conectado</Badge>
                    ) : (
                      <Badge variant="destructive">Desconectado</Badge>
                    )}
                  </div>
                </div>
                {whatsappConnected && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="destructive" onClick={onDisconnectWhatsApp} className="border-[var(--error)]/20 bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 flex items-center gap-1.5">
                        <Wifi className="w-3 h-3" /> Desconectar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Desconectar WhatsApp</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)]">
                    <Mail className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Telegram</p>
                    <Badge variant="secondary">Em breve</Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface)] flex items-center gap-2 mx-auto border-[var(--border)]">
                <Plus className="w-4 h-4" /> Adicionar outro número ou bot
              </Button>
            </div>
          </div>
        );

      case 'plataformas':
        return (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">Suas contas de afiliado, pra gerar links com a sua tag.</p>
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Shopee</p>
                    {shopeeStatus === 'loading' ? (
                      <Badge variant="secondary">Verificando...</Badge>
                    ) : shopeeStatus === 'connected' ? (
                      <Badge variant="success">Conectado</Badge>
                    ) : (
                      <Badge variant="destructive">Desconectado</Badge>
                    )}
                  </div>
                </div>
                {shopeeStatus === 'connected' && !shopeeEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">App ID</label>
                      <Input
                        type="text"
                        readOnly
                        value={shopeeMasked}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none opacity-80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Secret</label>
                      <Input
                        type="password"
                        readOnly
                        value="••••••••••••••••"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none opacity-80"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" onClick={() => { setShopeeEditing(true); setShopeeError(''); }} className="flex-1 flex items-center justify-center gap-2">Trocar conta</Button>
                      <Button variant="destructive" onClick={handleShopeeDisconnect} disabled={shopeeSaving} className="flex-1 border-[var(--error)]/20 bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"><Wifi className="w-3 h-3" /> {shopeeSaving ? 'Desconectando...' : 'Desconectar'}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">App ID</label>
                      <Input
                        type="text"
                        value={shopeeAppId}
                        onChange={e => { setShopeeAppId(e.target.value); setShopeeError(''); }}
                        placeholder="Ex.: 18349490069"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Secret</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={shopeeSecret}
                          onChange={e => { setShopeeSecret(e.target.value); setShopeeError(''); }}
                          placeholder="Cole o Secret da Shopee"
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] pr-10"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {shopeeError && (
                      <p className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2 text-xs font-semibold text-[var(--error)]">{shopeeError}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button variant="default" onClick={handleShopeeSave} disabled={shopeeSaving} className="flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-3 h-3" /> {shopeeSaving ? 'Salvando...' : 'Salvar'}</Button>
                      <Button variant="outline" onClick={handleValidateAll} disabled={validating} className="flex-1 border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20 flex items-center justify-center gap-2 disabled:opacity-50"><Wifi className="w-3 h-3" /> {validating ? 'Validando...' : 'Validar conexão'}</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Mercado Livre</p>
                    {mlStatus === 'loading' ? (
                      <Badge variant="secondary">Verificando...</Badge>
                    ) : mlStatus === 'connected' ? (
                      <Badge variant="success">Conectado{mlAccount ? ` · ${mlAccount}` : ''}</Badge>
                    ) : mlStatus === 'token_expired' ? (
                      <Badge variant="warning">Token expirado</Badge>
                    ) : (
                      <Badge variant="destructive">Desconectado</Badge>
                    )}
                  </div>
                </div>
                {mlStatus === 'connected' ? (
                  <div className="space-y-3">
                    {mlAccount && (
                      <p className="text-xs text-[var(--text-secondary)]">Conta vinculada: <span className="font-bold text-[var(--text-primary)]">{mlAccount}</span></p>
                    )}
                    <Button variant="destructive" onClick={handleMlDisconnect} disabled={mlBusy} className="border-[var(--error)]/20 bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"><Wifi className="w-3 h-3" /> {mlBusy ? 'Desconectando...' : 'Desconectar'}</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-secondary)]">Entre com sua conta do Mercado Livre para buscar produtos e gerar links.</p>
                    {mlError && (
                      <p className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2 text-xs font-semibold text-[var(--error)]">{mlError}</p>
                    )}
                    <Button variant="default" onClick={handleMlConnect} disabled={mlBusy} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2 disabled:opacity-50"><Wifi className="w-3 h-3" /> {mlBusy ? 'Aguardando autorização...' : mlStatus === 'token_expired' ? 'Reconectar conta' : 'Conectar conta'}</Button>
                  </div>
                )}
                <div className="mt-4 border-t border-[var(--border)] pt-3 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">AfiliTools · links com comissão</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Provedor: <span className="font-bold">{mlProvider === 'afilitools' ? 'AfiliTools' : 'não configurado'}</span>
                      {' · '}API Key: <span className="font-bold">{mlHasApiKey ? 'salva' : 'faltando'}</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tag de afiliado</label>
                    <Input
                      type="text"
                      value={mlTag}
                      onChange={e => { setMlTag(e.target.value); setMlError(''); }}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                      placeholder="sua-tag"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">API Key do AfiliTools</label>
                    <Input
                      type="password"
                      value={mlApiKey}
                      onChange={e => { setMlApiKey(e.target.value); setMlError(''); }}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                      placeholder={mlHasApiKey ? '•••••••• (salva — preencha só para trocar)' : 'Cole sua API Key'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Testar link (opcional)</label>
                    <Input
                      type="text"
                      value={mlTestUrl}
                      onChange={e => setMlTestUrl(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                      placeholder="Cole um anúncio do ML"
                    />
                  </div>
                  {mlTestResult?.ok && mlTestResult.link && (
                    <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-2">
                      <p className="text-xs font-bold text-[var(--success)]">Funcionando! Link com comissão gerado:</p>
                      <a href={mlTestResult.link} target="_blank" rel="noreferrer" className="block truncate text-[11px] font-semibold text-[var(--primary)] underline">{mlTestResult.link}</a>
                    </div>
                  )}
                  {mlTestResult && !mlTestResult.ok && (
                    <p className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2 text-xs font-semibold text-[var(--error)]">{mlTestResult.error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="default" onClick={handleMlProviderSave} disabled={mlProviderSaving} className="flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-3 h-3" /> {mlProviderSaving ? 'Salvando...' : 'Salvar'}</Button>
                    <Button variant="outline" onClick={handleMlTestLink} disabled={mlTesting} className="flex-1 flex items-center justify-center gap-2 disabled:opacity-50"><Wifi className="w-3 h-3" /> {mlTesting ? 'Testando...' : 'Testar link'}</Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Amazon</p>
                    <Badge variant="warning">Pendente</Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Associate tag</label>
                  <Input
                    type="text"
                    value={settings.platforms.amazon.associateTag}
                    onChange={e => onSaveSettings({ platforms: { ...settings.platforms, amazon: { ...settings.platforms.amazon, associateTag: e.target.value } } })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    placeholder="suatag-20"
                  />
                </div>
                <Button variant="default" className="mt-3 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2"><Save className="w-3 h-3" /> Salvar</Button>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Magalu</p>
                    <Badge variant="warning">Pendente</Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Sua loja (Magazine Você)</label>
                  <Input
                    type="text"
                    value={settings.platforms.magalu.storeSlug}
                    onChange={e => onSaveSettings({ platforms: { ...settings.platforms, magalu: { ...settings.platforms.magalu, storeSlug: e.target.value } } })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                    placeholder="minhaloja"
                  />
                </div>
                <Button variant="default" className="mt-3 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2"><Save className="w-3 h-3" /> Salvar</Button>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">Modelos de mensagem usados nos disparos e espelhamentos. Use variáveis como {'{' + 'TITULO' + '}'}, {'{' + 'PRECO' + '}'} e {'{' + 'LINK' + '}'}.</p>

            <div className="space-y-3">
              {(userTemplates || []).map(template => (
                <div key={template.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text-primary)]">{template.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)] font-mono truncate">{template.message}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleTemplateEdit(template)} className="p-1.5 rounded hover:bg-[var(--surface-elevated)]"><Edit className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                        </TooltipTrigger>
                        <TooltipContent>Editar template</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleTemplateDelete(template.id)} className="p-1.5 rounded hover:bg-[var(--error)]/10"><Trash2 className="w-4 h-4 text-[var(--error)]" /></button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir template</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--primary)]" />
                <span className="font-bold text-[var(--text-primary)]">Modelos sugeridos</span>
              </div>
              {defaultTemplates.map(template => (
                <div key={template.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">{template.name}</span>
                        <Badge variant="warning">usar</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)] font-mono truncate">{template.message}</p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="default" onClick={() => onSaveTemplate({ ...template, id: `custom-${template.id}`, isCustom: true, createdAt: new Date().toISOString() })} className="rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] px-3 py-1.5 text-xs font-bold">
                          Usar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Usar este template</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={() => setEditingTemplate({ id: `custom-${Date.now()}`, name: '', message: '', isCustom: true, createdAt: new Date().toISOString() })} className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[var(--text-secondary)] hover:border-[var(--primary)] w-full">
              <Plus className="w-6 h-6 mx-auto text-[var(--text-secondary)] mb-2" />
              <p className="text-xs font-medium">Modelo em branco</p>
            </Button>

            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
              <DialogContent className="w-full max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingTemplate?.id.startsWith('custom-') ? 'Editar template' : 'Novo template'}</DialogTitle>
                  <DialogDescription>Edite o template de mensagem abaixo.</DialogDescription>
                </DialogHeader>
                <div className="p-4 space-y-3">
                  <Input
                    type="text"
                    placeholder="Nome do template"
                    value={editingTemplate?.name || ''}
                    onChange={e => setEditingTemplate({ ...editingTemplate!, name: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                  />
                  <Textarea
                    placeholder="Mensagem com variáveis: {TITULO}, {PRECO}, {PRECO_ANTIGO}, {LINK}, {CUPOM}"
                    value={editingTemplate?.message || ''}
                    onChange={e => setEditingTemplate({ ...editingTemplate!, message: e.target.value })}
                    className="w-full min-h-[100px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none font-mono"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingTemplate(null)} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Cancelar</Button>
                  <Button variant="default" onClick={handleTemplateSave} className="flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] py-2 text-xs font-black">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'cupons': {
        return (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">Cupons por plataforma. Nas mensagens, a variável {'{' + 'CUPOM' + '}'} usa o cupom da mesma plataforma da oferta.</p>
            <Button variant="default" onClick={() => setNewCoupon({ platform: 'shopee', code: '', description: '' })} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] px-4 py-2.5 text-xs font-black flex items-center gap-2"><Plus className="w-4 h-4" /> Novo cupom</Button>

            {coupons.map(coupon => (
              <div key={coupon.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={coupon.platform === 'shopee' ? 'warning' : coupon.platform === 'mercado_livre' ? 'secondary' : coupon.platform === 'amazon' ? 'default' : 'secondary'}>
                    {coupon.platform}
                  </Badge>
                  <div>
                    <p className="font-bold text-[var(--text-primary)] font-mono">{coupon.code}</p>
                    {coupon.description && <p className="text-[10px] text-[var(--text-secondary)]">{coupon.description}</p>}
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1.5 rounded hover:bg-[var(--error)]/10"><Trash2 className="w-4 h-4 text-[var(--error)]" /></button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir cupom</TooltipContent>
                </Tooltip>
              </div>
            ))}

            <Dialog open={newCoupon.code !== ''} onOpenChange={(open) => !open && setNewCoupon({ platform: 'shopee', code: '', description: '' })}>
              <DialogContent className="w-full max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo cupom</DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-3">
                  <Select value={newCoupon.platform} onValueChange={(value) => setNewCoupon({ ...newCoupon, platform: value as 'shopee' | 'mercado_livre' | 'amazon' | 'magalu' })}>
                    <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shopee">Shopee</SelectItem>
                      <SelectItem value="mercado_livre">Mercado Livre</SelectItem>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="magalu">Magalu</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="Código do cupom"
                    value={newCoupon.code}
                    onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                  />
                  <Input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={newCoupon.description}
                    onChange={e => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewCoupon({ platform: 'shopee', code: '', description: '' })} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Cancelar</Button>
                  <Button variant="default" onClick={handleCouponSave} className="flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] py-2 text-xs font-black">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      }

      case 'seguranca':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10">
                  <ShieldIcon className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Ritmo seguro</p>
                  <p className="text-xs text-[var(--text-secondary)]">Intervalo automático e mínimo de 20 minutos entre envios</p>
                </div>
              </div>
              <div className="flex items-center gap-3 cursor-pointer">
                <Switch checked={settings.security.safeInterval} onCheckedChange={(checked) => onSaveSettings({ security: { safeInterval: checked } })} />
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Ritmo seguro</p>
                  <p className="text-xs text-[var(--text-secondary)]">Intervalo automático e mínimo de 20 minutos entre envios</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'conta':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b45] to-[#EE4D2D] text-lg text-white">
                  CM
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{settings.account.plan} | Afiliado Viral</p>
                  <Badge variant="success">Assinatura ativa</Badge>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="ml-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Gerenciar</Button>
                  </TooltipTrigger>
                  <TooltipContent>Gerenciar conta</TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nome</label>
                  <Input
                    type="text"
                    value={settings.account.name}
                    onChange={e => onSaveSettings({ account: { ...settings.account, name: e.target.value } })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">E-mail</label>
                  <Input
                    type="email"
                    value={settings.account.email}
                    onChange={e => onSaveSettings({ account: { ...settings.account, email: e.target.value } })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Alterar senha</Button>
                <Button variant="default" onClick={() => onSaveSettings(settings)} className="flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"><Save className="w-3 h-3 mr-1" /> Salvar</Button>
              </div>
            </div>
            <Button variant="destructive" className="w-full rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/10 px-4 py-2.5 text-xs font-bold text-[var(--error)] hover:bg-[var(--error)]/20 flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Sair da conta
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="configuracoes" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-base font-black text-[var(--text-primary)]">Configurações</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Conexões, modelos e ajustes. Você configura uma vez.</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="flex gap-2">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-[var(--surface-elevated)] text-[var(--text-secondary)] data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white"
              >
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {renderTabContent()}
    </section>
  );
};

export default ConfiguracoesPage;
