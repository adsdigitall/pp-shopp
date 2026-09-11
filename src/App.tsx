import { useState, useEffect, useCallback, useRef } from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Product, FilterType, AffiliateSettings, SectionId, QueueItem, Template, Group, Settings as SettingsType, Coupon, GarimparTab, GarimparPlatform, GarimparFilter, DispatchStep, PageType } from './types/product';
import { productService } from './services/productService';
import { OfferPreviewModal } from './components/OfferPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AnalyticsModal } from './components/AnalyticsModal';
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
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import {
  mergeFreshProducts,
  nextRefreshPage,
  nextRefreshQuery,
} from './services/productRefresh';

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
  const base = raw.split('/')[0].split('?')[0];
  const aliases: Record<string, SectionId> = {
    '': 'visao-geral', 'visao-geral': 'visao-geral', garimpar: 'garimpar', disparar: 'disparar', disparos: 'disparar',
    fila: 'fila', ofertas: 'fila', paginas: 'paginas', espelhamento: 'espelhamento', grupos: 'grupos', metricas: 'metricas',
    extensao: 'extensao', tutoriais: 'tutoriais', suporte: 'suporte', configuracoes: 'configuracoes', whatsapp: 'whatsapp',
  };
  return aliases[base] || 'visao-geral';
};

// Deep-link da extensão: #garimpar/links abre o Garimpar já na aba Por links.
const garimparTabFromLocation = (): GarimparTab | null => {
  const raw = window.location.hash.replace(/^#/, '').toLowerCase();
  if (raw === 'garimpar/links' || raw.startsWith('garimpar/links?') || raw.startsWith('garimpar/links/')) return 'links';
  return null;
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

function normalizeQueueItem(raw: any): QueueItem {
  const source = raw?.product && typeof raw.product === 'object' ? raw.product : raw || {};
  const name = String(source.name || source.productName || source.title || raw?.productName || raw?.name || raw?.title || '').trim();
  const currentPrice = source.currentPrice ?? source.price ?? raw?.currentPrice ?? raw?.price;
  const affiliateUrl = String(source.affiliateUrl || raw?.affiliateUrl || '').trim();
  const hasRequiredData = Boolean(name) && Number.isFinite(Number(currentPrice)) && Number(currentPrice) > 0 && /^https?:\/\/\S+$/i.test(affiliateUrl);
  const product: any = {
    ...source,
    id: source.id || raw?.productId || raw?.id || `queue-product-${Date.now()}`,
    name,
    imageUrl: source.imageUrl || raw?.imageUrl || '',
    currentPrice,
    originalPrice: source.originalPrice ?? raw?.originalPrice,
    affiliateUrl,
    productUrl: source.productUrl || source.originalUrl || raw?.productUrl || raw?.originalUrl || '',
  };
  return {
    ...raw,
    id: String(raw?.id || `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    product,
    addedAt: raw?.addedAt || raw?.publishedAt || new Date().toISOString(),
    selected: hasRequiredData && raw?.selected !== false,
  } as QueueItem;
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
  const loadMoreFailuresRef = useRef(0);
  const sidebarTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('top_sales');
  const [activeNav, setActiveNav] = useState<'home' | 'products' | 'dispatch' | 'queue' | 'groups' | 'config' | 'whatsapp'>('home');
  const [activeMarketplace] = useState<Marketplace>('shopee');
  const [selectedPlatform, setSelectedPlatform] = useState<GarimparPlatform>('shopee');
  const [garimparTab, setGarimparTab] = useState<GarimparTab>(() => garimparTabFromLocation() || 'buscar');
  const [shopeeConfigured, setShopeeConfigured] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>(() => sectionFromLocation());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const seenSalesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const restoreQueue = async () => {
      try {
        const response = await fetch('/api/queue', { cache: 'no-store' });
        if (!response.ok) return;
        const body = await response.json();
        const items = Array.isArray(body?.items) ? body.items : [];
        if (!cancelled) setQueueItems(items.map(normalizeQueueItem));
      } catch {
      }
    };
    void restoreQueue();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const navBySection: Partial<Record<SectionId, 'home' | 'products' | 'dispatch' | 'queue' | 'groups' | 'config' | 'whatsapp'>> = {
      'visao-geral': 'home',
      garimpar: 'products',
      disparar: 'dispatch',
      fila: 'queue',
      ofertas: 'queue',
      grupos: 'groups',
      configuracoes: 'config',
      whatsapp: 'whatsapp',
    };
    const nextNav = navBySection[activeSection];
    if (nextNav) setActiveNav(nextNav);
  }, [activeSection]);

  useEffect(() => {
    const syncRoute = () => {
      setActiveSection(sectionFromLocation());
      const tab = garimparTabFromLocation();
      if (tab) setGarimparTab(tab);
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);
  const [dispatchDraft, setDispatchDraft] = useState<any>({ message: null, destinations: null });
  // Fechamento funcional: histórico real para Visão Geral (sem mock).
  // Fonte: GET /api/dispatch/history. Se indisponível, mantém [] neutro.
  const [dispatchHistory, setDispatchHistory] = useState<any[]>([]);
  // Cliques reais para Visão Geral (sem inventar valor).
  // Fonte: GET /api/analytics/overview -> totalClicks. Fallback neutro: 0.
  const [overviewClicks, setOverviewClicks] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dispatch/history?summary=1', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled) return;
        if (Array.isArray(body?.history)) setDispatchHistory(body.history);
      })
      .catch(() => undefined);
    fetch('/api/analytics/overview?hours=168', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled) return;
        if (Number.isFinite(Number(body?.totalClicks))) setOverviewClicks(Number(body.totalClicks));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

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

  const [settings, setSettings] = useState<AffiliateSettings>(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  // Fechamento funcional: sem grupos mockados em produção.
  // Lista real vem de GET /api/whatsapp/groups (efeito abaixo).
  // Estado inicial neutro [] usa o empty-state já aprovado ("Nenhum grupo conectado").
  const [groups, setGroups] = useState<Group[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [mirroringConfigs, setMirroringConfigs] = useState<any[]>([
    { id: 'mirror-demo', name: 'Ofertas TOP Brasil', sourceGroupId: '1', destinationGroupIds: ['2', '3'], type: 'instant', status: 'active', onlyOffers: true, templateIds: [], mirroredMessages: 128, failedMessages: 2, createdAt: '2026-09-04' },
  ]);
  const [extensionToken, setExtensionToken] = useState('');
  const [panelUrl, setPanelUrl] = useState('https://radarfertas.shop');
  const [whatsappConnected, setWhatsAppConnected] = useState(false);
  // Estado CONFIRMADO da sessão + contagem de leituras divergentes seguidas.
  // Exige 2 polls seguidos no novo estado antes de trocar (ignora oscilação
  // momentânea da WAHA) e nunca avisa na primeira carga (null = silencioso).
  const whatsappStableRef = useRef<boolean | null>(null);
  const whatsappStrikesRef = useRef(0);
  // Só mostra "conectado" se antes avisou que caiu. Evita popup repetido.
  const whatsappDropNotifiedRef = useRef(false);
  const lastWhatsAppToastRef = useRef(0);

  const [appSettings, setAppSettings] = useState<SettingsType>({
    channels: { whatsapp: { connected: false, phone: '', instanceId: '' }, telegram: { connected: false } },
    platforms: { shopee: { appId: '', secret: '', validated: true }, mercadoLivre: { affiliateTag: '' }, amazon: { associateTag: '' }, magalu: { storeSlug: '' } },
    templates: [],
    coupons: [],
    security: { safeInterval: true },
    account: { name: 'Carolina de assunção macedo', email: 'macedoc50@gmail.com', plan: 'viral', subscriptionStatus: 'active' },
  });

  useEffect(() => {
    fetch('/api/health').then((response) => response.json()).then((body) => setShopeeConfigured(body?.shopeeConfigured !== false)).catch(() => setShopeeConfigured(true));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
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
    try {
      if (typeof window !== 'undefined' && window.location?.origin) {
        setPanelUrl(window.location.origin);
      }
    } catch { /* mantém padrão */ }
    fetch('/api/extension/token', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (body?.token) setExtensionToken(body.token);
      })
      .catch(() => undefined);
  }, []);

  const handleRotateExtensionToken = useCallback(async () => {
    try {
      const response = await fetch('/api/extension/token/rotate', { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.token) throw new Error('Não foi possível gerar o token.');
      setExtensionToken(body.token);
      showToast('Novo token gerado', 'Cole o novo token no popup da extensão.', 'success');
    } catch {
      showToast('Erro ao gerar token', 'Tente novamente.', 'error');
    }
  }, [showToast]);

  // Recarrega a lista completa de grupos do WhatsApp (sync ao vivo).
  // Extraído como callback para a aba Automação oferecer "Atualizar".
  const refreshGroups = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const liveResponse = await fetch('/api/whatsapp/groups?session=default', { signal: controller.signal }).catch(() => null);
      const liveBody = await liveResponse?.json().catch(() => null);
      const savedResponse = await fetch('/api/groups', { cache: 'no-store' }).catch(() => null);
      const savedBody = await savedResponse?.json().catch(() => null);
      const liveGroups = liveResponse?.ok && Array.isArray(liveBody?.groups) ? liveBody.groups : [];
      const savedGroups = savedResponse?.ok && Array.isArray(savedBody?.groups) ? savedBody.groups : [];
      const mergedGroups = Array.from(new Map([...savedGroups, ...liveGroups].filter((group: any) => group?.id).map((group: any) => [String(group.id), group])).values());
      if (!mergedGroups.length) throw new Error('sync failed');
      setGroups(mergedGroups.map((group: any) => ({ ...group, status: group.status || 'active', isAdmin: Boolean(group.isAdmin) })));
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    refreshGroups().catch(() => undefined);
  }, [refreshGroups]);

  useEffect(() => {
    const notifyWhatsAppDrop = () => {
      const now = Date.now();
      // Cooldown: no máximo 1 aviso de queda a cada 60s, mesmo oscilando.
      if (now - lastWhatsAppToastRef.current < 60_000) return;
      lastWhatsAppToastRef.current = now;
      whatsappDropNotifiedRef.current = true;
      showToast('WhatsApp desconectado', 'A sessão caiu. Reconecte para retomar os disparos.', 'error');
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('WhatsApp desconectado', { body: 'A sessão caiu. Abra o app e reconecte para retomar os disparos.' });
        }
      } catch { /* notificação PWA opcional */ }
    };
    const refreshWhatsAppStatus = () => {
      fetch('/api/whatsapp/status').then(response => response.ok ? response.json() : null).then(body => {
        if (!body) return;
        // Ignora desconexão manual recém-feita pelo usuário (já avisada na hora).
        let manual = false;
        try {
          manual = Date.now() - Number(sessionStorage.getItem('wa-manual-disconnect') || 0) < 120_000;
        } catch { /* storage indisponível */ }
        const connected = body.status === 'connected' || body.status === 'working';
        const stable = whatsappStableRef.current;
        if (stable === null) {
          whatsappStableRef.current = connected;
          setWhatsAppConnected(connected);
          return;
        }
        if (connected === stable) {
          whatsappStrikesRef.current = 0;
          return;
        }
        // Exige 2 leituras seguidas no novo estado: filtra oscilação da WAHA.
        whatsappStrikesRef.current += 1;
        if (whatsappStrikesRef.current < 2) return;
        whatsappStableRef.current = connected;
        whatsappStrikesRef.current = 0;
        setWhatsAppConnected(connected);
        if (!connected && !manual) {
          notifyWhatsAppDrop();
        } else if (!connected) {
          whatsappDropNotifiedRef.current = false;
        } else if (whatsappDropNotifiedRef.current) {
          // Só anuncia "conectado" se antes avisou que caiu. Sem spam.
          whatsappDropNotifiedRef.current = false;
          showToast('WhatsApp conectado', 'Sessão ativa. Disparos retomados.', 'success');
        }
      }).catch(() => undefined);
    };
    refreshWhatsAppStatus();
    const intervalId = window.setInterval(refreshWhatsAppStatus, 10_000);
    return () => window.clearInterval(intervalId);
  }, [showToast]);

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
      const recentIds = [...recentProductIdsRef.current].slice(-RECENT_PRODUCTS_LIMIT);
      recentProductIdsRef.current = new Set(recentIds);
      localStorage.setItem(REFRESH_PAGE_KEY, String(targetPage));
      localStorage.setItem(DISCOVERY_INDEX_KEY, String(discovery.nextIndex));
      localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recentIds));
      lastRefreshAtRef.current = Date.now();
      loadMoreFailuresRef.current = 0;
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
      // Sempre com rotação: cada busca ou troca de filtro traz produtos novos,
      // nunca repetidos (pula os já vistos e alterna as páginas).
      loadProducts(false, true);
    }
  }, [loadProducts, activeMarketplace, activeSection, activeFilter, activeCategory, searchQuery]);

  // Botão "Garimpar": sempre puxa produtos novos (próxima página + deduplica).
  const handleGarimparSubmit = useCallback(() => {
    loadProducts(false, true);
  }, [loadProducts]);

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
      setProducts((current) => { const ids = new Set(current.map((p) => p.id)); return [...current, ...freshProducts.filter((p) => !ids.has(p.id))]; });
      setHasNextPage(result.hasNextPage);
      setCurrentPage(nextPage);
      loadMoreFailuresRef.current = 0;
    } catch {
      loadMoreFailuresRef.current += 1;
      // Após 3 falhas seguidas, para de tentar sozinho (evita espiral de
      // erro + toast). O botão Garimpar tenta de novo quando o usuário mandar.
      if (loadMoreFailuresRef.current >= 3) {
        setHasNextPage(false);
      } else {
        showToast('Não foi possível carregar mais ofertas', 'Tente novamente em instantes.', 'error');
      }
    }
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
    const intervalId = window.setInterval(() => { if (document.visibilityState === 'visible') loadProducts(true, true); }, 10 * 60 * 1000);
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
          body: JSON.stringify({ product }),
        }).catch(() => {
          showToast('Oferta adicionada localmente', 'Não foi possível sincronizar a fila agora.', 'info');
        });
        showToast('Oferta adicionada à fila', 'Disponível em Ofertas / fila para disparo manual.', 'success');
      }
    } else {
      setActiveSection('garimpar');
      setMobileSidebarOpen(false);
      window.history.pushState({}, '', `#garimpar`);
      document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGenerateOffer = (product: Product) => {
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
    setQueueItems(prev => prev.map(item => {
      const product = item.product;
      const complete = Boolean(product.name?.trim())
        && Number.isFinite(Number(product.currentPrice))
        && Number(product.currentPrice) > 0
        && /^https?:\/\/\S+$/i.test(String(product.affiliateUrl || ''));
      return { ...item, selected: complete ? selected : false };
    }));
  };

  const handleToggleQueueSelection = (queueId: string) => {
    setQueueItems(prev => prev.map(item => item.id === queueId ? { ...item, selected: !item.selected } : item));
  };

  const handleSendQueueItemNow = async (queueId: string) => {
    try {
      const response = await fetch(`/api/queue/${encodeURIComponent(queueId)}/send-now`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível enviar agora.');
      showToast('Oferta enfileirada', 'O disparo manual imediato foi criado.', 'success');
    } catch (error) { showToast('Erro ao enviar agora', error instanceof Error ? error.message : 'Tente novamente.', 'error'); }
  };

  const handleSaveQueueSelection = (selectedIds: string[]) => {
    setQueueItems(prev => prev.map(item => ({ ...item, selected: selectedIds.includes(item.id) })));
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
          offers: selectedQueue.map(item => { const raw: any = item as any; const product: any = raw.product || raw; return ({ id: product.productId || product.id, name: product.productName || product.name || product.title || '', productName: product.productName || product.name || product.title || '', title: product.title || product.productName || product.name || '', currentPrice: product.price ?? product.currentPrice, originalPrice: product.originalPrice, discountPercentage: product.discountPercentage ?? product.discountPercent, salesCount: product.salesCount ?? product.sales, salesCountText: product.salesCountText, rating: product.rating, reviewsCount: product.reviewsCount, category: product.category, categoryId: product.categoryId, shortDescription: product.shortDescription, highlightPoints: product.highlightPoints, affiliateUrl: product.affiliateUrl || product.affiliateLink, productUrl: product.originalUrl || product.productUrl, imageUrl: product.imageUrl || product.image }); }),
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

  const handleSaveSettings = (newSettings: Partial<SettingsType>) => {
    // Credenciais Shopee são gerenciadas SÓ via /api/integrations/shopee/*.
    // Nunca entram no settings (estado, PUT ou qualquer storage).
    const clean: Partial<SettingsType> = { ...newSettings };
    if (clean.platforms?.shopee && (clean.platforms.shopee.appId || clean.platforms.shopee.secret)) {
      clean.platforms = {
        ...clean.platforms,
        shopee: { ...clean.platforms.shopee, appId: '', secret: '' },
      };
    }
    setAppSettings(prev => ({ ...prev, ...clean }));
    // Espelha as etiquetas (ML/Amazon/Magalu) no servidor: é de lá que a
    // extensão e o "Por links" leem pra gerar o link de afiliado.
    if (clean.platforms) {
      void fetch('/api/settings/platforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clean.platforms),
      }).catch(() => undefined);
    }
    showToast('Configurações salvas', undefined, 'success');
  };

  const handleSaveTemplate = (template: Template) => { setTemplates(prev => { const exists = prev.find(t => t.id === template.id); return exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template]; }); };

  const handleDeleteTemplate = (templateId: string) => { setTemplates(prev => prev.filter(t => t.id !== templateId)); };

  const handleSaveCoupon = (coupon: Coupon) => { setCoupons(prev => [...prev, coupon]); };

  const handleDisconnectWhatsApp = () => {
    try {
      sessionStorage.setItem('wa-manual-disconnect', String(Date.now()));
    } catch { /* storage indisponível */ }
    whatsappStableRef.current = false;
    whatsappStrikesRef.current = 0;
    whatsappDropNotifiedRef.current = false;
    setWhatsAppConnected(false);
    showToast('WhatsApp desconectado', undefined, 'info');
  };

  const handleOpenWhatsApp = () => { setActiveSection('whatsapp'); setMobileSidebarOpen(false); };

  const handleToggleTheme = () => { setSettings(prev => { const themes = ['light', 'dark', 'system'] as const; const current = themes.indexOf(prev.theme); const next = themes[(current + 1) % themes.length]; localStorage.setItem('radar-theme', next); return { ...prev, theme: next }; }); };

  const handleSelectNav = (nav: 'home' | 'products' | 'dispatch' | 'queue' | 'groups' | 'config' | 'whatsapp') => {
    setActiveNav(nav);
    const section: SectionId = nav === 'groups' ? 'grupos' : nav === 'config' ? 'configuracoes' : nav === 'dispatch' ? 'disparar' : nav === 'products' ? 'garimpar' : nav === 'whatsapp' ? 'whatsapp' : nav === 'queue' ? 'fila' : 'visao-geral';
    setActiveSection(section);
    setMobileSidebarOpen(false);
    window.history.pushState({}, '', `#${section}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const user = {
    name: appSettings.account.name,
    email: appSettings.account.email,
    plan: appSettings.account.plan,
  };

  const navigate = (section: SectionId) => {
    setMobileSidebarOpen(false);
    setActiveSection(section);
    window.history.pushState({}, '', `#${section}`);
    const target = section;
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <TooltipProvider>
    <div className="app-shell min-h-screen min-w-0 overflow-x-hidden font-sans transition-colors duration-normal bg-gradient-to-br from-[var(--background)] via-[var(--surface)] to-[var(--background)]">

      <DesktopSidebar
        activeSection={activeSection}
        mobileOpen={mobileSidebarOpen}
        onToggleMobile={() => setMobileSidebarOpen((open) => !open)}
        onNavigate={navigate}
        onDispatch={() => setActiveSection('disparar')}
        onGroups={() => setActiveSection('grupos')}
        onSettings={() => { setActiveSection('configuracoes'); setMobileSidebarOpen(false); }}
        onNotifications={() => setIsNotificationsModalOpen(true)}
        onAnalytics={() => { setActiveSection('metricas'); setMobileSidebarOpen(false); }}
      />
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        whatsappConnected={whatsappConnected}
        user={user}
        className="lg:ml-64"
      />

      <main className="min-w-0 w-full max-w-none flex-1 space-y-5 px-3 pb-28 pt-4 sm:space-y-6 sm:px-6 sm:pb-10 sm:pt-6 lg:ml-64 lg:px-10 xl:px-12">
        <div className={activeSection === 'visao-geral' ? '' : 'hidden'}><VisaoGeral
          onNavigateToGarimpar={() => { setActiveSection('garimpar'); setMobileSidebarOpen(false); }}
          onNavigateToDispatch={() => { setActiveSection('disparar'); }}
          onNavigateToGroups={() => { setActiveSection('grupos'); setMobileSidebarOpen(false); }}
          onNavigateToQueue={() => { setActiveSection('fila'); setMobileSidebarOpen(false); }}
          onNavigateToWhatsApp={() => { setActiveSection('whatsapp'); setMobileSidebarOpen(false); window.history.pushState({}, '', '#whatsapp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          queuedCount={queueItems.length}
          dispatchCount={dispatchHistory.filter((job: any) => job.createdAt && new Date(job.createdAt).toDateString() === new Date().toDateString()).length}
          groupsCount={groups.length}
          clicksCount={overviewClicks}
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
          onSearchSubmit={handleGarimparSubmit}
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
          onSendNow={handleSendQueueItemNow}
          onOpenDispatch={() => setActiveSection('disparar')}
          onOpenGroups={() => setActiveSection('grupos')}
          showToast={showToast}
          onRefreshGroups={refreshGroups}
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
          onSelectGroups={() => { setActiveSection('whatsapp'); setMobileSidebarOpen(false); window.history.pushState({}, '', '#whatsapp'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          onShowToast={showToast}
        /></div>

        <div className={activeSection === 'metricas' ? '' : 'hidden'}><MetricasPage activeMarketplace={activeMarketplace} /></div>

        <div className={activeSection === 'extensao' ? '' : 'hidden'}><ExtensaoPage
          extensionToken={extensionToken}
          panelUrl={panelUrl}
          onRotateToken={handleRotateExtensionToken}
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

        <section id="tutoriais" className={`${activeSection === 'tutoriais' ? '' : 'hidden'} space-y-5`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Passo a passo</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">Tutoriais</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Do produto ao envio em 3 passos, usando as telas do app.</p>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="panel p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-sm font-black text-[var(--primary)]">1</span>
              <h3 className="mt-3 font-black text-[var(--foreground)]">Escolha um produto</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">No Garimpar, busque e adicione ofertas à Fila. Só entram itens com nome, preço e link de afiliado.</p>
              <a href="#garimpar" className="btn-brand mt-4 inline-block rounded-xl px-4 py-2 text-xs font-black text-white">Abrir Garimpar</a>
            </div>
            <div className="panel p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-sm font-black text-[var(--primary)]">2</span>
              <h3 className="mt-3 font-black text-[var(--foreground)]">Gere e revise</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Na Fila, selecione as ofertas e revise a mensagem com os templates de Configurações antes de disparar.</p>
              <a href="#fila" className="mt-4 inline-block rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Abrir Fila</a>
            </div>
            <div className="panel p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-sm font-black text-[var(--primary)]">3</span>
              <h3 className="mt-3 font-black text-[var(--foreground)]">Copie e envie</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">No Disparar, escolha os grupos do WhatsApp conectado e confirme. O ritmo seguro respeita o intervalo mínimo.</p>
              <a href="#disparar" className="mt-4 inline-block rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Abrir Disparar</a>
            </div>
          </div>
        </section>

        <section id="suporte" className={`${activeSection === 'suporte' ? '' : 'hidden'} space-y-5`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Ajuda</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--foreground)]">Suporte</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Caminhos reais dentro do app para resolver o que você precisa.</p>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="panel p-5">
              <h3 className="font-black text-[var(--foreground)]">WhatsApp não conecta?</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Veja o status da sessão, gere um novo QR Code ou reconecte na página do WhatsApp.</p>
              <a href="#whatsapp" className="mt-4 inline-block rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Ver status do WhatsApp</a>
            </div>
            <div className="panel p-5">
              <h3 className="font-black text-[var(--foreground)]">Extensão não envia?</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Confira token, URL do painel e os pré-requisitos de cada loja na página da extensão.</p>
              <a href="#extensao" className="mt-4 inline-block rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">Abrir página da extensão</a>
            </div>
            <div className="panel p-5">
              <h3 className="font-black text-[var(--foreground)]">Links sem comissão?</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Valide etiquetas e tags de afiliado (ML, Amazon, Magalu) e o ritmo de envio nas configurações.</p>
              <button type="button" onClick={() => setIsSettingsModalOpen(true)} className="btn-brand mt-4 rounded-xl px-4 py-2 text-xs font-black text-white">Abrir configurações</button>
            </div>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">Dúvidas frequentes</p>
            <ul className="mt-3 space-y-2 text-xs text-[var(--text-secondary)]">
              <li><strong className="text-[var(--foreground)]">O disparo respeita intervalo?</strong> Sim — o ritmo seguro mantém o intervalo automático e mínimo de 20 minutos entre envios.</li>
              <li><strong className="text-[var(--foreground)]">Onde ficam as credenciais da Shopee?</strong> Somente no servidor; a tela de Configurações mostra apenas o status da conexão.</li>
              <li><strong className="text-[var(--foreground)]">Por que a Shopee pede para colar títulos?</strong> Na Shopee a extensão copia os títulos da página; a busca do Garimpar traz os produtos com seu link de afiliado.</li>
            </ul>
          </div>
        </section>
      </main>

      <OfferPreviewModal product={selectedProduct} isOpen={isOfferModalOpen} onClose={() => setIsOfferModalOpen(false)} onShowToast={showToast} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSaveSettings={setSettings} onShowToast={showToast} />
      <NotificationsModal isOpen={isNotificationsModalOpen} onClose={() => setIsNotificationsModalOpen(false)} />
      <AnalyticsModal isOpen={isAnalyticsModalOpen} onClose={() => setIsAnalyticsModalOpen(false)} onShowToast={showToast} activeMarketplace={activeMarketplace} />
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      <MobileBottomNav
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        activeSection={activeSection}
        onNavigateSection={(section) => {
          setActiveSection(section as SectionId);
          setMobileSidebarOpen(false);
          window.history.pushState({}, '', `#${section}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
      <FloatingActionButtons
        whatsappConnected={whatsappConnected}
        onOpenWhatsApp={handleOpenWhatsApp}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onToggleTheme={handleToggleTheme}
        darkMode={settings.theme === 'dark'}
        onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
      />
    </div>
    </TooltipProvider>
  );
}

export default App;
