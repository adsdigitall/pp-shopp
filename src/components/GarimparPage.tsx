import React, { useEffect, useRef, useState } from 'react';
import { Product, FilterType, GarimparPlatform, GarimparTab } from '../types/product';
import { ProductCard } from './ProductCard';
import { ChevronDown, ChevronRight, Flame, Grid2X2, Search, SearchX, SlidersHorizontal, Sparkles, Tag, TrendingUp, RefreshCw, Star, DollarSign, ArrowDown, Percent } from 'lucide-react';

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
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) onLoadMore(); }, { rootMargin: '500px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore]);

  const platforms: Array<{ id: GarimparPlatform; label: string; icon: string; disabled?: boolean }> = [
    { id: 'shopee', label: 'Shopee', icon: '🛍️' },
    { id: 'mercado_livre', label: 'Mercado Livre', icon: '🤝' },
    { id: 'amazon', label: 'Amazon', icon: 'a' },
    { id: 'magalu', label: 'Magalu', icon: 'M' },
  ];
  const tabs: Array<{ id: GarimparTab; label: string }> = [
    { id: 'buscar', label: 'Buscar' }, { id: 'categorias', label: 'Categorias' }, { id: 'mais-buscados', label: 'Mais buscados' }, { id: 'lojas', label: 'Lojas' },
  ];
  const categories = [
    ['eletrônicos', '💻 Eletrônicos'], ['moda feminina', '👗 Moda feminina'], ['casa e banho', '🏠 Casa, cozinha e banho'],
    ['infantil', '🧸 Infantil e crianças'], ['beleza', '💄 Beleza'], ['acessórios', '👜 Acessórios'], ['celular', '📱 Celulares e informática'],
  ];
  const filters: Array<{ id: FilterType; label: string; icon: React.ReactNode }> = [
    { id: 'top_sales', label: 'Mais vendidos', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'high_commission', label: 'Maior comissão', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'best_value', label: 'Menor preço', icon: <ArrowDown className="h-4 w-4" /> },
    { id: 'high_discount', label: 'Com desconto', icon: <Percent className="h-4 w-4" /> },
    { id: 'trending', label: 'Avaliação', icon: <Star className="h-4 w-4 fill-current" /> },
  ];
  const topSearches = ['air fryer', 'fone de ouvido', 'kit organizador', 'potes de cozinha', 'celular'];

  if (selectedPlatform !== 'shopee') {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Integração em preparação</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Esta plataforma ficará disponível assim que a conexão oficial for configurada.</p>
        <button type="button" onClick={() => onSelectPlatform('shopee')} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white">Voltar para Shopee</button>
      </section>
    );
  }

  return (
    <section className="space-y-3 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black leading-tight text-[var(--text-primary)]">Garimpar</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Encontre ofertas e jogue na fila. Escolha a plataforma pra começar.</p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-right text-sm text-[var(--text-secondary)]">
          <Sparkles className="h-5 w-5 text-[var(--primary)]" />
          <span>Produtos brasileiros<br />por padrão</span>
          <span className="text-lg">🇧🇷</span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            type="button"
            onClick={() => onSelectPlatform(platform.id)}
            className={`
              pressable flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition sm:min-w-[150px]
              ${selectedPlatform === platform.id
                ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--primary)]'
              }
            `}
          >
            <span className="text-xl font-black">{platform.icon}</span>
            <span>{platform.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-5 overflow-x-auto border-b border-[var(--border)] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectGarimparTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-0.5 pb-2 text-sm font-bold ${garimparTab === tab.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-secondary)]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {garimparTab === 'buscar' && (
        <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2"><Search className="h-6 w-6 text-[var(--primary)]" /><h2 className="text-lg font-extrabold text-[var(--text-primary)]">Buscar produtos</h2></div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Pesquise por produtos, marcas ou nichos (ex.: air fryer)</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Digite o produto que você procura..."
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="pressable inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-extrabold text-white hover:bg-[var(--primary-hover)] disabled:cursor-wait disabled:opacity-80"
            >
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-5 w-5" />}
              {searching ? 'Carregando…' : 'Garimpar'}
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-bold text-[var(--text-primary)]"><Grid2X2 className="h-5 w-5 text-[var(--primary)]" /> {products.length || 12} produtos</span>
            <span className="hidden text-[var(--text-secondary)] sm:block">Encontre as melhores ofertas e aumente seus ganhos!</span>
          </div>
        </form>
      )}

      {garimparTab === 'categorias' && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="col-span-full text-sm font-semibold text-[var(--text-secondary)]">Escolha uma categoria para buscar ofertas reais:</p>
          {categories.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectCategory(id)}
              className={`pressable rounded-lg border p-3 text-left text-sm font-bold ${activeCategory === id ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'}`}
            >
              {label}
              <span className="mt-1 block text-xs font-medium text-[var(--text-secondary)]">{activeCategory === id ? 'Selecionada ✓' : 'Selecionar'}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={submitSearch}
            disabled={searching || !activeCategory}
            className="pressable col-span-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {searching ? 'Carregando…' : 'Garimpar esta categoria'}
          </button>
        </div>
      )}

      {garimparTab === 'mais-buscados' && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          {topSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => { onSearchChange(term); onSelectGarimparTab('buscar'); }}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--primary)]"
            >
              🔎 {term}
            </button>
          ))}
        </div>
      )}

      {garimparTab === 'lojas' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">Gerencie suas lojas favoritas e selecione uma plataforma acima para continuar.</div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onSelectFilter(filter.id)}
            className={`pressable inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-bold ${activeFilter === filter.id ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--primary)]'}`}
          >
            {filter.icon}{filter.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2"><Tag className="h-6 w-6 text-[var(--primary)]" /><div><h2 className="text-lg font-extrabold text-[var(--text-primary)]">Categoria / nicho</h2><p className="mt-0.5 text-sm text-[var(--text-secondary)]">Escolha uma categoria para filtrar as ofertas</p></div></div>
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setCategoryOpen((value) => !value)}
            className="flex h-11 w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-left text-sm text-[var(--text-primary)]"
          >
            <span className="flex items-center gap-3"><Grid2X2 className="h-5 w-5" />{categories.find(([id]) => id === activeCategory)?.[1] || 'Todos os nichos'}</span>
            <ChevronDown className={`h-5 w-5 transition ${categoryOpen ? 'rotate-180' : ''}`} />
          </button>
          {categoryOpen && (
            <div className="absolute inset-x-0 top-[50px] z-20 grid gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-xl">
              {[['', 'Todos os nichos'], ...categories].map(([id, label]) => (
                <button key={id} type="button" onClick={() => { onSelectCategory(id); setCategoryOpen(false); }} className="rounded px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--primary)]/15">{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div id="produtos" className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
              <div className="aspect-square rounded-lg bg-[var(--surface-elevated)]" />
              <div className="mt-2 h-3 rounded bg-[var(--surface-elevated)]" />
              <div className="mt-2 h-8 rounded-xl bg-[var(--surface-elevated)]" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div id="produtos" className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onGenerateOffer={onGenerateOffer} onShare={onShare} onAddToQueue={onAddToQueue} onPreview={onPreview} onCopyLink={onCopyLink} compact />
          ))}
        </div>
      ) : (
        <div id="produtos" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-8 text-center">
          <SearchX className="mx-auto h-8 w-8 text-[var(--primary)]" />
          <h2 className="mt-2 font-bold text-[var(--text-primary)]">Nenhum produto encontrado</h2>
        </div>
      )}
      <div ref={loadMoreRef} className="flex min-h-10 items-center justify-center text-[10px] font-semibold text-[var(--text-secondary)]">{loadingMore ? 'Carregando mais…' : hasNextPage ? 'Role para carregar mais' : 'Você chegou ao fim desta lista'}</div>
    </section>
  );
};

export default GarimparPage;