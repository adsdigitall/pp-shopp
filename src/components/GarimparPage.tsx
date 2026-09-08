import React, { useEffect, useRef, useState } from 'react';
import { Product, FilterType, GarimparPlatform, GarimparTab } from '../types/product';
import { ProductCard } from './ProductCard';
import { ChevronDown, Grid2X2, Search, SearchX, SlidersHorizontal, Sparkles, Tag, TrendingUp, RefreshCw, Star, DollarSign, ArrowDown, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';

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
  garimparTab, onSelectGarimparTab, onAddToQueue, onGenerateOffer, onShare, onPreview, onCopyLink,
}) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
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
  
  const tabs: Array<{ id: GarimparTab; label: string }> = [
    { id: 'buscar', label: 'Buscar' }, { id: 'categorias', label: 'Categorias' }, { id: 'mais-buscados', label: 'Mais buscados' }, { id: 'lojas', label: 'Lojas' },
  ];
  
  const categories = [
    ['eletrônicos', 'Eletrônicos'], ['moda feminina', 'Moda feminina'], ['casa e banho', 'Casa, cozinha e banho'],
    ['infantil', 'Infantil e crianças'], ['beleza', 'Beleza'], ['acessórios', 'Acessórios'], ['celular', 'Celulares e informática'],
  ];
  
  const filters: Array<{ id: FilterType; label: string; icon: React.ReactNode; color: string }> = [
    { id: 'top_sales', label: 'Mais vendidos', icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-emerald-600 dark:text-emerald-500' },
    { id: 'high_commission', label: 'Maior comissão', icon: <DollarSign className="h-3.5 w-3.5" />, color: 'text-amber-600 dark:text-amber-500' },
    { id: 'best_value', label: 'Menor preço', icon: <ArrowDown className="h-3.5 w-3.5" />, color: 'text-blue-600 dark:text-blue-500' },
    { id: 'high_discount', label: 'Com desconto', icon: <Percent className="h-3.5 w-3.5" />, color: 'text-rose-600 dark:text-rose-500' },
    { id: 'trending', label: 'Avaliação', icon: <Star className="h-3.5 w-3.5 fill-current" />, color: 'text-purple-600 dark:text-purple-500' },
  ];
  
  const topSearches = ['air fryer', 'fone de ouvido', 'kit organizador', 'potes de cozinha', 'celular'];

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
    <section className="space-y-4 pb-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-tight text-foreground">Garimpar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Encontre ofertas e jogue na fila. Escolha a plataforma pra começar.</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {platforms.map((platform) => (
          <Button
            key={platform.id}
            type="button"
            variant={selectedPlatform === platform.id ? 'default' : 'outline'}
            onClick={() => onSelectPlatform(platform.id)}
            className="h-10 shrink-0 gap-1.5 rounded-lg px-2.5 text-sm font-bold transition-all"
          >
            <span className="text-base font-black">{platform.icon}</span>
            <span className="hidden sm:inline">{platform.label}</span>
          </Button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border pb-1 scrollbar-thin">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={garimparTab === tab.id ? 'default' : 'ghost'}
            onClick={() => onSelectGarimparTab(tab.id)}
            className="whitespace-nowrap border-b-2 px-0.5 pb-1.5 text-sm font-bold"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {garimparTab === 'buscar' && (
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="pressable-card">
          <CardContent className="p-4">
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
                  className="h-10 pl-9 pr-9"
                />
              </div>
              <Button
                type="submit"
                disabled={searching}
                className="h-10 gap-2"
              >
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="hidden sm:inline">{searching ? 'Carregando…' : 'Garimpar'}</span>
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Grid2X2 className="h-4 w-4 text-primary" />
                {products.length} produtos
              </span>
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

      <ScrollArea className="flex flex-wrap gap-1 scrollbar-thin pb-1">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            variant={activeFilter === filter.id ? 'default' : 'outline'}
            onClick={() => onSelectFilter(filter.id)}
            className="h-9 gap-1.5 rounded-lg px-3 text-sm font-semibold"
          >
            <span className={filter.color}>{filter.icon}</span>
            {filter.label}
          </Button>
        ))}
      </ScrollArea>

      <Card className="pressable-card">
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
              <SelectTrigger className="h-10 w-full">
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
        <div id="produtos" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="animate-pulse p-2">
              <div className="aspect-square rounded-lg bg-muted" />
              <div className="mt-2 h-3 rounded bg-muted w-3/4" />
              <div className="mt-2 h-6 rounded-lg bg-muted w-1/2" />
            </Card>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div id="produtos" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onGenerateOffer={onGenerateOffer} onShare={onShare} onAddToQueue={onAddToQueue} onPreview={onPreview} onCopyLink={onCopyLink} compact />
          ))}
        </div>
      ) : (
        <Card id="produtos" className="pressable-card">
          <CardContent className="p-6 text-center">
            <SearchX className="mx-auto h-7 w-7 text-primary" />
            <h2 className="mt-2 font-bold text-foreground">Nenhum produto encontrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tente buscar por outro termo ou categoria</p>
          </CardContent>
        </Card>
      )}
      
      <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center text-[10px] font-semibold text-muted-foreground">
        {loadingMore ? 'Carregando mais…' : hasNextPage ? 'Role para carregar mais' : 'Fim da lista'}
      </div>
    </section>
  );
};

export default GarimparPage;