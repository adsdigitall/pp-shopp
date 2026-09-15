// Notificações de venda no aparelho (PWA). Servidor: /api/push/* e /api/sale-alerts.

export type PushSupport = 'supported' | 'unsupported' | 'ios-needs-install';

export interface SaleAlert {
  id: string;
  kind: 'paid' | 'unpaid' | 'payment_confirmed' | 'completed' | 'summary';
  title: string;
  body: string;
  createdAt: string;
  devices: number;
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupport(): PushSupport {
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos() && !isStandalone()) return 'ios-needs-install';
  return hasApis ? 'supported' : 'unsupported';
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

function decodeKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function currentSubscription() {
  if (pushSupport() !== 'supported') return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Erro ${response.status}`);
  return data as T;
}

export interface PushState {
  support: PushSupport;
  permission: NotificationPermission | 'unsupported';
  /** Este aparelho está inscrito e registrado no servidor. */
  enabled: boolean;
  devices: number;
  configured: boolean;
}

export async function getPushState(): Promise<PushState> {
  const support = pushSupport();
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  const subscription = await currentSubscription().catch(() => null);
  const status = await postJson<{ configured: boolean; subscribed: boolean; devices: number }>('/api/push/status', { endpoint: subscription?.endpoint }).catch(() => ({ configured: false, subscribed: false, devices: 0 }));
  return { support, permission, enabled: Boolean(subscription && status.subscribed && permission === 'granted'), devices: status.devices, configured: status.configured };
}

export async function enablePush(): Promise<void> {
  if (pushSupport() !== 'supported') throw new Error('Este navegador não aceita notificações.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão negada. Libere as notificações do Radar nas configurações do navegador.');
  const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' });
  const keyBody = await keyResponse.json().catch(() => ({}));
  if (!keyResponse.ok || !keyBody.publicKey) throw new Error(keyBody?.error?.message || 'Notificações indisponíveis no servidor agora.');
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    // Inscrição feita com outra chave não recebe nada: refaz.
    const current = subscription.options?.applicationServerKey;
    const expected = decodeKey(keyBody.publicKey);
    const same = current && new Uint8Array(current).every((byte, i) => byte === expected[i]) && new Uint8Array(current).length === expected.length;
    if (!same) { await subscription.unsubscribe(); subscription = null; }
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(keyBody.publicKey) });
  }
  await postJson('/api/push/subscribe', subscription.toJSON());
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await postJson('/api/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription.unsubscribe();
}

export async function sendTestPush(): Promise<{ sent: number }> {
  return postJson<{ sent: number }>('/api/push/test', {});
}

export async function fetchSaleAlerts(): Promise<{ alerts: SaleAlert[]; checkedAt: string | null }> {
  const response = await fetch('/api/sale-alerts', { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar os avisos.');
  return response.json();
}

const SEEN_KEY = 'radar.saleAlerts.seenAt';
export function getAlertsSeenAt(): string {
  try { return localStorage.getItem(SEEN_KEY) || ''; } catch { return ''; }
}
export function markAlertsSeen(at = new Date().toISOString()) {
  try { localStorage.setItem(SEEN_KEY, at); } catch { /* sem armazenamento local */ }
}
