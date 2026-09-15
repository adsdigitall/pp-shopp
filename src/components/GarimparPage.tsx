import React, { useEffect, useRef, useState } from 'react';
import { Product, FilterType, GarimparPlatform, GarimparTab, NACIONAIS_FILTER_HINT } from '../types/product';
import { ProductCard } from './ProductCard';
import { Grid2X2, Search, SearchX, Tag, TrendingUp, RefreshCw, Star, DollarSign, ArrowDown, Percent, Copy, Plus, BadgeCheck, Sun, Target, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { Icon3D } from '@/components/ui/Icon3D';

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

  const platforms: Array<{ id: GarimparPlatform; label: string; logo: string }> = [
    { id: 'shopee', label: 'Shopee', logo: '/brand/marketplaces/shopee.png' },
    { id: 'mercado_livre', label: 'Mercado Livre', logo: '/brand/marketplaces/mercado-livre.png' },
    { id: 'amazon', label: 'Amazon', logo: '/brand/marketplaces/amazon.png' },
    { id: 'magalu', label: 'Magalu', logo: '/brand/marketplaces/magalu.png' },
  ];
  
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
  const [resolvendoLinks, setResolvendoLinks] = useState(false);
  const [linksResolvidos, setLinksResolvidos] = useState<LinkResolvido[]>([]);

  const puxarPorLinks = async () => {
    const links = [...new Set(linksText.split(/\s+/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)))].slice(0, 20);
    if (!links.length) return;
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
    } catch {
      setLinksResolvidos([]);
    } finally {
      setResolvendoLinks(false);
    }
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

  const dateLine = (() => {
    const raw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date());
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();
  const activeFilterLabel = filters.find((filter) => filter.id === activeFilter)?.label || 'Relevância';
  const activeCategoryLabel = categories.find(([id]) => id === activeCategory)?.[1] || '';

  // "Boas ofertas hoje" aplica o filtro real de mais vendidos e leva até a lista.
  const showBestOffers = () => {
    onSelectGarimparTab('buscar');
    onSelectFilter('top_sales');
    requestAnimationFrame(() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const filterChips = (
    <div className="garimpar-filters flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
      {filters.map((filter) => {
        const active = activeFilter === filter.id;
        const chip = (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelectFilter(filter.id)}
            aria-pressed={active}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${active ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}
          >
            <span className={filter.color}>{filter.icon}</span>
            {filter.label}
          </button>
        );
        return filter.id === 'nacionais' ? (
          <Tooltip key={filter.id}>
            <TooltipTrigger asChild>{chip}</TooltipTrigger>
            <TooltipContent>{NACIONAIS_FILTER_HINT}</TooltipContent>
          </Tooltip>
        ) : chip;
      })}
    </div>
  );

  return (
    <section className="garimpar-page space-y-5 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Sun className="h-4 w-4" /> {dateLine}</p>
          <h1 className="mt-1.5 text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-title)] sm:text-[34px]">Garimpar</h1>
          <p className="mt-1 text-[15px] text-[var(--text-body)]">Encontre ofertas e jogue na fila. Escolha a plataforma pra começar.</p>
        </div>
        <button type="button" onClick={showBestOffers} className="panel flex items-center gap-4 p-4 text-left transition-colors hover:border-[var(--border-brand)] lg:min-w-[330px]">
          <Icon3D icon={Target} size={56} />
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-[var(--text-title)]">Boas ofertas hoje</span>
            <span className="block text-[13px] text-[var(--text-secondary)]">Ver os mais vendidos agora.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-[var(--text-secondary)]" />
        </button>
      </div>

      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {platforms.map((platform) => {
          const active = selectedPlatform === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => onSelectPlatform(platform.id)}
              aria-pressed={active}
              className={`inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl border px-4 text-[15px] font-semibold transition-colors ${active ? 'border-[var(--border-brand)] bg-[var(--surface-active)] text-[var(--text-title)]' : 'border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]'}`}
            >
              <img src={platform.logo} alt="" className="h-7 w-7 rounded-md object-contain" />
              {platform.label}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => {
          const active = garimparTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectGarimparTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3.5 pb-3 pt-1 text-[15px] transition-colors ${active ? 'border-[var(--brand-500)] font-semibold text-[var(--text-title)]' : 'border-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {garimparTab === 'buscar' && (
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Search className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand-500)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-title)]">Buscar produtos</h2>
              <p className="text-[13px] text-[var(--text-secondary)]">Pesquise por produtos, marcas ou nichos (ex.: air fryer)</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Digite o produto que você procura..."
                className="h-12 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] pl-11 pr-4 text-sm text-[var(--text-title)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]"
              />
            </div>
            <button type="submit" disabled={searching} className="btn-brand inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold sm:px-6">
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">{searching ? 'Carregando…' : 'Garimpar'}</span>
            </button>
          </div>
          <div className="mt-4">{filterChips}</div>
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
      {garimparTab !== 'buscar' && filterChips}

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-3 sm:w-[300px]">
          <Tag className="h-6 w-6 shrink-0 text-[var(--brand-500)]" />
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-title)]">Categoria / nicho</h2>
            <p className="text-xs text-[var(--text-secondary)]">Escolha uma categoria para filtrar as ofertas</p>
          </div>
        </div>
        <Select value={activeCategory} onValueChange={onSelectCategory}>
          <SelectTrigger className="h-11 w-full min-w-0 flex-1 rounded-xl">
            <Grid2X2 className="h-4 w-4 shrink-0 text-[var(--brand-500)]" />
            <SelectValue placeholder={activeCategoryLabel || 'Todas as categorias'} />
          </SelectTrigger>
          <SelectContent className="scrollbar-thin max-h-48">
            <SelectItem value="">Todas as categorias</SelectItem>
            {categories.map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(loading || products.length > 0) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-title)]">
              {loading ? 'Garimpando produtos…' : `${products.length.toLocaleString('pt-BR')} ${products.length === 1 ? 'produto carregado' : 'produtos carregados'}`}
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Ordenados por {activeFilterLabel.toLowerCase()}{activeCategoryLabel ? ` · ${activeCategoryLabel}` : ''}
            </p>
          </div>
          {!loading && products.length > 0 && (
            <button type="button" onClick={adicionarOfertasExibidasNaFila} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3.5 text-[13px] font-semibold text-[var(--text-title)] transition-colors hover:border-[var(--border-brand)]">
              <Plus className="h-4 w-4 text-[var(--brand-500)]" /> Adicionar todos à fila
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div id="produtos" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5 max-[380px]:grid-cols-1">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="panel animate-pulse overflow-hidden">
              <div className="aspect-[4/3] bg-white/[.04]" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 rounded bg-white/[.06]" />
                <div className="h-5 w-1/2 rounded bg-white/[.06]" />
                <div className="h-10 rounded-xl bg-white/[.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div id="produtos" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5 max-[380px]:grid-cols-1">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onGenerateOffer={onGenerateOffer} onShare={onShare} onAddToQueue={onAddToQueue} onPreview={onPreview} onCopyLink={onCopyLink} compact />
          ))}
        </div>
      ) : null}

      {loadingMore && <p className="text-center text-[13px] text-[var(--text-secondary)]">Carregando mais produtos…</p>}
      <div ref={loadMoreRef} />
      </>)}
    </section>
  );
};

export default GarimparPage;
