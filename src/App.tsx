import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, FilterType, AffiliateSettings } from './types/product';
import { productService } from './services/productService';
import { Header } from './components/Header';
import { FilterTabs } from './components/FilterTabs';
import { ProductCard } from './components/ProductCard';
import { OfferPreviewModal } from './components/OfferPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ShoppingBag, SearchX, Zap, TrendingUp } from 'lucide-react';

const DEFAULT_SETTINGS: AffiliateSettings = {
  affiliateTag: 'aff_shopp_vip',
  defaultFormat: 'standard',
  includeHashtags: true,
  showPrivateCommission: true,
};

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('trending');

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Settings & Toasts
  const [settings, setSettings] = useState<AffiliateSettings>(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast handler
  const showToast = useCallback((
    title: string,
    description?: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch products via service
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts(activeFilter, searchQuery);
      setProducts(data);
    } catch (err) {
      showToast('Erro ao carregar produtos', 'Tente novamente mais tarde.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Open Offer Modal
  const handleGenerateOffer = (product: Product) => {
    setSelectedProduct(product);
    setIsOfferModalOpen(true);
  };

  // Stats calculation for active view
  const stats = useMemo(() => {
    const totalCount = products.length;
    const avgCommission =
      totalCount > 0
        ? products.reduce((acc, p) => acc + p.privateCommission.estimatedValue, 0) / totalCount
        : 0;
    const maxDiscount =
      totalCount > 0 ? Math.max(...products.map((p) => p.discountPercentage)) : 0;

    return {
      totalCount,
      avgCommissionFormatted: avgCommission.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
      maxDiscount,
    };
  }, [products]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-12 text-slate-900">
      
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        totalProducts={products.length}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        
        {/* Quick Affiliate Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-orange-50 text-[#EE4D2D] rounded-xl shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Produtos Disponíveis</div>
              <div className="text-base sm:text-lg font-black text-slate-900">{stats.totalCount} no catálogo</div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Média de Ganho / Venda</div>
              <div className="text-base sm:text-lg font-black text-emerald-800">{stats.avgCommissionFormatted}</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 bg-white rounded-2xl border border-amber-100 shadow-xs flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">Maior Desconto</div>
              <div className="text-base sm:text-lg font-black text-amber-900">Até {stats.maxDiscount}% OFF</div>
            </div>
          </div>
        </div>

        {/* Filters and Title */}
        <FilterTabs
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          resultCount={products.length}
        />

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pt-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200 p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-square bg-slate-200 rounded-2xl w-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
                <div className="h-10 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onGenerateOffer={handleGenerateOffer}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-orange-100 text-[#EE4D2D] rounded-2xl flex items-center justify-center mx-auto">
              <SearchX className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Nenhum produto encontrado</h3>
              <p className="text-xs text-slate-500">
                Não encontramos ofertas para "{searchQuery}". Tente usar palavras-chave mais genéricas.
              </p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-[#EE4D2D] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Limpar busca
            </button>
          </div>
        )}

      </main>

      {/* Offer Preview Modal (Guaranteed No Commission Leak) */}
      <OfferPreviewModal
        product={selectedProduct}
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onShowToast={showToast}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Mobile Native-Feel Bottom Navigation */}
      <MobileBottomNav
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

    </div>
  );
}

export default App;
