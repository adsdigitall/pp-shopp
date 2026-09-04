import { useState, useEffect, useCallback, useRef } from 'react';
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
import { MercadoLivreSearch } from './components/MercadoLivreSearch';
import { AnalyticsModal } from './components/AnalyticsModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DispatchWizardModal } from './components/DispatchWizardModal';
import {
  getPullRefreshDistance,
  mergeFreshProducts,
  nextRefreshPage,
  nextRefreshQuery,
  shouldTriggerPullRefresh,
} from './services/productRefresh';
import { SearchX, Layers3, ShoppingBag, Zap, LayoutGrid, RefreshCw, ArrowDown, BarChart2 } from 'lucide-react';

const DEFAULT_SETTINGS: AffiliateSettings = {
  affiliateTag: 'aff_shopp_vip',
  defaultFormat: 'standard',
  includeHashtags: true,
  showPrivateCommission: true,
  theme: 'light',
};

const REFRESH_PAGE_KEY = 'radar:last-refresh-page';
const DISCOVERY_INDEX_KEY = 'radar:discovery-index';
const RECENT_PRODUCTS_KEY = 'radar:recent-product-ids';

function readStoredNumber(key: string, fallback: number) {
  const value = Number.parseInt(localStorage.getItem(key) || '', 10);
  return Number.isInteger(value) ? value : fallback;
}

function readRecentProductIds() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]');
    return new Set<string>(Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

type Marketplace = 'shopee' | 'mercado_livre';

function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const refreshPageRef = useRef(readStoredNumber(REFRESH_PAGE_KEY, 0));
  const discoveryIndexRef = useRef(readStoredNumber(DISCOVERY_INDEX_KEY, 0));
  const recentProductIdsRef = useRef(readRecentProductIds());
  const lastQueryKeyRef = useRef<string | null>(null);
  const lastRefreshAtRef = useRef(0);
  const touchStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('trending');
  const [activeNav, setActiveNav] = useState<MainNavTab>('home');
  const [activeMarketplace, setActiveMarketplace] = useState<Marketplace>('shopee');
  const [activeSection, setActiveSection] = useState('garimpar');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const seenSalesRef = useRef<Set<string>>(new Set());

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);

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
    if (permission === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const keyResponse = await fetch('/api/push/public-key');
        const { publicKey } = await keyResponse.json();
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) });
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
      } catch {
        showToast('Push ainda não configurado no servidor', undefined, 'info');
        setNotificationsEnabled(false);
        return;
      }
    }
    setNotificationsEnabled(permission === 'granted');
    showToast(permission === 'granted' ? 'Notificações de vendas ativadas' : 'Permissão de notificações não concedida', undefined, permission === 'granted' ? 'success' : 'info');
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      showToast('Ative as notificacoes primeiro', undefined, 'info');
      return;
    }
    const options = { body: 'Produto de teste - comissao: R$ 10,00', icon: '/favicon.svg', badge: '/favicon.svg' };
    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification('Nova venda Shopee (teste)', options);
        return;
      }
    } catch {
      // Fallback para a notificacao do navegador quando o service worker nao estiver pronto.
    }
    new Notification('Nova venda Shopee (teste)', options);
  }, []);

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

  // Fetch products via service (Shopee only)
  const loadProducts = useCallback(async (silent = false, rotatePage = false) => {
    if (!silent) setLoading(true);
    try {
      const selectedQuery = [activeCategory, searchQuery].filter(Boolean).join(' ');
      const targetPage = rotatePage ? nextRefreshPage(refreshPageRef.current) : 1;
      const discovery = nextRefreshQuery(selectedQuery, discoveryIndexRef.current);
      const query = rotatePage ? discovery.query : selectedQuery;
      const result = await productService.getProductsPage(activeFilter, query, targetPage);
      const nextProducts = rotatePage
        ? mergeFreshProducts([], result.products, recentProductIdsRef.current, result.products.length)
        : result.products;
      setProducts(nextProducts);
      setHasNextPage(result.hasNextPage);
      setCurrentPage(targetPage);
      refreshPageRef.current = targetPage;
      discoveryIndexRef.current = discovery.nextIndex;
      nextProducts.forEach((product) => recentProductIdsRef.current.add(product.id));
      const recentIds = [...recentProductIdsRef.current].slice(-240);
      recentProductIdsRef.current = new Set(recentIds);
      localStorage.setItem(REFRESH_PAGE_KEY, String(targetPage));
      localStorage.setItem(DISCOVERY_INDEX_KEY, String(discovery.nextIndex));
      localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recentIds));
      lastRefreshAtRef.current = Date.now();
    } catch (err) {
      if (!silent) {
        showToast('Erro ao carregar produtos', 'Tente novamente mais tarde.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeCategory, searchQuery, showToast]);

  useEffect(() => {
    if (activeMarketplace === 'shopee' && activeSection === 'garimpar') {
      const queryKey = `${activeFilter}|${activeCategory}|${searchQuery}`;
      const firstLoad = lastQueryKeyRef.current === null;
      const queryChanged = !firstLoad && lastQueryKeyRef.current !== queryKey;
      if (queryChanged) {
        refreshPageRef.current = 0;
        discoveryIndexRef.current = 0;
      }
      lastQueryKeyRef.current = queryKey;
      loadProducts(false, !queryChanged);
    }
  }, [loadProducts, activeMarketplace, activeSection]);

  useEffect(() => {
    const targetId = activeSection === 'garimpar' ? 'produtos' : activeSection === 'ofertas' ? 'ofertas-fila' : activeSection === 'templates' ? 'templates-radar' : activeSection === 'extensao' ? 'extensao-radar' : activeSection;
    const timer = window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    return () => window.clearTimeout(timer);
  }, [activeSection]);

  useEffect(() => {
    if (activeMarketplace !== 'shopee') return;
    const refreshAfterReturn = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAtRef.current > 5_000) {
        void loadProducts(true, true);
      }
    };
    window.addEventListener('pageshow', refreshAfterReturn);
    document.addEventListener('visibilitychange', refreshAfterReturn);
    return () => {
      window.removeEventListener('pageshow', refreshAfterReturn);
      document.removeEventListener('visibilitychange', refreshAfterReturn);
    };
  }, [activeMarketplace, loadProducts]);

  useEffect(() => {
    if (activeMarketplace !== 'shopee') return;
    const handleTouchStart = (event: TouchEvent) => {
      if (window.scrollY <= 0) touchStartYRef.current = event.touches[0]?.clientY || 0;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const distance = getPullRefreshDistance(
        touchStartYRef.current,
        event.touches[0]?.clientY || 0,
        window.scrollY,
      );
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    };
    const handleTouchEnd = () => {
      const refresh = shouldTriggerPullRefresh(pullDistanceRef.current);
      pullDistanceRef.current = 0;
      setPullDistance(0);
      if (refresh) void loadProducts(false, true);
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeMarketplace, loadProducts]);

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
    if (activeMarketplace !== 'shopee') return;
    const refresh = () => {
      if (document.visibilityState === 'visible') loadProducts(true, true);
    };
    const intervalId = window.setInterval(refresh, 120_000);
    return () => window.clearInterval(intervalId);
  }, [loadProducts, activeMarketplace]);

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
      window.scrollTo({ top: 280, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const marketplaceTabs: { id: Marketplace; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
    { id: 'shopee', label: '🛍️ Shopee', icon: <ShoppingBag className="w-5 h-5" />, color: 'text-[#EE4D2D]', bgColor: 'bg-orange-100' },
    { id: 'mercado_livre', label: '🛒 Mercado Livre', icon: <ShoppingBag className="w-5 h-5" />, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_42%,#eef2ff_100%)] flex flex-col pb-24 sm:pb-16 text-slate-900 font-sans">
      <div
        className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center transition-opacity"
        style={{ opacity: pullDistance > 0 ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xl">
          <RefreshCw className={`h-4 w-4 ${pullDistance >= 60 ? 'rotate-180' : ''}`} />
          {pullDistance >= 60 ? 'Solte para ver novas ofertas' : 'Puxe para atualizar'}
        </div>
      </div>
      
      {/* Top Header */}
      <DesktopSidebar
        onNavigate={(section) => {
          setActiveSection(section);
          window.history.pushState({}, '', `#${section}`);
          const target = section === 'visao-geral' ? 'visao-geral' : section === 'garimpar' ? 'produtos' : section === 'ofertas' ? 'ofertas-fila' : section === 'templates' ? 'templates-radar' : section === 'extensao' ? 'extensao-radar' : ['espelhamento', 'tutoriais', 'suporte'].includes(section) ? section : null;
          if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onDispatch={() => setIsDispatchModalOpen(true)}
        onGroups={() => setIsGroupsModalOpen(true)}
        onSettings={() => setIsSettingsModalOpen(true)}
        onNotifications={() => setIsNotificationsModalOpen(true)}
        onAnalytics={() => setIsAnalyticsModalOpen(true)}
      />
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5 sm:space-y-6 lg:ml-72">

        <section id="visao-geral" className={`${activeSection === 'visao-geral' ? '' : 'hidden'} rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/60 to-white p-5 shadow-sm backdrop-blur-md sm:p-6`}>
          <div className="flex flex-col gap-1"><h1 className="text-xl font-black tracking-tight text-slate-900">Visão geral</h1><p className="text-xs text-slate-500">Central rápida do Radar de Oferta para organizar e disparar suas ofertas.</p></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={() => setIsDispatchModalOpen(true)} className="rounded-2xl bg-[#EE4D2D] p-4 text-left text-white shadow-lg shadow-orange-200 hover:bg-orange-600"><span className="text-lg">📤</span><span className="mt-2 block text-sm font-black">Disparar em grupo</span><span className="mt-1 block text-[11px] text-orange-100">Preparar e copiar manualmente</span></button>
            <button type="button" onClick={() => setIsGroupsModalOpen(true)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left hover:border-orange-300"><span className="text-lg">💬</span><span className="mt-2 block text-sm font-black text-slate-800">Conectar WhatsApp</span><span className="mt-1 block text-[11px] text-slate-500">Gerenciar grupos e canais</span></button>
            <button type="button" onClick={() => setIsNotificationsModalOpen(true)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left hover:border-orange-300"><span className="text-lg">🔔</span><span className="mt-2 block text-sm font-black text-slate-800">Notificações</span><span className="mt-1 block text-[11px] text-slate-500">Acompanhar alertas de vendas</span></button>
            <button type="button" onClick={() => setIsSettingsModalOpen(true)} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left hover:border-orange-300"><span className="text-lg">🌗</span><span className="mt-2 block text-sm font-black text-slate-800">Tema e conta</span><span className="mt-1 block text-[11px] text-slate-500">Claro ou escuro com laranja</span></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">● Integrações configuradas no servidor</span><span className="rounded-full bg-slate-100 px-3 py-1.5">Envio automático desativado por segurança</span></div>
        </section>
        
        <div className={activeSection === 'garimpar' ? '' : 'hidden'}>
        {/* Step 1: Como Funciona */}
        {!searchQuery && activeMarketplace === 'shopee' && (
          <HowItWorks onStepClick={(step) => {
            if (step <= 2) window.scrollTo({ top: 280, behavior: 'smooth' });
            if (step === 3) showToast('Escolha um produto para compartilhar', undefined, 'info');
          }} />
        )}

        <div className="rounded-3xl border border-orange-100 bg-white/75 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setActiveMarketplace('shopee')} className={`rounded-full px-4 py-2 text-xs font-black ${activeMarketplace === 'shopee' ? 'bg-[#EE4D2D] text-white' : 'bg-slate-100 text-slate-600'}`}>🟠 Shopee</button><button type="button" onClick={() => showToast('Mercado Livre', 'Conecte seu token OAuth em Configurações para ativar.', 'info')} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">🟡 Mercado Livre · conectar</button><button type="button" onClick={() => showToast('Amazon', 'Integração preparada para uma próxima etapa.', 'info')} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">🟢 Amazon · conectar</button><span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-400">🔵 Magalu · em breve</span></div>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-xl bg-orange-100 px-3 py-2 text-xs font-black text-orange-700">Buscar</span><button type="button" onClick={() => showToast('Categorias', 'Escolha uma categoria abaixo para atualizar os produtos.', 'info')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Categorias</button><button type="button" onClick={() => setActiveFilter('trending')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Mais buscados</button><button type="button" onClick={() => setIsGroupsModalOpen(true)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Lojas favoritas</button><button type="button" onClick={() => showToast('Buscar por link', 'Cole um link Shopee no campo de busca acima.', 'info')} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Por links</button></div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-slate-500">Categorias:</span>{[['🏠','Casa'],['🍳','Cozinha'],['💻','Eletrônico'],['👗','Moda'],['💄','Beleza'],['🛠️','Ferramenta'],['⚽','Esporte'],['🐾','Pet'],['👶','Bebê']].map(([emoji,label]) => <button key={label} type="button" onClick={() => { setActiveCategory(label.toLowerCase()); void loadProducts(false, true); }} className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-orange-300">{emoji} {label}</button>)}</div>
          <p className="mt-3 text-[11px] text-slate-500">🇧🇷 Produtos brasileiros por padrão. Produtos internacionais: em breve.</p>
        </div>

        {/* Marketplace Selector Tabs */}
        <div className="flex gap-2 bg-white/65 border border-white/70 rounded-2xl p-1.5 shadow-sm backdrop-blur-md">
          {marketplaceTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMarketplace(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeMarketplace === tab.id
                  ? `${tab.bgColor} ${tab.color} shadow-md`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className={`${tab.color}`}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeMarketplace === 'shopee' ? (
          <>  
            {/* Shopee Filters */}
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
              <button
                type="button"
                onClick={() => loadProducts(false, true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
              >
                <RefreshCw className="h-4 w-4" />
                Novas ofertas
              </button>
              <select
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="w-full sm:w-auto flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                aria-label="Filtrar por categoria ou nicho"
              >
                <option value="">✨ Todos os nichos</option>
                <option value="eletrônicos">💻 Eletrônicos</option>
                <option value="moda feminina">👗 Moda feminina</option>
                <option value="casa e banho">🏠 Casa, cozinha e banho</option>
                <option value="infantil">🧸 Infantil e crianças</option>
                <option value="beleza">💄 Beleza</option>
                <option value="acessórios">👜 Acessórios</option>
                <option value="celular">📱 Celulares e informática</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={enableSaleNotifications} className="flex-1 rounded-2xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-left text-xs font-bold text-orange-800 shadow-sm backdrop-blur-md hover:bg-orange-100">
                {notificationsEnabled ? '🔔 Notificações de vendas ativadas' : '🔔 Ativar notificações quando sair uma venda'}
              </button>
              {notificationsEnabled && <button type="button" onClick={sendTestNotification} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md hover:bg-slate-50">Enviar teste</button>}
            </div>

            {/* Shopee Product Grid */}
            {loading ? (
            <div id="produtos" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="bg-white rounded-3xl p-3 sm:p-4 space-y-3 animate-pulse border border-slate-100">
                    <div className="aspect-square bg-slate-200 rounded-2xl w-full" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 bg-slate-200 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div id="produtos" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onGenerateOffer={handleGenerateOffer}
                  />
                ))}
              </div>
            ) : (
              <div id="produtos" className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 bg-orange-100 text-[#EE4D2D] rounded-2xl flex items-center justify-center mx-auto">
                  <SearchX className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Nenhum produto encontrado</h3>
                  <p className="text-xs text-slate-500">Não encontramos ofertas para "{searchQuery}".</p>
                </div>
                <button onClick={() => setSearchQuery('')} className="px-4 py-2 bg-[#EE4D2D] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                  Limpar busca
                </button>
              </div>
            )}

            <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center text-xs font-semibold text-slate-500">
              {loadingMore ? 'Carregando mais ofertas reais…' : hasNextPage ? 'Role para carregar mais' : 'Você chegou ao fim desta lista'}
            </div>
          </>
        ) : (
          // Mercado Livre Search
          <MercadoLivreSearch
            onProductSelect={handleGenerateOffer}
            onShowToast={showToast}
          />
        )}

        </div>

        <div className={activeSection === 'ofertas' ? '' : 'hidden'}>
        <GroupsShortcutCard onOpenGroups={() => setIsGroupsModalOpen(true)} />
        </div>

        {/* Extensão do Radar */}
        <section id="extensao-radar" className={`${activeSection === 'extensao' ? '' : 'hidden'} rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">🧩 Extensão Radar de Oferta</h2>
              <p className="mt-1 text-xs text-slate-500">Capture produtos nas lojas e envie para sua fila de ofertas.</p>
            </div>
            <a href="/radar-oferta-connect-v1.zip" download className="inline-flex items-center justify-center rounded-xl bg-[#EE4D2D] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-orange-600">⬇️ Baixar extensão</a>
          </div>
          <ol className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
            <li><b>1.</b> Baixe e descompacte o ZIP.</li>
            <li><b>2.</b> Abra <code className="rounded bg-slate-100 px-1">chrome://extensions</code> e ative o modo desenvolvedor.</li>
            <li><b>3.</b> Clique em “Carregar sem compactação” e selecione a pasta.</li>
          </ol>
        </section>

        <section id="ofertas-fila" className={`${activeSection === 'ofertas' ? '' : 'hidden'} rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-black text-slate-900">Ofertas / fila</h2><p className="mt-1 text-xs text-slate-500">Ofertas prontas para revisar e preparar para os grupos.</p></div><button type="button" onClick={() => setIsDispatchModalOpen(true)} className="rounded-xl bg-[#EE4D2D] px-4 py-2.5 text-xs font-black text-white hover:bg-orange-600">Abrir disparo</button></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-orange-50 p-3"><b className="block text-lg text-orange-700">{products.length}</b><span className="text-[11px] text-orange-700">na fila</span></div><div className="rounded-2xl bg-emerald-50 p-3"><b className="block text-lg text-emerald-700">0</b><span className="text-[11px] text-emerald-700">disparadas hoje</span></div><div className="rounded-2xl bg-slate-100 p-3"><b className="block text-lg text-slate-700">Manual</b><span className="text-[11px] text-slate-600">modo seguro</span></div></div>
        </section>

        <section id="templates-radar" className={`${activeSection === 'templates' ? '' : 'hidden'} rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md`}>
          <h2 className="text-base font-black text-slate-900">Templates e páginas</h2>
          <p className="mt-1 text-xs text-slate-500">Modelos de copy e prévias públicas para padronizar suas divulgações.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 p-3 text-xs font-bold text-slate-700">Radar encontrou</div><div className="rounded-2xl border border-slate-200 p-3 text-xs font-bold text-slate-700">Oferta relâmpago</div><div className="rounded-2xl border border-slate-200 p-3 text-xs font-bold text-slate-700">Preço + desconto</div></div>
        </section>

        <section id="espelhamento" className={`${activeSection === 'espelhamento' ? '' : 'hidden'} rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md`}>
          <h2 className="text-base font-black text-slate-900">Espelhamento</h2>
          <p className="mt-1 text-xs text-slate-500">Acompanhe a captura de ofertas da extensão em um único painel. A conexão de grupos será habilitada quando você instalar a extensão Radar.</p>
          <span className="mt-3 inline-flex rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600">Preparação disponível</span>
        </section>

        <section id="tutoriais" className={`${activeSection === 'tutoriais' ? '' : 'hidden'} rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md`}>
          <h2 className="text-base font-black text-slate-900">Tutoriais</h2>
          <p className="mt-1 text-xs text-slate-500">Aprenda a garimpar, revisar e copiar ofertas para seus grupos com o fluxo manual seguro.</p>
          <ol className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3"><li><b>1.</b> Escolha um produto.</li><li><b>2.</b> Gere e revise a mensagem.</li><li><b>3.</b> Copie e envie no WhatsApp.</li></ol>
        </section>

        <section id="suporte" className={`${activeSection === 'suporte' ? '' : 'hidden'} rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md`}>
          <h2 className="text-base font-black text-slate-900">Suporte</h2>
          <p className="mt-1 text-xs text-slate-500">Precisa de ajuda? Confira as instruções da extensão e valide suas configurações de integração antes de solicitar atendimento.</p>
          <button type="button" onClick={() => setIsSettingsModalOpen(true)} className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-[11px] font-black text-orange-700 hover:bg-orange-100">Abrir configurações</button>
        </section>

      </main>

      {/* Offer Preview Modal */}
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

      <DispatchWizardModal
        isOpen={isDispatchModalOpen}
        offers={products}
        onClose={() => setIsDispatchModalOpen(false)}
        onShowToast={showToast}
      />

{/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        onShowToast={showToast}
        activeMarketplace={activeMarketplace}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
      />

      {/* Floating Analytics Button */}
      <button
        onClick={() => setIsAnalyticsModalOpen(true)}
        className="fixed bottom-28 right-4 z-40 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-1.5"
        aria-label="Ver Analytics"
      >
        <BarChart2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export default App;
