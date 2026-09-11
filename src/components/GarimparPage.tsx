import React, { useEffect, useRef, useState } from 'react';
import { Product, FilterType, GarimparPlatform, GarimparTab, NACIONAIS_FILTER_HINT } from '../types/product';
import { ProductCard } from './ProductCard';
import { Grid2X2, Search, SearchX, Tag, TrendingUp, RefreshCw, Star, DollarSign, ArrowDown, Percent, Copy, Plus, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

interface GarimparPageProps {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  selectedPlatform: GarimparPlatform;
  onSelectPlatform: (platform: GarimparPlatform) => void;
  garimparTab: GarimparTab;
  onSelectGarimparTab: (tab: GarimparTab) => void;
  shopeeConfigured: boolean;
  onOpenSettings: () => void;
  onOpenGroups: () => void;
  onOpenExtension?: () => void;
  onOpenConfiguracoes?: () => void;
  onAddToQueue: (product: Product) => void;
  onGenerateOffer: (product: Product) => void;
  onShare: (product: Product) => void;
  onPreview: (product: Product) => void;
  onCopyLink: (product: Product) => void;
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const GarimparPage: React.FC<GarimparPageProps> = ({
  activeFilter, onSelectFilter, activeCategory, onSelectCategory, searchQuery, onSearchChange, onSearchSubmit,
  products, loading, loadingMore, hasNextPage, onLoadMore, onRefresh, selectedPlatform, onSelectPlatform,
  garimparTab, onSelectGarimparTab, onAddToQueue, onGenerateOffer, onShare, onPreview, onCopyLink, showToast,
  onOpenSettings, onOpenExtension, onOpenConfiguracoes,
}) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!loading) setSearching(false);
  }, [loading]);

  const submitSearch = () => {
    setSearching(true);
    onSearchSubmit();
  };

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) onLoadMore(); }, { rootMargin: '400px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore]);

  const platforms: Array<{ id: GarimparPlatform; label: string; icon: string; color: string }> = [
    { id: 'shopee', label: 'Shopee', icon: '🛍️', color: 'from-orange-500 to-orange-600' },
    { id: 'mercado_livre', label: 'Mercado Livre', icon: '🤝', color: 'from-yellow-500 to-yellow-600' },
    { id: 'amazon', label: 'Amazon', icon: '📦', color: 'from-amber-500 to-amber-600' },
    { id: 'magalu', label: 'Magalu', icon: '💜', color: 'from-purple-500 to-purple-600' },
  ];

  const statusDot = (ok: boolean | null) => (
    <span className={`h-2 w-2 shrink-0 rounded-full ${ok === null ? 'bg-[var(--text-secondary)]' : ok ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
  );

  const platformPills = (
    <div className="garimpar-platforms flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {platforms.map((platform) => {
        if (platform.id === 'magalu') {
          return (
            <Button key={platform.id} type="button" variant="outline" disabled className="h-11 shrink-0 gap-2 rounded-xl px-3 text-sm font-bold opacity-80">
              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
              <span className="hidden sm:inline">{platform.label}</span>
              <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-500">EM BREVE</span>
            </Button>
          );
        }
        if (platform.id === 'amazon') {
          return (
            <Button key={platform.id} type="button" variant="outline" onClick={() => onOpenSettings()} className="h-11 shrink-0 gap-2 rounded-xl px-3 text-sm font-bold">
              <span className="h-2 w-2 shrink-0 rounded-full bg-orange-400" />
              <span className="hidden sm:inline">{platform.label}</span>
              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">· conectar</span>
            </Button>
          );
        }
        const ok = platform.id === 'shopee' ? shopeeOk : mlOk;
        return (
          <Button
            key={platform.id}
            type="button"
            variant={selectedPlatform === platform.id ? 'default' : 'outline'}
            onClick={() => onSelectPlatform(platform.id)}
            data-active={selectedPlatform === platform.id}
            className="garimpar-platform h-11 shrink-0 gap-2 rounded-xl px-3 text-sm font-bold transition-all"
          >
            {statusDot(ok)}
            <span className="hidden sm:inline">{platform.label}</span>
          </Button>
        );
      })}
    </div>
  );
  
  const tabs: Array<{ id: GarimparTab; label: string }> = [
    { id: 'buscar', label: 'Buscar' }, { id: 'categorias', label: 'Categorias' }, { id: 'mais-buscados', label: 'Mais buscados' }, { id: 'lojas', label: 'Lojas' }, { id: 'links', label: 'Por links' },
  ];

  interface LinkResolvido {
    url: string;
    plataforma: string | null;
    title: string;
    image: string;
    price: number | null;
    priceOld: number | null;
    affiliateUrl: string;
    status: string;
    erro: string;
    selected: boolean;
  }

  const [linksText, setLinksText] = useState('');
  const [mlLinksText, setMlLinksText] = useState('');
  const [resolvendoLinks, setResolvendoLinks] = useState(false);
  const [linksResolvidos, setLinksResolvidos] = useState<LinkResolvido[]>([]);
  // Status reais das plataformas (pills + painel ML).
  const [shopeeOk, setShopeeOk] = useState<boolean | null>(null);
  const [mlOk, setMlOk] = useState<boolean | null>(null);
  const [mlProviderLabel, setMlProviderLabel] = useState('');
  const [extSyncedAt, setExtSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/integrations/shopee/status', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => { if (!cancelled && body) setShopeeOk(!!body.connected); })
      .catch(() => undefined);
    fetch('/api/mercadolivre/status', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => { if (!cancelled && body) setMlOk(!!body.connected && body.status !== 'token_expired'); })
      .catch(() => undefined);
    fetch('/api/mercadolivre/affiliate-config', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => { if (!cancelled && typeof body?.config?.affiliateProvider === 'string') setMlProviderLabel(body.config.affiliateProvider); })
      .catch(() => undefined);
    fetch('/api/extension/token', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(body => { if (!cancelled && body?.lastUsedAt) setExtSyncedAt(String(body.lastUsedAt)); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const tempoAtras = (iso: string | null) => {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '';
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'agora mesmo';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'há 1 dia' : `há ${d} dias`;
  };

  const resolverLinks = async (rawText: string) => {
    const links = [...new Set(rawText.split(/\s+/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)))].slice(0, 20);
    if (!links.length) return false;
    setResolvendoLinks(true);
    try {
      const response = await fetch('/api/garimpar/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Falha ao puxar os links.');
      const resultados = Array.isArray(body?.resultados) ? body.resultados : [];
      setLinksResolvidos(resultados.map((r: any) => ({ ...r, selected: r.status === 'ok' || r.status === 'sem_link' })));
      return true;
    } catch {
      setLinksResolvidos([]);
      return false;
    } finally {
      setResolvendoLinks(false);
    }
  };

  const puxarPorLinks = async () => {
    await resolverLinks(linksText);
  };

  const puxarPorLinksMl = async () => {
    const ok = await resolverLinks(mlLinksText);
    if (ok) setMlLinksText('');
  };

  const alternarLinkResolvido = (url: string) => {
    setLinksResolvidos((prev) => prev.map((r) => (r.url === url ? { ...r, selected: !r.selected } : r)));
  };

  const adicionarLinksNaFila = () => {
    const escolhidos = linksResolvidos.filter((r) => r.selected && r.status !== 'erro');
    if (!escolhidos.length) return;
    let adicionados = 0;
    for (const r of escolhidos) {
      const pid = `${r.plataforma || 'link'}-${Math.abs([...r.url].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0))}`;
      const product: Product = {
        id: `link-${pid}-${Date.now()}-${adicionados}`,
        marketplace: (r.plataforma === 'ml' ? 'mercado_livre' : r.plataforma === 'amazon' ? 'amazon' : r.plataforma === 'magalu' ? 'magalu' : 'shopee') as Product['marketplace'],
        marketplaceProductId: pid,
        name: r.title || 'Produto importado por link',
        imageUrl: r.image || '',
        currentPrice: r.price,
        originalPrice: r.priceOld,
        discountPercentage: r.price && r.priceOld && r.priceOld > r.price ? Math.round((1 - r.price / r.priceOld) * 100) : null,
        salesCount: null, salesCountText: null, rating: null, reviewsCount: null,
        category: '', categoryId: null,
        productUrl: r.url, affiliateUrl: r.affiliateUrl || '',
        sellerId: '', sellerName: '', sellerReputation: null,
        isFreeShipping: false, shippingCost: null, stock: null, isFlashSale: false,
        affiliateProvider: 'manual',
        affiliateStatus: r.affiliateUrl ? 'generated' : 'manual_required',
        privateCommission: { percentage: null, estimatedValue: null },
        commissionRate: null, commissionAmount: null, offerScore: null,
        shortDescription: '', highlightPoints: [], fetchedAt: new Date().toISOString(),
      };
      onAddToQueue(product);
      adicionados++;
    }
    setLinksResolvidos((prev) => prev.filter((r) => !(r.selected && r.status !== 'erro')));
    setLinksText('');
  };
  
  const categories = [
    ['casa e cozinha', 'Casa e cozinha'], ['beleza', 'Beleza e autocuidado'], ['organizadores', 'Organização'],
    ['moda feminina barata', 'Moda feminina barata'], ['utilidades domésticas', 'Utilidades do dia a dia'],
    ['maternidade e infantil', 'Maternidade e infantil'], ['cama mesa e banho', 'Cama, mesa e banho'],
    ['banheiro', 'Banheiro'], ['acessórios femininos', 'Acessórios femininos'], ['eletrônicos baratos', 'Eletrônicos baratos'],
  ];
  
  const filters: Array<{ id: FilterType; label: string; icon: React.ReactNode; color: string }> = [
    { id: 'top_sales', label: 'Mais vendidos', icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-500' },
    { id: 'high_commission', label: 'Maior comissão', icon: <DollarSign className="h-3.5 w-3.5" />, color: 'text-amber-600 dark:text-amber-500' },
    { id: 'best_value', label: 'Menor preço', icon: <ArrowDown className="h-3.5 w-3.5" />, color: 'text-blue-600 dark:text-blue-500' },
    { id: 'high_discount', label: 'Com desconto', icon: <Percent className="h-3.5 w-3.5" />, color: 'text-rose-600 dark:text-rose-500' },
    { id: 'trending', label: 'Avaliação', icon: <Star className="h-3.5 w-3.5 fill-current" />, color: 'text-purple-600 dark:text-purple-500' },
    { id: 'nacionais', label: 'Nacionais', icon: <BadgeCheck className="h-3.5 w-3.5" />, color: 'text-teal-600 dark:text-teal-500' },
  ];
  
  const topSearches = ['air fryer', 'fone de ouvido', 'kit organizador', 'potes de cozinha', 'celular'];

  const adicionarOfertasExibidasNaFila = () => {
    const disponiveis = products.filter((product) => product.name?.trim() && product.affiliateUrl);
    disponiveis.forEach(onAddToQueue);
    if (disponiveis.length) showToast('Ofertas adicionadas à fila', `${disponiveis.length} produto(s) desta busca foram enviados para revisão.`, 'success');
  };

  if (selectedPlatform === 'mercado_livre') {
    const mlProviderName = mlProviderLabel === 'afilitools' ? 'AfiliTools' : mlProviderLabel === 'bot_do_afiliado' ? 'Bot do Afiliado' : mlProviderLabel === 'afilimax' ? 'Afilimax' : mlProviderLabel === 'manual' || !mlProviderLabel ? '' : mlProviderLabel;
    return (
      <section className="garimpar-page space-y-5 pb-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="garimpar-eyebrow">DESCOBERTA DE OFERTAS</p>
            <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">Garimpar</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Encontre ofertas e jogue na fila. Escolha a plataforma pra começar.</p>
          </div>
        </div>

        {platformPills}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${mlOk ? 'bg-[var(--success)]' : 'bg-[var(--error)]'}`} />
              <p className="text-sm font-bold text-[var(--text-primary)]">Mercado Livre</p>
              {mlOk === null ? (
                <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">Verificando...</span>
              ) : mlOk ? (
                <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">Conectado</span>
              ) : (
                <span className="rounded-full bg-[var(--error)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--error)]">Desconectado</span>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => (onOpenConfiguracoes || onOpenSettings)()} className="gap-1.5 text-xs">✎ Editar</Button>
          </div>
          <p className={`mt-2 text-xs font-semibold ${extSyncedAt ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>
            {extSyncedAt ? `Extensão sincronizada ${tempoAtras(extSyncedAt)}` : 'Extensão não sincronizada'}
            {mlProviderName ? ` · Afiliado via ${mlProviderName}` : ''}
          </p>
        </div>

        {!extSyncedAt && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Extraia todos os links de uma página de uma vez com a extensão.</p>
            {onOpenExtension && (
              <Button type="button" variant="ghost" size="sm" onClick={onOpenExtension} className="shrink-0 gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">Instalar →</Button>
            )}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm font-bold text-[var(--text-primary)]">Colar links de Mercado Livre</p>
          <textarea
            value={mlLinksText}
            onChange={(e) => setMlLinksText(e.target.value)}
            placeholder="Cole um link por linha"
            rows={4}
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--primary)]"
          />
          <Button onClick={puxarPorLinksMl} disabled={resolvendoLinks || !mlLinksText.trim()} className="mt-2 h-10 gap-2">
            {resolvendoLinks ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>{resolvendoLinks ? 'Gerando…' : 'Gerar links'}</span>
          </Button>
          {linksResolvidos.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[var(--text-secondary)]">Extraídos dos links</p>
                <Button size="sm" disabled={!linksResolvidos.some((r) => r.selected && r.status !== 'erro')} onClick={adicionarLinksNaFila}>
                  Adicionar à fila ({linksResolvidos.filter((r) => r.selected && r.status !== 'erro').length})
                </Button>
              </div>
              {linksResolvidos.map((r) => (
                <div key={r.url} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5">
                  <input type="checkbox" checked={!!r.selected} disabled={r.status === 'erro'} onChange={() => alternarLinkResolvido(r.url)} className="h-4 w-4 shrink-0 accent-[var(--primary)]" />
                  {r.image ? (
                    <img src={r.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--text-secondary)]"><Tag className="h-5 w-5" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--text-primary)]">{r.title || r.url}</p>
                    {r.affiliateUrl ? (
                      <p className="truncate text-[11px] font-semibold text-[var(--success)]">🔗 {r.affiliateUrl}</p>
                    ) : (
                      <p className="truncate text-[11px] text-[var(--text-secondary)]">{r.url}</p>
                    )}
                    <p className="mt-0.5 text-[11px]">
                      <span className="font-black text-[var(--error)]">{r.price != null ? `R$ ${r.price.toFixed(2).replace('.', ',')}` : 'Preço não lido'}</span>
                      {r.status === 'sem_link' && <span className="ml-2 text-[var(--text-secondary)]">Sem link afiliado</span>}
                      {r.status === 'erro' && <span className="ml-2 text-[var(--error)]">{r.erro}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (selectedPlatform !== 'shopee') {
    return (
      <Card className="pressable-card">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <SearchX className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Integração em preparação</h2>
          <p className="mt-2 text-sm text-muted-foreground">Esta plataforma ficará disponível assim que a conexão oficial for configurada.</p>
          <Button onClick={() => onSelectPlatform('shopee')} className="mt-4 w-full sm:w-auto">Voltar para Shopee</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="garimpar-page space-y-5 pb-8">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="garimpar-eyebrow">DESCOBERTA DE OFERTAS</p>
          <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">Garimpar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Encontre ofertas e jogue na fila. Escolha a plataforma pra começar.</p>
        </div>
      </div>

      {platformPills}

      <div className="garimpar-tabs flex gap-1 overflow-x-auto border-b border-border pb-0 scrollbar-thin">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={garimparTab === tab.id ? 'default' : 'ghost'}
            onClick={() => onSelectGarimparTab(tab.id)}
            data-active={garimparTab === tab.id}
            className="garimpar-tab whitespace-nowrap border-b-2 px-3 pb-3 pt-2 text-sm font-bold"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {garimparTab === 'buscar' && (
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="garimpar-search-panel pressable-card">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="text-base font-black text-foreground">Buscar produtos</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Pesquise por produtos, marcas ou nichos (ex.: air fryer)</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Digite o produto que você procura..."
                className="h-12 rounded-xl pl-10 pr-9 text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={searching}
                className="h-12 gap-2 rounded-xl px-5"
              >
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="hidden sm:inline">{searching ? 'Carregando…' : 'Garimpar'}</span>
              </Button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Grid2X2 className="h-4 w-4 text-primary" />
                {products.length} produtos
              </span>
              {products.length > 0 && (
                <Button type="button" size="sm" onClick={adicionarOfertasExibidasNaFila} className="h-8 gap-1.5 text-[11px]">
                  <Plus className="h-3.5 w-3.5" /> Adicionar à fila
                </Button>
              )}
            </div>
          </CardContent>
        </form>
      )}

      {garimparTab === 'categorias' && (
        <Card className="pressable-card">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Escolha uma categoria para buscar ofertas reais:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  variant={activeCategory === id ? 'default' : 'outline'}
                  onClick={() => onSelectCategory(id)}
                  className="h-auto p-2.5 text-left text-sm font-semibold"
                >
                  {label}
                  <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{activeCategory === id ? 'Selecionada' : 'Selecionar'}</span>
                </Button>
              ))}
              <Button
                type="button"
                variant="default"
                onClick={submitSearch}
                disabled={searching || !activeCategory}
                className="col-span-2 h-9 gap-2"
              >
                {searching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>{searching ? 'Carregando…' : 'Garimpar esta categoria'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {garimparTab === 'mais-buscados' && (
        <Card className="pressable-card">
          <CardContent className="p-3">
            <ScrollArea className="flex flex-wrap gap-1">
              {topSearches.map((term) => (
                <Button
                  key={term}
                  type="button"
                  variant="outline"
                  onClick={() => { onSearchChange(term); onSelectGarimparTab('buscar'); }}
                  className="rounded-full px-2.5 py-1.5 text-sm font-bold"
                >
                  🔎 {term}
                </Button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {garimparTab === 'lojas' && (
        <Card className="pressable-card">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Gerencie suas lojas favoritas e selecione uma plataforma acima para continuar.
          </CardContent>
        </Card>
      )}

      {garimparTab === 'links' && (
        <Card className="pressable-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-base font-black text-foreground">Garimpar por links</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Cole os links (um por linha, até 20) — puxo nome, foto, preço e já gero com seu link de afiliado. Depois é só selecionar e jogar na fila.</p>
            <textarea
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder={'https://www.mercadolivre.com.br/...\nhttps://www.amazon.com.br/dp/...'}
              rows={4}
              className="w-full rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-y"
            />
            <Button onClick={puxarPorLinks} disabled={resolvendoLinks || !linksText.trim()} className="mt-2 h-10 gap-2 w-full sm:w-auto">
              {resolvendoLinks ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>{resolvendoLinks ? 'Puxando…' : 'Puxar produtos'}</span>
            </Button>

            {linksResolvidos.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-muted-foreground">Extraídos dos links</p>
                  <Button
                    size="sm"
                    disabled={!linksResolvidos.some((r) => r.selected && r.status !== 'erro')}
                    onClick={adicionarLinksNaFila}
                  >
                    Adicionar à fila ({linksResolvidos.filter((r) => r.selected && r.status !== 'erro').length})
                  </Button>
                </div>
                {linksResolvidos.map((r) => {
                  const desconto = r.price != null && r.priceOld != null && r.priceOld > r.price
                    ? Math.round((1 - r.price / r.priceOld) * 100)
                    : null;
                  return (
                    <div key={r.url} className="flex items-center gap-3 rounded-xl border border-border bg-[var(--surface)] p-2.5">
                      <input
                        type="checkbox"
                        checked={!!r.selected}
                        disabled={r.status === 'erro'}
                        onChange={() => alternarLinkResolvido(r.url)}
                        className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                      />
                      {r.image ? (
                        <img src={r.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Tag className="h-5 w-5" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">{r.title || r.url}</p>
                        {r.affiliateUrl ? (
                          <p className="truncate text-[11px] font-semibold text-[var(--success)]">🔗 {r.affiliateUrl}</p>
                        ) : (
                          <p className="truncate text-[11px] text-muted-foreground">{r.url}</p>
                        )}
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]">
                          {r.priceOld != null && r.price != null && r.priceOld > r.price && (
                            <span className="text-muted-foreground line-through">R$ {r.priceOld.toFixed(2).replace('.', ',')}</span>
                          )}
                          <span className="font-black text-[var(--error)]">
                            {r.price != null ? `R$ ${r.price.toFixed(2).replace('.', ',')}` : 'Preço não lido'}
                          </span>
                          {desconto != null && (
                            <span className="font-black text-[var(--warning)]">-{desconto}%</span>
                          )}
                        </p>
                        {r.status === 'sem_link' && <span className="mt-0.5 block text-[10px] text-muted-foreground">Sem link afiliado{r.erro ? ` — ${r.erro}` : ''}</span>}
                        {r.status === 'conferir' && <span className="mt-0.5 block text-[10px] font-bold text-[var(--warning)]">Confira se é este produto{r.erro ? ` — ${r.erro}` : ''}</span>}
                        {r.status === 'erro' && <span className="mt-0.5 block text-[10px] text-[var(--error)]">{r.erro}</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.affiliateUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Copiar link de afiliado"
                            onClick={() => {
                              void navigator.clipboard?.writeText(r.affiliateUrl);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant={r.selected ? 'default' : 'outline'}
                          size="icon-sm"
                          aria-label="Adicionar à fila"
                          disabled={r.status === 'erro'}
                          onClick={() => {
                            if (!r.selected) alternarLinkResolvido(r.url);
                            setTimeout(() => adicionarLinksNaFila(), 0);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {garimparTab !== 'links' && (<>
      <ScrollArea className="garimpar-filters flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin pb-1 sm:flex-wrap sm:overflow-visible">
        {filters.map((filter) => {
          const button = (
            <Button
              key={filter.id}
              type="button"
              variant={activeFilter === filter.id ? 'default' : 'outline'}
              onClick={() => onSelectFilter(filter.id)}
              data-active={activeFilter === filter.id}
              className="garimpar-filter h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
            >
              <span className={filter.color}>{filter.icon}</span>
              {filter.label}
            </Button>
          );
          return filter.id === 'nacionais' ? (
            <Tooltip key={filter.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent>{NACIONAIS_FILTER_HINT}</TooltipContent>
            </Tooltip>
          ) : button;
        })}
      </ScrollArea>

      <Card className="garimpar-category-panel pressable-card">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Categoria / nicho</h2>
              <p className="text-[10px] text-muted-foreground">Escolha uma categoria para filtrar as ofertas</p>
            </div>
          </div>
          <div className="relative">
            <Select value={activeCategory} onValueChange={onSelectCategory}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <Grid2X2 className="h-4 w-4 shrink-0 text-primary" />
                <SelectValue placeholder={categories.find(([id]) => id === activeCategory)?.[1] || 'Todos os nichos'} />
              </SelectTrigger>
              <SelectContent className="scrollbar-thin max-h-48">
                <SelectItem value="">Todos os nichos</SelectItem>
                {categories.map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div id="produtos" className="garimpar-grid grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 max-[380px]:grid-cols-1">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="animate-pulse p-2">
              <div className="aspect-square rounded-lg bg-muted" />
              <div className="mt-2 h-3 rounded bg-muted w-3/4" />
              <div className="mt-2 h-6 rounded-lg bg-muted w-1/2" />
            </Card>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div id="produtos" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 max-[380px]:grid-cols-1">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onGenerateOffer={onGenerateOffer} onShare={onShare} onAddToQueue={onAddToQueue} onPreview={onPreview} onCopyLink={onCopyLink} compact />
          ))}
        </div>
      ) : null}
      
      <div ref={loadMoreRef} />
      </>)}
    </section>
  );
};

export default GarimparPage;
