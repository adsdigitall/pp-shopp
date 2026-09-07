import { useState, useEffect, useCallback, useRef } from 'react';
import { Product, FilterType, AffiliateSettings, SectionId, QueueItem, Template, Group, Settings as SettingsType, Coupon, GarimparTab, GarimparPlatform, GarimparFilter, DispatchStep, PageType } from './types/product';
import { productService } from './services/productService';
import { Header } from './components/Header';
import { FilterTabs } from './components/FilterTabs';
import { ProductCard } from './components/ProductCard';
import { OfferPreviewModal } from './components/OfferPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { MobileBottomNav, MainNavTab } from './components/MobileBottomNav';
import { MercadoLivreSearch } from './components/MercadoLivreSearch';
import { AnalyticsModal } from './components/AnalyticsModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { VisaoGeral } from './components/VisaoGeral';
import { GarimparPage } from './components/GarimparPage';
import { FilaPage } from './components/FilaPage';
import { PaginasPage } from './components/PaginasPage';
import { EspelhamentoPage } from './components/EspelhamentoPage';
import GruposPage from './components/GruposPage';
import { MetricasPage } from './components/MetricasPage';
import { ExtensaoPage } from './components/ExtensaoPage';
import { ConfiguracoesPage } from './components/ConfiguracoesPage';
import { WhatsAppPage } from './components/WhatsAppPage';
import { DispararPage } from './components/DispararPage';
import { FloatingActionButtons } from './components/FloatingActionButtons';
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
  theme: 'dark',
};

const REFRESH_PAGE_KEY = 'radar:last-refresh-page';
const DISCOVERY_INDEX_KEY = 'radar:discovery-index';
const RECENT_PRODUCTS_KEY = 'radar:recent-product-ids';
const RECENT_PRODUCTS_LIMIT = 720;

const sectionFromLocation = (): SectionId => {
  const raw = window.location.hash.replace(/^#/, '').toLowerCase();
  const aliases: Record<string, SectionId> = {
    '': 'visao-geral', 'visao-geral': 'visao-geral', garimpar: 'garimpar', disparar: 'disparar', disparos: 'disparar',
    fila: 'fila', ofertas: 'fila', paginas: 'paginas', espelhamento: 'espelhamento', grupos: 'grupos', metricas: 'metricas',
    extensao: 'extensao', tutoriais: 'tutoriais', suporte: 'suporte', configuracoes: 'configuracoes', whatsapp: 'whatsapp',
  };
  return aliases[raw] || 'visao-geral';
};

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
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
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
  const sidebarTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('top_sales');
  const [activeNav, setActiveNav] = useState<MainNavTab>('home');
  const [activeMarketplace, setActiveMarketplace] = useState<Marketplace>('shopee');
  const [selectedPlatform, setSelectedPlatform] = useState<GarimparPlatform>('shopee');
  const [garimparTab, setGarimparTab] = useState<GarimparTab>('buscar');
  const [shopeeConfigured, setShopeeConfigured] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>(() => sectionFromLocation());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const seenSalesRef = useRef<Set<string>>(new Set());

  // Restaura a fila persistida para que as ofertas não desapareçam ao recarregar.
  useEffect(() => {
    let cancelled = false;
    const restoreQueue = async () => {
      try {
        const response = await fetch('/api/queue', { cache: 'no-store' });
        if (!response.ok) return;
        const body = await response.json();
        const items = Array.isArray(body?.items) ? body.items : [];
        if (!cancelled) setQueueItems(items as QueueItem[]);
      } catch {
        // Mantém a fila local caso a API esteja temporariamente indisponível.
      }
    };
    void restoreQueue();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const navBySection: Partial<Record<SectionId, MainNavTab>> = {
      'visao-geral': 'home',
      garimpar: 'products',
      disparar: 'dispatch',
      grupos: 'groups',
      configuracoes: 'config',
    };
    const nextNav = navBySection[activeSection];
    if (nextNav) setActiveNav(nextNav);
  }, [activeSection]);

  useEffect(() => {
    const syncRoute = () => setActiveSection(sectionFromLocation());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  // Modal States (kept for secondary, quick actions only)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);
  const [dispatchDraft, setDispatchDraft] = useState<any>({ message: null, destinations: null });

  // The sidebar is a real mobile drawer: pull from the left edge to open and
  // swipe it back to the left to close. This keeps the primary screens free of
  // floating controls and preserves the same navigation on touch devices.
  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (touch.clientX <= 40 || mobileSidebarOpen) {
        sidebarTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const start = sidebarTouchStartRef.current;
      const touch = event.changedTouches[0];
      sidebarTouchStartRef.current = null;
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx > 0 && start.x <= 48) setMobileSidebarOpen(true);
      if (dx < 0 && mobileSidebarOpen) setMobileSidebarOpen(false);
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mobileSidebarOpen]);

  // Settings & Data
  const [settings, setSettings] = useState<AffiliateSettings>(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [mirroringConfigs, setMirroringConfigs] = useState<any[]>([]);
  const [extensionToken, setExtensionToken] = useState('');
  const [panelUrl, setPanelUrl] = useState('https://radarfertas.shop');
  const [whatsappConnected, setWhatsAppConnected] = useState(false);
  const [dispatchHistory, setDispatchHistory] = useState<any[]>([]);

  // App Settings State
  const [appSettings, setAppSettings] = useState<SettingsType>({
    channels: { whatsapp: { connected: false, phone: '', instanceId: '' }, telegram: { connected: false } },
    platforms: { shopee: { appId: '', secret: '', validated: false }, mercadoLivre: { affiliateTag: '', accessToken: '' }, amazon: { associateTag: '' }, magalu: { storeSlug: '' } },
    templates: [],
    coupons: [],
    security: { safeInterval: true },
    account: { name: 'Carolina de assunção macedo', email: 'macedoc50@gmail.com', plan: 'viral', subscriptionStatus: 'active' },
  });

  useEffect(() => {
    fetch('/api/health').then((response) => response.json()).then((body) => setShopeeConfigured(body?.shopeeConfigured !== false)).catch(() => setShopeeConfigured(true));
  }, []);

  useEffect(() => {
    let active = true;
    const loadHistory = () => fetch('/api/dispatch/history').then(response => response.ok ? response.json() : null).then(body => {
      if (active && Array.isArray(body?.history)) setDispatchHistory(body.history);
    }).catch(() => undefined);
    loadHistory();
    const intervalId = window.setInterval(loadHistory, 15_000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    // listen for system changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (settings.theme === 'system') {
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
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
    } catch { }
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
      } catch { }
    };
    checkSales();
    const intervalId = window.setInterval(checkSales, 120_000);
    return () => window.clearInterval(intervalId);
  }, [notificationsEnabled]);

  const showToast = useCallback((title: string, description?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 3500);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetch('/api/whatsapp/groups?session=default')
      .then(response => response.ok ? response.json() : null)
      .then(body => {
        if (!Array.isArray(body?.groups) || body.groups.length === 0) return;
        setGroups(body.groups.map((group: any) => ({ ...group, status: group.status || 'active', isAdmin: Boolean(group.isAdmin) })));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const refreshWhatsAppStatus = () => {
      fetch('/api/whatsapp/status').then(response => response.ok ? response.json() : null).then(body => {
        if (body) setWhatsAppConnected(body.status === 'connected' || body.status === 'working');
      }).catch(() => undefined);
    };
    refreshWhatsAppStatus();
    const intervalId = window.setInterval(refreshWhatsAppStatus, 10_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const loadProducts = useCallback(async (silent = false, rotatePage = false) => {
    if (!silent) setLoading(true);
    try {
      const selectedQuery = [activeCategory, searchQuery].filter(Boolean).join(' ');
      const targetPage = rotatePage ? nextRefreshPage(refreshPageRef.current) : 1;
      const discovery = nextRefreshQuery(selectedQuery, discoveryIndexRef.current);
      const query = rotatePage ? discovery.query : selectedQuery;
      let resolvedPage = targetPage;
      let result = await productService.getProductsPage(activeFilter, query, resolvedPage);
      // A vitrine só apresenta produtos que ainda não foram mostrados nesta
      // instalação. Quando uma página se esgotar, a próxima atualização troca
      // página/categoria para buscar novos resultados reais da Shopee.
      let nextProducts = mergeFreshProducts(
        [],
        result.products,
        recentProductIdsRef.current,
        result.products.length,
        false,
      );
      // A API pode devolver uma página que o usuário já viu. Caminhamos por
      // mais páginas imediatamente para não deixar a vitrine vazia/repetida.
      for (let attempt = 0; nextProducts.length === 0 && result.hasNextPage && attempt < 3; attempt++) {
        resolvedPage = nextRefreshPage(resolvedPage, 50);
        result = await productService.getProductsPage(activeFilter, query, resolvedPage);
        nextProducts = mergeFreshProducts([], result.products, recentProductIdsRef.current, result.products.length, false);
      }
      setProducts(nextProducts);
      setHasNextPage(result.hasNextPage);
      setCurrentPage(resolvedPage);
      refreshPageRef.current = resolvedPage;
      discoveryIndexRef.current = discovery.nextIndex;
      nextProducts.forEach((product) => recentProductIdsRef.current.add(product.id));
      const recentIds = [...recentProductIdsRef.current].slice(-RECENT_PRODUCTS_LIMIT);
      recentProductIdsRef.current = new Set(recentIds);
      localStorage.setItem(REFRESH_PAGE_KEY, String(resolvedPage));
      localStorage.setItem(DISCOVERY_INDEX_KEY, String(discovery.nextIndex));
      localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recentIds));
      lastRefreshAtRef.current = Date.now();
    } catch (err) {
      if (!silent) { showToast('Erro ao carregar produtos', 'Tente novamente mais tarde.', 'error'); }
    } finally { setLoading(false); }
  }, [activeFilter, activeCategory, searchQuery, showToast]);

  useEffect(() => {
    if (activeMarketplace === 'shopee' && activeSection === 'garimpar') {
      const queryKey = `${activeFilter}|${activeCategory}|${searchQuery}`;
      const firstLoad = lastQueryKeyRef.current === null;
      const queryChanged = !firstLoad && lastQueryKeyRef.current !== queryKey;
      if (queryChanged) { refreshPageRef.current = 0; discoveryIndexRef.current = 0; }
      lastQueryKeyRef.current = queryKey;
      loadProducts(false, !queryChanged);
    }
  }, [loadProducts, activeMarketplace, activeSection, activeFilter, activeCategory, searchQuery]);

  useEffect(() => {
    const targetId = activeSection === 'garimpar' ? 'produtos' : activeSection === 'ofertas' ? 'ofertas-fila' : activeSection === 'templates' ? 'templates-radar' : activeSection === 'extensao' ? 'extensao-radar' : activeSection;
    const timer = window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    return () => window.clearTimeout(timer);
  }, [activeSection]);

  useEffect(() => {
    if (activeMarketplace !== 'shopee') return;
    const refreshAfterReturn = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefreshAtRef.current > 5_000) { void loadProducts(true, true); } };
    window.addEventListener('pageshow', refreshAfterReturn);
    document.addEventListener('visibilitychange', refreshAfterReturn);
    return () => { window.removeEventListener('pageshow', refreshAfterReturn); document.removeEventListener('visibilitychange', refreshAfterReturn); };
  }, [activeMarketplace, loadProducts]);

  useEffect(() => {
    if (activeMarketplace !== 'shopee') return;
    const handleTouchStart = (event: TouchEvent) => { if (window.scrollY <= 0) touchStartYRef.current = event.touches[0]?.clientY || 0; };
    const handleTouchMove = (event: TouchEvent) => { const distance = getPullRefreshDistance(touchStartYRef.current, event.touches[0]?.clientY || 0, window.scrollY); pullDistanceRef.current = distance; setPullDistance(distance); };
    const handleTouchEnd = () => { const refresh = shouldTriggerPullRefresh(pullDistanceRef.current); pullDistanceRef.current = 0; setPullDistance(0); if (refresh) void loadProducts(false, true); };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', handleTouchStart); window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('touchend', handleTouchEnd); };
  }, [activeMarketplace, loadProducts]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const combinedQuery = [activeCategory, searchQuery].filter(Boolean).join(' ');
      const nextPage = currentPage + 1;
      const result = await productService.getProductsPage(activeFilter, combinedQuery, nextPage);
      const freshProducts = mergeFreshProducts([], result.products, recentProductIdsRef.current, result.products.length, false);
      freshProducts.forEach((product) => recentProductIdsRef.current.add(product.id));
      const recentIds = [...recentProductIdsRef.current].slice(-RECENT_PRODUCTS_LIMIT);
      recentProductIdsRef.current = new Set(recentIds);
      localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recentIds));
      setProducts((current) => {
        const ids = new Set(current.map((p) => p.id));
        return [...current, ...freshProducts.filter((p) => !ids.has(p.id))];
      });
      setHasNextPage(result.hasNextPage);
      setCurrentPage(nextPage);
    } catch { showToast('Não foi possível carregar mais ofertas', 'Tente novamente em instantes.', 'error'); }
    finally { setLoadingMore(false); }
  }, [activeFilter, activeCategory, searchQuery, hasNextPage, loading, loadingMore, currentPage, showToast]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMoreProducts(); }, { rootMargin: '500px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreProducts]);

  useEffect(() => {
    if (activeMarketplace !== 'shopee') return;
    const intervalId = window.setInterval(() => { if (document.visibilityState === 'visible') loadProducts(true, true); }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadProducts, activeMarketplace]);

  const handleAddToQueue = (product?: Product) => {
    if (product) {
      const exists = queueItems.some(item => item.product.id === product.id);
      if (!exists) {
        const newItem: QueueItem = { id: `queue-${Date.now()}`, product, addedAt: new Date().toISOString(), selected: true };
        setQueueItems(prev => [...prev, newItem]);
        void fetch('/api/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product, queueId: newItem.id }),
        }).then(async (response) => {
          if (!response.ok) throw new Error('Falha ao sincronizar a fila.');
          const body = await response.json();
          if (body?.automationJobId) {
            setQueueItems(prev => prev.filter(item => item.id !== newItem.id));
            showToast('Oferta na fila automática', 'O servidor criou o disparo. Acompanhe em Disparos › Em andamento.', 'success');
          }
        }).catch(() => {
          showToast('Oferta adicionada localmente', 'Não foi possível sincronizar a fila agora.', 'info');
        });
        showToast('Oferta adicionada à fila', 'Disponível em Ofertas / fila para disparo manual.', 'success');
      }
    } else {
      // Open Garimpar page to add offers
      setActiveSection('garimpar');
      setMobileSidebarOpen(false);
      window.history.pushState({}, '', `#garimpar`);
      document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGenerateOffer = (product: Product) => {
    // Sharing an offer now enters the full dispatch flow instead of opening a
    // centered preview modal. The selected product is added to the existing
    // queue, while all dispatch rules and API calls remain unchanged.
    handleAddToQueue(product);
    setActiveSection('disparar');
    setMobileSidebarOpen(false);
    window.history.pushState({}, '', '#disparar');
  };

  const handlePreviewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsOfferModalOpen(true);
  };

  const handleCopyProductLink = async (product: Product) => {
    const link = product.affiliateUrl || product.productUrl;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copiado', 'O link de afiliado está pronto para compartilhar.', 'success');
    } catch {
      showToast('Não foi possível copiar', 'Abra o produto e copie o link manualmente.', 'error');
    }
  };

  const handleShareProduct = async (product: Product) => {
    const link = product.affiliateUrl || product.productUrl;
    const shareData = { title: product.name, text: `${product.name} — ${product.currentPrice != null ? product.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Confira a oferta'}`, url: link };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(`${shareData.text}\n${link}`);
      showToast('Oferta compartilhada', 'O link de afiliado está pronto para enviar.', 'success');
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') showToast('Não foi possível compartilhar', 'Tente copiar o link manualmente.', 'error');
    }
  };

  const handleRemoveFromQueue = (queueId: string) => {
    setQueueItems(prev => prev.filter(item => item.id !== queueId));
    void fetch(`/api/queue/${encodeURIComponent(queueId)}`, { method: 'DELETE' }).catch(() => {
      showToast('Oferta removida localmente', 'Não foi possível sincronizar a fila agora.', 'info');
    });
    showToast('Oferta removida da fila', undefined, 'info');
  };

  const handleClearQueue = () => {
    setQueueItems([]);
    void fetch('/api/queue/clear', { method: 'POST' }).catch(() => {
      showToast('Fila limpa localmente', 'Não foi possível sincronizar a fila agora.', 'info');
    });
    showToast('Fila limpa', undefined, 'info');
  };

  const handleSelectAllQueue = (selected: boolean) => {
    setQueueItems(prev => prev.map(item => ({ ...item, selected })));
    void Promise.allSettled(queueItems.map(item => fetch(`/api/queue/${encodeURIComponent(item.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected }) })));
  };

  const handleToggleQueueSelection = (queueId: string) => {
    const item = queueItems.find(candidate => candidate.id === queueId);
    if (!item) return;
    const selected = !item.selected;
    setQueueItems(prev => prev.map(candidate => candidate.id === queueId ? { ...candidate, selected } : candidate));
    void fetch(`/api/queue/${encodeURIComponent(queueId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected }) })
      .then(response => { if (!response.ok) throw new Error('Falha ao salvar seleção.'); })
      .catch(() => { setQueueItems(prev => prev.map(candidate => candidate.id === queueId ? { ...candidate, selected: item.selected } : candidate)); showToast('Não foi possível salvar a seleção', 'Tente novamente.', 'error'); });
  };

  const handleSaveQueueSelection = (selectedIds: string[]) => {
    const updates = queueItems.map(item => ({ id: item.id, selected: selectedIds.includes(item.id) }));
    setQueueItems(prev => prev.map(item => ({ ...item, selected: selectedIds.includes(item.id) })));
    void Promise.allSettled(updates.map(({ id, selected }) => fetch(`/api/queue/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected }) })));
  };

  const handleSaveMessage = (message: any) => {
    setDispatchDraft((prev: any) => ({ ...prev, message }));
  };

  const handleSaveDestinations = (destinations: any) => {
    setDispatchDraft((prev: any) => ({ ...prev, destinations }));
  };

  const handleExecuteDispatch = async (): Promise<{ jobId: string; status: string } | null> => {
    const selectedQueue = queueItems.filter(q => q.selected);
    const destinations = dispatchDraft.destinations;
    if (!selectedQueue.length || !destinations?.groups?.length) {
      showToast('Disparo incompleto', 'Selecione ofertas e grupos antes de confirmar.', 'error');
      return null;
    }
    try {
      const response = await fetch('/api/dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offers: selectedQueue.map(item => { const raw: any = item as any; const product: any = raw.product || raw; return ({ id: product.productId || product.id, name: product.productName || product.name, currentPrice: product.price ?? product.currentPrice, originalPrice: product.originalPrice, affiliateUrl: product.affiliateUrl, productUrl: product.originalUrl || product.productUrl, imageUrl: product.imageUrl }); }),
          message: dispatchDraft.message || { whatsapp: { customMessage: '{TITULO}\n{PRECO}\n{LINK}', showImage: true } },
          destinations: { ...destinations, groups: destinations.groups.map((group: any) => ({ id: group.id, sessionId: group.sessionId })) },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Não foi possível criar a fila.');
      showToast('Disparo adicionado à fila', `Job ${data.jobId} criado no servidor.`, 'success');
      const dispatchedIds = new Set(selectedQueue.map(item => item.id));
      setQueueItems(prev => prev.filter(item => !dispatchedIds.has(item.id)));
      await Promise.allSettled(selectedQueue.map(item => fetch(`/api/queue/${encodeURIComponent(item.id)}`, { method: 'DELETE' })));
      return { jobId: data.jobId, status: data.status || 'pending' };
    } catch (error) {
      showToast('Erro ao criar disparo', error instanceof Error ? error.message : 'Tente novamente.', 'error');
      return null;
    }
  };

  const handleCreatePage = (page: any) => {
    const newPage = { ...page, id: `page-${Date.now()}`, createdAt: new Date().toISOString() };
    setPages(prev => [...prev, newPage]);
    showToast('Página criada', 'Agora adicione ofertas e personalize.', 'success');
  };

  const handleDeletePage = (pageId: string) => { setPages(prev => prev.filter(p => p.id !== pageId)); showToast('Página excluída', undefined, 'info'); };

  const handleEditPage = (page: any) => { showToast('Editar página', 'Funcionalidade em desenvolvimento', 'info'); };

  const handlePublishPage = (pageId: string) => { setPages(prev => prev.map(p => p.id === pageId ? { ...p, status: 'published', publishedAt: new Date().toISOString() } : p)); showToast('Página publicada', 'Link público gerado.', 'success'); };

  const handleCreateMirroring = (config: any) => {
    const newConfig = { ...config, id: `mirror-${Date.now()}`, status: 'active', createdAt: new Date().toISOString() };
    setMirroringConfigs(prev => [...prev, newConfig]);
    showToast('Espelhamento criado', 'Configuração salva com sucesso.', 'success');
  };

  const handleSaveSettings = (newSettings: Partial<SettingsType>) => { setAppSettings(prev => ({ ...prev, ...newSettings })); showToast('Configurações salvas', undefined, 'success'); };

  const handleSaveTemplate = (template: Template) => { setTemplates(prev => { const exists = prev.find(t => t.id === template.id); return exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template]; }); };

  const handleDeleteTemplate = (templateId: string) => { setTemplates(prev => prev.filter(t => t.id !== templateId)); };

  const handleSaveCoupon = (coupon: Coupon) => { setCoupons(prev => [...prev, coupon]); };

  const handleDisconnectWhatsApp = () => { setWhatsAppConnected(false); showToast('WhatsApp desconectado', undefined, 'info'); };

  const handleOpenWhatsApp = () => { setActiveSection('whatsapp'); setMobileSidebarOpen(false); };

  const handleToggleTheme = () => { setSettings(prev => { const themes = ['light', 'dark', 'system'] as const; const current = themes.indexOf(prev.theme); return { ...prev, theme: themes[(current + 1) % themes.length] }; }); };

  const handleSelectNav = (nav: MainNavTab) => {
    setActiveNav(nav);
    const section: SectionId = nav === 'groups' ? 'grupos' : nav === 'config' ? 'configuracoes' : nav === 'dispatch' ? 'disparar' : nav === 'products' ? 'garimpar' : nav === 'whatsapp' ? 'whatsapp' : 'visao-geral';
    setActiveSection(section);
    setMobileSidebarOpen(false);
    window.history.pushState({}, '', `#${section}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const marketplaceTabs: { id: Marketplace; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
    { id: 'shopee', label: '🛍️ Shopee', icon: <ShoppingBag className="w-5 h-5" />, color: 'text-[#EE4D2D]', bgColor: 'bg-orange-100' },
    { id: 'mercado_livre', label: '🛒 Mercado Livre', icon: <ShoppingBag className="w-5 h-5" />, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  ];

  return (
    <div className="app-shell min-h-screen min-w-0 overflow-x-hidden font-sans transition-colors duration-normal">
      <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center transition-opacity" style={{ opacity: pullDistance > 0 ? 1 : 0 }}>
        <div className="flex items-center gap-2 rounded-full bg-neutral-900 dark:bg-neutral-50 px-3 py-2 text-xs font-bold text-white dark:text-neutral-950 shadow-xl">
          <RefreshCw className={`h-4 w-4 ${pullDistance >= 60 ? 'rotate-180' : ''}`} />
          {pullDistance >= 60 ? 'Solte para ver novas ofertas' : 'Puxe para atualizar'}
        </div>
      </div>

      <DesktopSidebar
        activeSection={activeSection}
        mobileOpen={mobileSidebarOpen}
        onToggleMobile={() => setMobileSidebarOpen((open) => !open)}
        onNavigate={(section) => { setMobileSidebarOpen(false); setActiveSection(section as SectionId); window.history.pushState({}, '', `#${section}`); const target = section; if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onDispatch={() => setActiveSection('disparar')}
        onGroups={() => setActiveSection('grupos')}
        onSettings={() => { setActiveSection('configuracoes'); setMobileSidebarOpen(false); }}
        onNotifications={() => setIsNotificationsModalOpen(true)}
        onAnalytics={() => { setActiveSection('metricas'); setMobileSidebarOpen(false); }}
      />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} onOpenSettings={() => setIsSettingsModalOpen(true)} onOpenNotifications={() => setIsNotificationsModalOpen(true)} whatsappConnected={whatsappConnected} onOpenWhatsApp={() => { setActiveSection('whatsapp'); window.history.pushState({}, '', '#whatsapp'); }} variant={activeSection === 'garimpar' ? 'garimpar' : 'default'} />

      <main className="min-w-0 w-full max-w-5xl flex-1 space-y-5 px-5 pb-28 pt-5 sm:space-y-6 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 md:ml-72">
        <div className={activeSection === 'visao-geral' ? '' : 'hidden'}><VisaoGeral
          onNavigateToGarimpar={() => { setActiveSection('garimpar'); setMobileSidebarOpen(false); }}
          onNavigateToDispatch={() => { setActiveSection('disparar'); }}
          onNavigateToGroups={() => { setActiveSection('grupos'); setMobileSidebarOpen(false); }}
          onNavigateToQueue={() => { setActiveSection('fila'); setMobileSidebarOpen(false); }}
          queuedCount={queueItems.length}
          dispatchCount={dispatchHistory.filter((job: any) => job.createdAt && new Date(job.createdAt).toDateString() === new Date().toDateString()).length}
          groupsCount={groups.length}
          clicksCount={0}
          whatsappConnected={whatsappConnected}
          shopeeConfigured={shopeeConfigured}
          latestDispatch={dispatchHistory[0]}
        /></div>

        <div className={activeSection === 'whatsapp' ? '' : 'hidden'}><WhatsAppPage
          onShowToast={showToast}
        /></div>

        <DispararPage
          isOpen={activeSection === 'disparar'}
          onClose={() => setActiveSection('visao-geral')}
          offers={products}
          queueItems={queueItems}
          templates={templates}
          groups={groups}
          onSaveQueueSelection={handleSaveQueueSelection}
          onSaveMessage={handleSaveMessage}
          onSaveDestinations={handleSaveDestinations}
          onExecuteDispatch={handleExecuteDispatch}
          onShowToast={showToast}
        />

        <div className={activeSection === 'garimpar' ? '' : 'hidden'}><GarimparPage
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={loadProducts}
          products={products}
          loading={loading}
          loadingMore={loadingMore}
          hasNextPage={hasNextPage}
          onLoadMore={loadMoreProducts}
          onRefresh={loadProducts}
          selectedPlatform={selectedPlatform}
          onSelectPlatform={setSelectedPlatform}
          garimparTab={garimparTab}
          onSelectGarimparTab={setGarimparTab}
          shopeeConfigured={shopeeConfigured}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenGroups={() => setActiveSection('grupos')}
          onAddToQueue={handleAddToQueue}
          onGenerateOffer={handleGenerateOffer}
          onShare={handleShareProduct}
          onPreview={handlePreviewProduct}
          onCopyLink={handleCopyProductLink}
          showToast={showToast}
        /></div>

        <div className={activeSection === 'fila' || activeSection === 'ofertas' ? '' : 'hidden'}><FilaPage
          queueItems={queueItems}
          groups={groups}
          onAddToQueue={handleAddToQueue}
          onRemoveFromQueue={handleRemoveFromQueue}
          onClearQueue={handleClearQueue}
          onSelectAll={handleSelectAllQueue}
          onToggleSelection={handleToggleQueueSelection}
          onOpenDispatch={() => setActiveSection('disparar')}
          onOpenGroups={() => setActiveSection('grupos')}
          showToast={showToast}
        /></div>

        <div className={activeSection === 'paginas' || activeSection === 'templates' ? '' : 'hidden'}><PaginasPage
          pages={pages}
          onCreatePage={handleCreatePage}
          onDeletePage={handleDeletePage}
          onEditPage={handleEditPage}
          onPublishPage={handlePublishPage}
          onShowToast={showToast}
        /></div>

        <div className={activeSection === 'espelhamento' ? '' : 'hidden'}><EspelhamentoPage
          groups={groups}
          templates={templates}
          mirroringConfigs={mirroringConfigs}
          onCreateMirroring={handleCreateMirroring}
          onShowToast={showToast}
        /></div>

        <div className={activeSection === 'grupos' ? '' : 'hidden'}><GruposPage
          groups={groups}
          onSelectGroups={() => setActiveSection('grupos')}
          onShowToast={showToast}
        /></div>

        <div className={activeSection === 'metricas' ? '' : 'hidden'}><MetricasPage activeMarketplace={activeMarketplace} /></div>

        <div className={activeSection === 'extensao' ? '' : 'hidden'}><ExtensaoPage
          extensionToken={extensionToken}
          panelUrl={panelUrl}
          onShowToast={showToast}
        /></div>

        <div className={activeSection === 'configuracoes' ? '' : 'hidden'}><ConfiguracoesPage
          settings={appSettings}
          templates={templates}
          coupons={coupons}
          onSaveSettings={handleSaveSettings}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onSaveCoupon={handleSaveCoupon}
          onShowToast={showToast}
          whatsappConnected={whatsappConnected}
          onDisconnectWhatsApp={handleDisconnectWhatsApp}
        /></div>

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

      <OfferPreviewModal product={selectedProduct} isOpen={isOfferModalOpen} onClose={() => setIsOfferModalOpen(false)} onShowToast={showToast} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSaveSettings={setSettings} onShowToast={showToast} />
      <NotificationsModal isOpen={isNotificationsModalOpen} onClose={() => setIsNotificationsModalOpen(false)} />
      <AnalyticsModal isOpen={isAnalyticsModalOpen} onClose={() => setIsAnalyticsModalOpen(false)} onShowToast={showToast} activeMarketplace={activeMarketplace} />
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      <MobileBottomNav activeNav={activeNav} onSelectNav={handleSelectNav} />
      <FloatingActionButtons
        whatsappConnected={whatsappConnected}
        onOpenWhatsApp={handleOpenWhatsApp}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onToggleTheme={handleToggleTheme}
        darkMode={settings.theme === 'dark'}
        onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
      />
    </div>
  );
}

export default App;
