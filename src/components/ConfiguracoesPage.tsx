import React, { useState } from 'react';
import { Settings, Users, Globe, Tag, Shield, User, Bell, Lock, Key, CreditCard, LogOut, Save, Check, X, AlertCircle, Eye, EyeOff, Copy, Edit, Trash2, Plus, Wifi, Smartphone, Mail, Lock as LockIcon, Shield as ShieldIcon, FileText, Send } from 'lucide-react';
import { Template, Coupon, Settings as SettingsType } from '../types/product';

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'canais':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Conecte os canais onde suas ofertas serão enviadas.</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-100">
                    <Send className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">WhatsApp</p>
                    <p className="text-xs text-green-700">Conectado</p>
                  </div>
                </div>
                {whatsappConnected && (
                  <button onClick={onDisconnectWhatsApp} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 flex items-center gap-1.5">
                    <Wifi className="w-3 h-3" /> Desconectar
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Telegram</p>
                    <p className="text-xs text-slate-500">Em breve</p>
                  </div>
                </div>
              </div>
              <button className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" /> Adicionar outro número ou bot
              </button>
            </div>
          </div>
        );

      case 'plataformas':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Suas contas de afiliado, pra gerar links com a sua tag.</p>
            <div className="space-y-4">
              {/* Shopee */}
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">Shopee</p>
                    <p className="text-xs text-green-700">Conectado</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">AppId</label>
                    <input
                      type="text"
                      value={settings.platforms.shopee.appId}
                      onChange={e => onSaveSettings({ platforms: { ...settings.platforms, shopee: { ...settings.platforms.shopee, appId: e.target.value } } })}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Secret</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={settings.platforms.shopee.secret}
                        onChange={e => onSaveSettings({ platforms: { ...settings.platforms, shopee: { ...settings.platforms.shopee, secret: e.target.value } } })}
                        className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400 pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-xl bg-[#EE4D2D] px-4 py-2 text-xs font-black text-white hover:bg-orange-600 flex items-center justify-center gap-2"><Save className="w-3 h-3" /> Salvar</button>
                  <button className="flex-1 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100 flex items-center justify-center gap-2"><Wifi className="w-3 h-3" /> Validar conexão</button>
                </div>
              </div>

              {/* Mercado Livre */}
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">Mercado Livre</p>
                    <p className="text-xs text-orange-700">Pendente</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tag de afiliado</label>
                  <input
                    type="text"
                    value={settings.platforms.mercadoLivre.affiliateTag}
                    onChange={e => onSaveSettings({ platforms: { ...settings.platforms, mercadoLivre: { ...settings.platforms.mercadoLivre, affiliateTag: e.target.value } } })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    placeholder="sua-tag"
                  />
                </div>
                <button className="mt-3 rounded-xl bg-[#EE4D2D] px-4 py-2 text-xs font-black text-white hover:bg-orange-600 flex items-center justify-center gap-2"><Save className="w-3 h-3" /> Salvar</button>
              </div>

              {/* Amazon */}
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">Amazon</p>
                    <p className="text-xs text-orange-700">Pendente</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Associate tag</label>
                  <input
                    type="text"
                    value={settings.platforms.amazon.associateTag}
                    onChange={e => onSaveSettings({ platforms: { ...settings.platforms, amazon: { ...settings.platforms.amazon, associateTag: e.target.value } } })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    placeholder="suatag-20"
                  />
                </div>
                <button className="mt-3 rounded-xl bg-[#EE4D2D] px-4 py-2 text-xs font-black text-white hover:bg-orange-600 flex items-center justify-center gap-2"><Save className="w-3 h-3" /> Salvar</button>
              </div>

              {/* Magalu */}
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">Magalu</p>
                    <p className="text-xs text-orange-700">Pendente</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sua loja (Magazine Você)</label>
                  <input
                    type="text"
                    value={settings.platforms.magalu.storeSlug}
                    onChange={e => onSaveSettings({ platforms: { ...settings.platforms, magalu: { ...settings.platforms.magalu, storeSlug: e.target.value } } })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    placeholder="minhaloja"
                  />
                </div>
                <button className="mt-3 rounded-xl bg-[#EE4D2D] px-4 py-2 text-xs font-black text-white hover:bg-orange-600 flex items-center justify-center gap-2"><Save className="w-3 h-3" /> Salvar</button>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Modelos de mensagem usados nos disparos e espelhamentos. Use variáveis como {'{' + 'TITULO' + '}'}, {'{' + 'PRECO' + '}'} e {'{' + 'LINK' + '}'}.</p>

            {/* Custom Templates */}
            <div className="space-y-3">
              {(userTemplates || []).map(template => (
                <div key={template.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900">{template.name}</p>
                      <p className="mt-1 text-xs text-slate-600 font-mono truncate">{template.message}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleTemplateEdit(template)} className="p-1.5 rounded hover:bg-slate-100"><Edit className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => handleTemplateDelete(template.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested Templates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-slate-700">Modelos sugeridos</span>
              </div>
              {defaultTemplates.map(template => (
                <div key={template.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{template.name}</span>
                        <span className="rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5">usar</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 font-mono truncate">{template.message}</p>
                    </div>
                    <button
                      onClick={() => onSaveTemplate({ ...template, id: `custom-${template.id}`, isCustom: true, createdAt: new Date().toISOString() })}
                      className="rounded-lg bg-[#EE4D2D] px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
                    >
                      Usar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Template */}
            <button
              onClick={() => setEditingTemplate({ id: `custom-${Date.now()}`, name: '', message: '', isCustom: true, createdAt: new Date().toISOString() })}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center text-slate-500 hover:border-orange-300"
            >
              <Plus className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium">Modelo em branco</p>
            </button>

            {/* Edit Modal */}
            {editingTemplate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="font-bold text-slate-900">{editingTemplate.id.startsWith('custom-') ? 'Editar template' : 'Novo template'}</h3>
                    <button onClick={() => setEditingTemplate(null)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Nome do template"
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    />
                    <textarea
                      placeholder="Mensagem com variáveis: {TITULO}, {PRECO}, {PRECO_ANTIGO}, {LINK}, {CUPOM}"
                      value={editingTemplate.message}
                      onChange={e => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                      className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-orange-400 resize-none font-mono"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingTemplate(null)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                      <button onClick={handleTemplateSave} className="flex-1 rounded-xl bg-[#EE4D2D] py-2 text-xs font-black text-white hover:bg-orange-600">Salvar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'cupons': {
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Cupons por plataforma. Nas mensagens, a variável {'{' + 'CUPOM' + '}'} usa o cupom da mesma plataforma da oferta.</p>
            <button onClick={() => setNewCoupon({ platform: 'shopee', code: '', description: '' })} className="rounded-xl bg-[#EE4D2D] px-4 py-2.5 text-xs font-black text-white hover:bg-orange-600 flex items-center gap-2"><Plus className="w-4 h-4" /> Novo cupom</button>

            {coupons.map(coupon => (
              <div key={coupon.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${coupon.platform === 'shopee' ? 'bg-orange-100 text-orange-700' : coupon.platform === 'mercado_livre' ? 'bg-yellow-100 text-yellow-700' : coupon.platform === 'amazon' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                    {coupon.platform}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 font-mono">{coupon.code}</p>
                    {coupon.description && <p className="text-[10px] text-slate-500">{coupon.description}</p>}
                  </div>
                </div>
                <button className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            ))}

            {/* Add Coupon Modal */}
            {newCoupon.code !== '' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="font-bold text-slate-900">Novo cupom</h3>
                    <button onClick={() => setNewCoupon({ platform: 'shopee', code: '', description: '' })} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <select
                      value={newCoupon.platform}
                      onChange={e => setNewCoupon({ ...newCoupon, platform: e.target.value as 'shopee' | 'mercado_livre' | 'amazon' | 'magalu' })}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    >
                      <option value="shopee">Shopee</option>
                      <option value="mercado_livre">Mercado Livre</option>
                      <option value="amazon">Amazon</option>
                      <option value="magalu">Magalu</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Código do cupom"
                      value={newCoupon.code}
                      onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    />
                    <input
                      type="text"
                      placeholder="Descrição (opcional)"
                      value={newCoupon.description}
                      onChange={e => setNewCoupon({ ...newCoupon, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setNewCoupon({ platform: 'shopee', code: '', description: '' })} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                      <button onClick={handleCouponSave} className="flex-1 rounded-xl bg-[#EE4D2D] py-2 text-xs font-black text-white hover:bg-orange-600">Salvar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      } // close cupons case block

      case 'seguranca':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
                  <ShieldIcon className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Ritmo seguro</p>
                  <p className="text-xs text-slate-500">Intervalo automático e mínimo de 20 minutos entre envios</p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.security.safeInterval} onChange={e => onSaveSettings({ security: { safeInterval: e.target.checked } })} className="w-5 h-5 text-[#EE4D2D] border-slate-300 rounded focus:ring-[#EE4D2D]" />
                <div>
                  <p className="font-bold text-slate-900">Ritmo seguro</p>
                  <p className="text-xs text-slate-500">Intervalo automático e mínimo de 20 minutos entre envios</p>
                </div>
              </label>
            </div>
          </div>
        );

      case 'conta':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#ff6b45] to-[#EE4D2D] text-lg text-white">
                  CM
                </div>
                <div>
                  <p className="font-bold text-slate-900">{settings.account.plan} | Afiliado Viral</p>
                  <p className="text-xs text-green-700">Assinatura ativa</p>
                </div>
                <button className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Gerenciar</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
                  <input
                    type="text"
                    value={settings.account.name}
                    onChange={e => onSaveSettings({ account: { ...settings.account, name: e.target.value } })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={settings.account.email}
                    onChange={e => onSaveSettings({ account: { ...settings.account, email: e.target.value } })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Alterar senha</button>
                <button onClick={() => onSaveSettings(settings)} className="flex-1 rounded-xl bg-[#EE4D2D] px-4 py-2 text-xs font-black text-white hover:bg-orange-600"><Save className="w-3 h-3 mr-1" /> Salvar</button>
              </div>
            </div>
            <button className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Sair da conta
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="configuracoes" className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-6">
        <h2 className="text-base font-black text-slate-900">Configurações</h2>
        <p className="mt-1 text-xs text-slate-500">Conexões, modelos e ajustes. Você configura uma vez.</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-[#EE4D2D] text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </section>
  );
};

export default ConfiguracoesPage;
