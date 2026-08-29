import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { SearchX, Layers3 } from 'lucide-react';

const DEFAULT_SETTINGS: AffiliateSettings = {
  affiliateTag: 'aff_shopp_vip',
  defaultFormat: 'standard',
  includeHashtags: true,
  showPrivateCommission: true,
  theme: 'light',
};

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('trending');
  const [activeNav, setActiveNav] = useState<MainNavTab>('home');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const seenSalesRef = useRef<Set<string>>(new Set());

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);

  // Settings & Toasts
  const [settings, setSettings] = useState<AffiliateSettings>(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.body.classList.toggle('app-dark', settings.theme === 'dark');
    return () => document.body.classList.remove('app-dark');
  }, [settings.theme]);

  const enableSaleNotifications = useCallback(async () => {
    if (!('Notification' in window)) { showToast('Notificações não suportadas neste navegador', undefined, 'error'); return; }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    showToast(permission === 'granted' ? 'Notificações de vendas ativadas' : 'Permissão de notificações não concedida', undefined, permission === 'granted' ? 'success' : 'info');
  }, [showToast]);

  useEffect(() => {
    const checkSales = async () => {
      try {
        const response = await fetch('/api/sales?hours=168');
        if (!response.ok) return;
        const body = await response.json();
        const sales = Array.isArray(body.sales) ? body.sales : [];
        for (const sale of sales) {
          const id = String(sale.conversionId || sale.checkoutId || '');
          if (!id || seenSalesRef.current.has(id)) continue;
          seenSalesRef.current.add(id);
          if (notificationsEnabled && Notification.permission === 'granted') {
            new Notification('Nova venda Shopee', { body: `Comissão registrada: R$ ${sale.netCommission || sale.totalCommission || '—'}` });
          }
        }
      } catch { /* falha silenciosa para não interromper o app */ }
    };
    checkSales();
    const intervalId = window.setInterval(checkSales, 120_000);
    return () => window.clearInterval(intervalId);
  }, [notificationsEnabled]);

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
  const loadProducts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const combinedQuery = [activeCategory, searchQuery].filter(Boolean).join(' ');
      const result = await productService.getProductsPage(activeFilter, combinedQuery, 1);
      setProducts(result.products);
      setHasNextPage(result.hasNextPage);
      setCurrentPage(1);
    } catch (err) {
      if (!silent) {
        showToast('Erro ao carregar produtos', 'Tente novamente mais tarde.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeCategory, searchQuery, showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const combinedQuery = [activeCategory, searchQuery].filter(Boolean).join(' ');
      const nextPage = currentPage + 1;
      const result = await productService.getProductsPage(activeFilter, combinedQuery, nextPage);
      setProducts((current) => {
        const ids = new Set(current.map((product) => product.id));
        return [...current, ...result.products.filter((product) => !ids.has(product.id))];
      });
      setHasNextPage(result.hasNextPage);
      setCurrentPage(nextPage);
    } catch {
      showToast('Não foi possível carregar mais ofertas', 'Tente novamente em instantes.', 'error');
    } finally {
      setLoadingMore(false);
    }
  }, [activeFilter, activeCategory, searchQuery, hasNextPage, loading, loadingMore, currentPage, showToast]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreProducts();
    }, { rootMargin: '500px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreProducts]);

  // Atualiza ofertas a cada 2 minutos sem interromper a navegação do usuário.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadProducts(true);
    };
    const intervalId = window.setInterval(refresh, 120_000);
    return () => window.clearInterval(intervalId);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_42%,#eef2ff_100%)] flex flex-col pb-24 sm:pb-16 text-slate-900 font-sans">
      
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
        {!searchQuery && <HowItWorks onStepClick={(step) => {
          if (step <= 2) window.scrollTo({ top: 280, behavior: 'smooth' });
          if (step === 3) showToast('Escolha um produto para compartilhar', undefined, 'info');
        }} />}

        {/* Step 2: Produtos em alta (Title + Filters) */}
        <FilterTabs
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          resultCount={products.length}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border border-white/70 bg-white/65 p-2.5 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 px-1.5 text-xs font-bold text-slate-600">
            <Layers3 className="h-4 w-4 text-[#EE4D2D]" />
            <span>Categoria / nicho</span>
          </div>
          <select
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
            className="w-full sm:w-auto flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
            aria-label="Filtrar por categoria ou nicho"
          >
            <option value="">Todos os nichos</option>
            <option value="eletrônicos">Eletrônicos</option>
            <option value="casa">Casa e cozinha</option>
            <option value="moda">Moda</option>
            <option value="beleza">Beleza</option>
            <option value="acessórios">Acessórios</option>
            <option value="celular">Celulares e informática</option>
          </select>
        </div>
        <button type="button" onClick={enableSaleNotifications} className="w-full rounded-2xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-left text-xs font-bold text-orange-800 shadow-sm backdrop-blur-md hover:bg-orange-100">
          {notificationsEnabled ? '🔔 Notificações de vendas ativadas' : '🔔 Ativar notificações quando sair uma venda'}
        </button>

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

        <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center text-xs font-semibold text-slate-500">
          {loadingMore ? 'Carregando mais ofertas reais…' : hasNextPage ? 'Role para carregar mais' : 'Você chegou ao fim desta lista'}
        </div>

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
