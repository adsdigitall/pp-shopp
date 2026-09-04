import React, { useState, useEffect, useCallback } from 'react';
import { Product, FilterType } from '../types/product';
import { Search, Filter, Zap, Tag, DollarSign, Truck, Star, ExternalLink, RefreshCw, Clock, Brain, Layers3 } from 'lucide-react';

interface MercadoLivreSearchProps {
  onProductSelect: (product: Product) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const ML_FILTERS = [
  { id: 'relevance', label: 'Relevância', icon: Search },
  { id: 'discount', label: 'Maior Desconto', icon: Tag },
  { id: 'price_asc', label: 'Menor Preço', icon: DollarSign },
  { id: 'price_desc', label: 'Maior Preço', icon: DollarSign },
];

const ML_CATEGORIES = [
  { id: '', label: 'Todas as categorias' },
  { id: 'MLB1051', label: 'Celulares e Telefones' },
  { id: 'MLB1055', label: 'Informática' },
  { id: 'MLB1246', label: 'Eletrodomésticos' },
  { id: 'MLB1196', label: 'Casa e Decoração' },
  { id: 'MLB1403', label: 'Beleza e Perfumaria' },
  { id: 'MLB1132', label: 'Moda' },
  { id: 'MLB1743', label: 'Esportes e Fitness' },
  { id: 'MLB1168', label: 'Brinquedos e Hobbies' },
  { id: 'MLB1953', label: 'Automotivo' },
  { id: 'MLB1430', label: 'Ferramentas e Construção' },
];

export const MercadoLivreSearch: React.FC<MercadoLivreSearchProps> = ({
  onProductSelect,
  onShowToast,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState({
    keyword: '',
    categoryId: '',
    minPrice: '',
    maxPrice: '',
    minDiscount: '',
    sellerId: '',
    productId: '',
    productUrl: '',
    sortBy: 'relevance' as string,
  });

  const [autoSearch, setAutoSearch] = useState({
    isActive: false,
    name: '',
    minOfferScore: 7.0,
    cooldownHours: 24,
    targetChannels: [] as string[],
    schedule: '*/30 * * * *',
    maxResultsPerRun: 5,
  });

  const [autoSearchConfigs, setAutoSearchConfigs] = useState<any[]>([]);
  const [showAutoSearchModal, setShowAutoSearchModal] = useState(false);
  const [editingAutoSearch, setEditingAutoSearch] = useState<any | null>(null);

  const fetchProducts = useCallback(async (silent = false, page = 1) => {
    if (!silent) setLoading(true);
    setCurrentPage(page);
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          params.set(key, String(value));
        }
      });
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/mercadolivre/products?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Erro ao buscar produtos');
      }

      const newProducts = data.products || [];
      
      if (page === 1) {
        setProducts(newProducts);
      } else {
        setProducts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...newProducts.filter((p: Product) => !ids.has(p.id))];
        });
      }
      
      setHasNextPage(data.meta?.hasNextPage || false);
    } catch (err) {
      if (!silent) {
        onShowToast('Erro ao carregar', err instanceof Error ? err.message : 'Tente novamente', 'error');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, onShowToast]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    await fetchProducts(true, currentPage + 1);
  }, [loading, loadingMore, hasNextPage, currentPage, fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreProducts();
    }, { rootMargin: '500px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreProducts]);

  const fetchAutoSearchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/mercadolivre/auto-search');
      const data = await res.json();
      setAutoSearchConfigs(data.configs || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchAutoSearchConfigs();
  }, [fetchAutoSearchConfigs]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchProducts();
  };

  const handleClearFilters = () => {
    setFilters({
      keyword: '',
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      minDiscount: '',
      sellerId: '',
      productId: '',
      productUrl: '',
      sortBy: 'relevance',
    });
    setCurrentPage(1);
    fetchProducts();
  };

  const handleSaveAutoSearch = async () => {
    try {
      const config = editingAutoSearch ? { ...autoSearch, id: editingAutoSearch.id } : autoSearch;
      const res = await fetch('/api/mercadolivre/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        onShowToast('Busca automática salva!', 'A busca será executada conforme agendado.', 'success');
        setShowAutoSearchModal(false);
        setEditingAutoSearch(null);
        setAutoSearch({
          isActive: false,
          name: '',
          minOfferScore: 7.0,
          cooldownHours: 24,
          targetChannels: [],
          schedule: '*/30 * * * *',
          maxResultsPerRun: 5,
        });
        fetchAutoSearchConfigs();
      }
    } catch {
      onShowToast('Erro', 'Não foi possível salvar.', 'error');
    }
  };

  const handleDeleteAutoSearch = async (id: string) => {
    try {
      await fetch(`/api/mercadolivre/auto-search/${id}`, { method: 'DELETE' });
      fetchAutoSearchConfigs();
      onShowToast('Removido', 'Busca automática excluída.', 'success');
    } catch {
      onShowToast('Erro', 'Não foi possível excluir.', 'error');
    }
  };

  const handleEditAutoSearch = (config: any) => {
    setEditingAutoSearch(config);
    setAutoSearch({
      name: config.name,
      filters: config.filters,
      minOfferScore: config.minOfferScore,
      cooldownHours: config.cooldownHours,
      targetChannels: config.targetChannels,
      schedule: config.schedule,
      maxResultsPerRun: config.maxResultsPerRun,
      isActive: config.isActive,
    });
    setShowAutoSearchModal(true);
  };

  const handleGenerateAffiliateLink = async (product: Product) => {
    try {
      onShowToast('Gerando link...', 'Aguarde um momento', 'info');
      const res = await fetch('/api/mercadolivre/affiliate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.marketplaceProductId, originalUrl: product.productUrl }),
      });
      const data = await res.json();
      
      if (data.affiliateUrl && data.affiliateUrl !== product.productUrl) {
        const updatedProduct = { ...product, affiliateUrl: data.affiliateUrl, affiliateStatus: data.status };
        onShowToast('Link gerado!', `Provedor: ${data.provider}`, 'success');
        onProductSelect(updatedProduct);
      } else if (data.needsAffiliateGeneration) {
        onShowToast('Configuração necessária', 'Configure um provedor de afiliado nas Configurações', 'info');
        onProductSelect(product);
      } else {
        onProductSelect(product);
      }
    } catch {
      onShowToast('Erro', 'Não foi possível gerar link afiliado', 'error');
      onProductSelect(product);
    }
  };

  const hasActiveFilters = filters.keyword || filters.categoryId || filters.minPrice || filters.maxPrice || filters.minDiscount;

  return (
    <div className="space-y-4">
      {/* Header with marketplace indicator */}
      <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
        <div className="p-2 bg-yellow-100 text-yellow-700 rounded-xl">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-slate-900">Mercado Livre - Radar de Ofertas</h3>
          <p className="text-xs text-slate-500">
            Busque produtos, filtre ofertas e gere links de afiliado
          </p>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-bold bg-yellow-100 text-yellow-700 rounded-full">
          {products.length} ofertas
        </span>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Keyword Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por palavra-chave, nome do produto..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
          />
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <select
            value={filters.categoryId}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
          >
            {ML_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <input
            type="number"
            step="0.01"
            placeholder="Preço mínimo"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Preço máximo"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
          />

          <input
            type="number"
            placeholder="Desconto mínimo %"
            value={filters.minDiscount}
            onChange={(e) => handleFilterChange('minDiscount', e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
          />

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
          >
            {ML_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 sm:flex-none py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Limpar filtros
            </button>
          )}

          <button
            onClick={() => { setShowAutoSearchModal(true); setEditingAutoSearch(null); }}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span>Busca Auto</span>
          </button>
        </div>
      </div>

      {/* Auto Search Configs */}
      {autoSearchConfigs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Buscas Automáticas Ativas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoSearchConfigs.map((config) => (
              <div key={config.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs">
                <span className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className="font-medium text-blue-800">{config.name}</span>
                <span className="text-slate-500">Score ≥ {config.minOfferScore}</span>
                <span className="text-slate-500">Cooldown: {config.cooldownHours}h</span>
                <button
                  onClick={() => handleEditAutoSearch(config)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Editar"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDeleteAutoSearch(config.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Excluir"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white rounded-3xl p-3.5 space-y-3 animate-pulse border border-slate-100">
              <div className="aspect-square bg-slate-200 rounded-2xl w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {products.map((product) => (
            <MLProductCard
              key={product.id}
              product={product}
              onSelect={() => handleGenerateAffiliateLink(product)}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Nenhum produto encontrado</h3>
            <p className="text-xs text-slate-500">
              Ajuste os filtros ou tente outra busca
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-yellow-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center text-xs font-semibold text-slate-500">
        {loadingMore ? 'Carregando mais ofertas...' : hasNextPage ? 'Role para carregar mais' : 'Fim da lista'}
      </div>

      {/* Auto Search Modal */}
      {showAutoSearchModal && (
        <AutoSearchModal
          config={autoSearch}
          onChange={setAutoSearch}
          onSave={handleSaveAutoSearch}
          onClose={() => { setShowAutoSearchModal(false); setEditingAutoSearch(null); }}
          isEditing={!!editingAutoSearch}
        />
      )}
    </div>
  );
};

// Sub-component for Product Card
const MLProductCard: React.FC<{
  product: Product;
  onSelect: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}> = ({ product, onSelect, onShowToast }) => {
  const currentPriceFormatted = product.currentPrice !== null
    ? product.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Confira no link';

  const originalPriceFormatted = product.originalPrice !== null
    ? product.originalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  const discount = product.discountPercentage ?? 0;

  return (
    <div className="group bg-white/80 backdrop-blur-md rounded-3xl p-3.5 border border-white/80 shadow-sm hover:shadow-xl hover:shadow-yellow-500/10 hover:border-yellow-200 transition-all duration-300 flex flex-col justify-between">
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-50 rounded-2xl overflow-hidden mb-3 border border-slate-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-yellow-600 text-white shadow-md">
            {discount}% OFF
          </span>
        </div>

        {/* Free Shipping Tag */}
        {product.isFreeShipping && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/90 text-white flex items-center gap-1 shadow-xs">
              <Truck className="w-3 h-3" />
              Frete Grátis
            </span>
          </div>
        )}

        {/* Offer Score Badge */}
        {product.offerScore !== null && (
          <div className="absolute top-2.5 right-2.5">
            <span className={`px-2 py-1 rounded-xl text-[10px] font-black shadow-md ${
              product.offerScore >= 8.5 ? 'bg-emerald-600 text-white' :
              product.offerScore >= 7 ? 'bg-blue-600 text-white' :
              'bg-slate-600 text-white'
            }`}>
              Score: {product.offerScore}/10
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-slate-500 font-medium truncate max-w-[120px]">
              {product.category || 'Mercado Livre'}
            </span>
            <div className="flex items-center gap-0.5 text-amber-500 font-semibold">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>{product.rating ? product.rating.toFixed(1) : '—'}</span>
            </div>
          </div>

          <h3 className="font-extrabold text-slate-900 text-xs leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-yellow-600 transition-colors" title={product.name}>
            {product.name}
          </h3>
        </div>

        {/* Price Section */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 line-through">
              {originalPriceFormatted || 'Preço promocional'}
            </span>
            {originalPriceFormatted && product.currentPrice !== null && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                Economize {(product.originalPrice! - product.currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </div>
          <div className="text-base font-black text-yellow-600 tracking-tight">
            {currentPriceFormatted}
          </div>
        </div>

        {/* Seller Info */}
        {product.sellerName && (
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Vendido por:</span>
            <span className="font-medium text-slate-700 truncate">{product.sellerName}</span>
            {product.sellerReputation !== null && (
              <span className="text-emerald-600 font-bold">● {Math.round(product.sellerReputation * 100)}%</span>
            )}
          </div>
        )}

        {/* Primary Action */}
        <div className="pt-1 space-y-1.5">
          <button
            onClick={onSelect}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 active:scale-[0.98] text-white text-xs font-black rounded-2xl shadow-md shadow-yellow-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Gerar Link Afiliado</span>
          </button>

          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <span>Ver no Mercado Livre</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

// Auto Search Modal Component
const AutoSearchModal: React.FC<{
  config: any;
  onChange: (config: any) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
}> = ({ config, onChange, onSave, onClose, isEditing }) => {
  const handleFilterChange = (key: string, value: any) => {
    onChange(prev => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="font-extrabold text-base text-slate-900">{isEditing ? 'Editar' : 'Nova'} Busca Automática</h2>
            <p className="text-xs text-slate-500">Configure busca periódica de ofertas no Mercado Livre</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome da Busca</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              placeholder="Ex: Casa e Cozinha - Desconto 25%+"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Filtros da Busca</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={config.filters?.categoryId || ''}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
              >
                <option value="">Todas categorias</option>
                {ML_CATEGORIES.slice(1).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input
                type="number" step="0.01" placeholder="Preço máx (R$)"
                value={config.filters?.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number" placeholder="Desconto mín %"
                value={config.filters?.minDiscount || ''}
                onChange={(e) => handleFilterChange('minDiscount', e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
              />
              <select
                value={config.filters?.sortBy || 'relevance'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none"
              >
                <option value="relevance">Relevância</option>
                <option value="discount">Maior Desconto</option>
                <option value="price_asc">Menor Preço</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Score Mínimo</label>
              <input
                type="number" step="0.1" min="0" max="10"
                value={config.minOfferScore}
                onChange={(e) => onChange({ ...config, minOfferScore: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none font-medium"
              />
              <p className="text-[11px] text-slate-500">Só divulga ofertas acima deste score</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Cooldown (horas)</label>
              <input
                type="number" min="1" max="168"
                value={config.cooldownHours}
                onChange={(e) => onChange({ ...config, cooldownHours: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none font-medium"
              />
              <p className="text-[11px] text-slate-500">Não repetir mesmo produto</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Agendamento (Cron)</label>
            <input
              type="text"
              value={config.schedule}
              onChange={(e) => onChange({ ...config, schedule: e.target.value })}
              placeholder="*/30 * * * * (a cada 30 min)"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-yellow-400 outline-none font-mono"
            />
            <p className="text-[11px] text-slate-500">Formato cron: min hora dia mês dia_semana</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Ativar busca automática</span>
              <span className="text-[11px] text-slate-500">Executa automaticamente conforme agendamento</span>
            </div>
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => onChange({ ...config, isActive: e.target.checked })}
              className="w-5 h-5 text-yellow-600 rounded border-slate-300 focus:ring-yellow-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="flex-1 px-5 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-yellow-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Atualizar' : 'Criar busca'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useRef } from 'react';
import { ShoppingBag, Settings, X, Save } from 'lucide-react';