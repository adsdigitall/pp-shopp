import React, { useEffect, useRef, useState } from 'react';
import { Product, FilterType, GarimparPlatform, GarimparTab } from '../types/product';
import { ProductCard } from './ProductCard';
import { ChevronDown, Grid2X2, Search, SearchX, SlidersHorizontal, Sparkles, Tag, TrendingUp, RefreshCw, Star, DollarSign, ArrowDown, Percent } from 'lucide-react';

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
    { id: 'amazon', label: 'Amazon', icon: 'a', color: 'from-amber-500 to-amber-600' },
    { id: 'magalu', label: 'Magalu', icon: 'M', color: 'from-purple-500 to-purple-600' },
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
      <section className="card p-5 text-center">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Integração em preparação</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Esta plataforma ficará disponível assim que a conexão oficial for configurada.</p>
        <button type="button" onClick={() => onSelectPlatform('shopee')} className="mt-4 btn-primary">Voltar para Shopee</button>
      </section>
    );
  }

  return (
    <section className="space-y-3 pb-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-tight text-[var(--text-primary)]">Garimpar</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Encontre ofertas e jogue na fila. Escolha a plataforma pra começar.</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            type="button"
            onClick={() => onSelectPlatform(platform.id)}
            className={`pressable flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-bold transition-all duration-200 ${
              selectedPlatform === platform.id
                ? `border-transparent bg-gradient-to-r ${platform.color} text-white shadow-[0_4px_12px_-4px_color-mix(in_srgb,_${platform.color.split(' ')[0].replace('from-', '').replace('to-', '')}_50%,_transparent)]`
                : 'border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--surface-2)]'
            }`}
          >
            <span className="text-base font-black">{platform.icon}</span>
            <span className="hidden sm:inline">{platform.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto border-b border-[var(--border-default)] pb-1 scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectGarimparTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-0.5 pb-1.5 text-sm font-bold transition-colors ${garimparTab === tab.id ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {garimparTab === 'buscar' && (
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Search className="h-5 w-5 text-[var(--brand-primary)]" />
            <h2 className="text-base font-black text-[var(--text-primary)]">Buscar produtos</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Pesquise por produtos, marcas ou nichos (ex.: air fryer)</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Digite o produto que você procura..."
                className="input-field h-10 pl-9 pr-9"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="pressable inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] px-4 text-sm font-bold text-white transition-all hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,_var(--brand-primary)_40%,_transparent)] disabled:cursor-wait disabled:opacity-60"
            >
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">{searching ? 'Carregando…' : 'Garimpar'}</span>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <Grid2X2 className="h-4 w-4 text-[var(--brand-primary)]" />
              {products.length} produtos
            </span>
          </div>
        </form>
      )}

      {garimparTab === 'categorias' && (
        <div className="card p-3">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Escolha uma categoria para buscar ofertas reais:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {categories.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectCategory(id)}
                className={`pressable rounded-lg border p-2.5 text-left text-sm font-semibold transition-all ${activeCategory === id ? 'border-[var(--brand-primary)] bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-sm' : 'border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--surface-2)]'}`}
              >
                {label}
                <span className="mt-0.5 block text-[10px] font-medium text-[var(--text-muted)]">{activeCategory === id ? 'Selecionada' : 'Selecionar'}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={submitSearch}
              disabled={searching || !activeCategory}
              className="pressable col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-sm font-bold text-white transition-all hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,_var(--brand-primary)_40%,_transparent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>{searching ? 'Carregando…' : 'Garimpar esta categoria'}</span>
            </button>
          </div>
        </div>
      )}

      {garimparTab === 'mais-buscados' && (
        <div className="card p-3">
          <div className="flex flex-wrap gap-1">
            {topSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => { onSearchChange(term); onSelectGarimparTab('buscar'); }}
                className="pressable rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-2.5 py-1.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:border-[var(--brand-primary)] hover:bg-[var(--surface-2)] hover:text-[var(--brand-primary)]"
              >
                🔎 {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {garimparTab === 'lojas' && (
        <div className="card p-4 text-center text-sm text-[var(--text-secondary)]">
          Gerencie suas lojas favoritas e selecione uma plataforma acima para continuar.
        </div>
      )}

      <div className="flex flex-wrap gap-1 scrollbar-thin pb-1">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelectFilter(filter.id)}
            className={`pressable inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-all ${activeFilter === filter.id ? `border-transparent bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white shadow-[0_2px_8px_-2px_color-mix(in_srgb,_var(--brand-primary)_30%,_transparent)]` : `border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/50 hover:bg-[var(--surface-2)]`}`}
          >
            <span className={filter.color}>{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>

      <div className="card p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-5 w-5 place-items-center rounded-lg bg-[var(--brand-light)]">
            <Tag className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Categoria / nicho</h2>
            <p className="text-[10px] text-[var(--text-secondary)]">Escolha uma categoria para filtrar as ofertas</p>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setCategoryOpen((value) => !value)}
            className="flex h-10 w-full items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] px-3 text-left text-sm text-[var(--text-primary)] transition-all hover:border-[var(--brand-primary)]/50 hover:bg-[var(--surface-2)]"
          >
            <span className="flex items-center gap-2 truncate">
              <Grid2X2 className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
              {categories.find(([id]) => id === activeCategory)?.[1] || 'Todos os nichos'}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition ${categoryOpen ? 'rotate-180' : ''}`} />
          </button>
          {categoryOpen && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 grid gap-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] p-1.5 shadow-lg scrollbar-thin max-h-48 overflow-y-auto">
              {[['', 'Todos os nichos'], ...categories].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { onSelectCategory(id); setCategoryOpen(false); }}
                  className="pressable rounded px-2.5 py-1.5 text-left text-sm text-[var(--text-primary)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand-primary)]"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div id="produtos" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="animate-pulse card p-2">
              <div className="aspect-square rounded-lg bg-[var(--surface-1)]" />
              <div className="mt-2 h-3 rounded bg-[var(--surface-1)] w-3/4" />
              <div className="mt-2 h-6 rounded-lg bg-[var(--surface-1)] w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div id="produtos" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onGenerateOffer={onGenerateOffer} onShare={onShare} onAddToQueue={onAddToQueue} onPreview={onPreview} onCopyLink={onCopyLink} compact />
          ))}
        </div>
      ) : (
        <div id="produtos" className="card p-6 text-center">
          <SearchX className="mx-auto h-7 w-7 text-[var(--brand-primary)]" />
          <h2 className="mt-2 font-bold text-[var(--text-primary)]">Nenhum produto encontrado</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tente buscar por outro termo ou categoria</p>
        </div>
      )}
      <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center text-[10px] font-semibold text-[var(--text-muted)]">
        {loadingMore ? 'Carregando mais…' : hasNextPage ? 'Role para carregar mais' : 'Fim da lista'}
      </div>
    </section>
  );
};

export default GarimparPage;