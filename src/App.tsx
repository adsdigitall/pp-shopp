import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, FilterType, AffiliateSettings } from './types/product';
import { productService } from './services/productService';
import { Header } from './components/Header';
import { HowItWorks } from './components/HowItWorks';
import { FilterTabs } from './components/FilterTabs';
import { ProductCard } from './components/ProductCard';
import { GroupsShortcutCard } from './components/GroupsShortcutCard';
import { OfferPreviewModal } from './components/OfferPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { GroupsModal } from './components/GroupsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { MobileBottomNav, MainNavTab } from './components/MobileBottomNav';
import { SearchX } from 'lucide-react';

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
  const [activeNav, setActiveNav] = useState<MainNavTab>('home');

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);

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

  // Nav handler from bottom bar
  const handleSelectNav = (nav: MainNavTab) => {
    setActiveNav(nav);
    if (nav === 'groups') {
      setIsGroupsModalOpen(true);
    } else if (nav === 'config') {
      setIsSettingsModalOpen(true);
    } else if (nav === 'products') {
      // scroll to products or switch focus
      window.scrollTo({ top: 280, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 sm:pb-16 text-slate-900 font-sans">
      
      {/* Top Header matching reference (ShopLink Afiliados) */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5 sm:space-y-6">
        
        {/* Step 1: Como Funciona (Interactive stepper matching reference) */}
        {!searchQuery && <HowItWorks />}

        {/* Step 2: Produtos em alta (Title + Filters) */}
        <FilterTabs
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          resultCount={products.length}
        />

        {/* Step 3: Product Grid (2 columns on mobile, 3-4 on desktop/notebook) */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-3 sm:p-4 space-y-3 animate-pulse border border-slate-100"
              >
                <div className="aspect-square bg-slate-200 rounded-2xl w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
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
          <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 bg-orange-100 text-[#EE4D2D] rounded-2xl flex items-center justify-center mx-auto">
              <SearchX className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Nenhum produto encontrado</h3>
              <p className="text-xs text-slate-500">
                Não encontramos ofertas para "{searchQuery}".
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

        {/* Step 4: Seus Grupos (Card widget matching bottom section in reference) */}
        <GroupsShortcutCard onOpenGroups={() => setIsGroupsModalOpen(true)} />

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

      {/* Groups Modal */}
      <GroupsModal
        isOpen={isGroupsModalOpen}
        onClose={() => setIsGroupsModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Mobile Native-Feel Bottom Navigation (Matching reference: Início, Produtos, Grupos, Config) */}
      <MobileBottomNav
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
      />

    </div>
  );
}

export default App;
