// Contrato de GET /api/queue/overview e GET /api/queue/:id/preview.

export interface QueueProductSummary {
  name: string;
  image: string | null;
  price: number | null;
  originalPrice: number | null;
  discount: number | null;
  marketplace: string;
  affiliateUrl: string | null;
}

export interface ScheduledDispatch {
  jobId: string;
  status: 'pending' | 'paused' | 'waiting_connection' | 'running';
  automatic: boolean;
  product: QueueProductSummary;
  offersCount: number;
  groups: { id: string; name: string }[];
  groupsCount: number;
  interval: { value: number; unit: string } | null;
  scheduledAt: string | null;
  createdAt: string | null;
  sent: number;
  total: number;
}

export interface DispatchEvent {
  jobId: string;
  automatic: boolean;
  product: QueueProductSummary;
  groupsCount: number;
  groupNames: string[];
  at: string;
  error: string | null;
}

export interface QueueOverview {
  counts: { scheduled: number; sentToday: number; sentYesterday: number; failedToday: number; failedYesterday: number };
  series: { sent: number[]; failed: number[] };
  scheduled: ScheduledDispatch[];
  sent: DispatchEvent[];
  failed: DispatchEvent[];
}

export async function fetchQueueOverview(signal?: AbortSignal): Promise<QueueOverview> {
  const response = await fetch('/api/queue/overview', { cache: 'no-store', signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.counts) throw new Error(body?.error?.message || 'Não foi possível carregar os disparos.');
  return body as QueueOverview;
}

export async function fetchQueuePreview(queueId: string, signal?: AbortSignal): Promise<{ message: string; templateConfigured: boolean }> {
  const response = await fetch(`/api/queue/${encodeURIComponent(queueId)}/preview`, { cache: 'no-store', signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.message !== 'string') throw new Error(body?.error?.message || 'Não foi possível montar a prévia.');
  return body;
}

export const MARKETPLACE_INFO: Record<string, { label: string; logo: string | null }> = {
  shopee: { label: 'Shopee', logo: '/brand/marketplaces/shopee.png' },
  mercado_livre: { label: 'Mercado Livre', logo: '/brand/marketplaces/mercado-livre.png' },
  amazon: { label: 'Amazon', logo: '/brand/marketplaces/amazon.png' },
  magalu: { label: 'Magalu', logo: '/brand/marketplaces/magalu.png' },
};

export const marketplaceInfo = (id?: string | null) => MARKETPLACE_INFO[id || ''] || { label: id || 'Loja', logo: null };

/** Marketplace salvo ou deduzido do link (itens da automação não gravam o campo). */
export function inferMarketplace(marketplace?: string | null, ...urls: (string | null | undefined)[]) {
  if (marketplace && MARKETPLACE_INFO[marketplace]) return marketplace;
  const host = urls.map((url) => { try { return new URL(String(url)).hostname.toLowerCase(); } catch { return ''; } }).join(' ');
  if (/shopee/.test(host)) return 'shopee';
  if (/mercadolivre|mercadolibre|meli.la/.test(host)) return 'mercado_livre';
  if (/amazon|amzn.to/.test(host)) return 'amazon';
  if (/magazineluiza|magalu/.test(host)) return 'magalu';
  return marketplace || '';
}

export const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatInterval(interval?: { value: number; unit: string } | null) {
  if (!interval || !Number(interval.value)) return 'Imediato';
  const unit = interval.unit === 'hours' ? 'h' : interval.unit === 'minutes' ? 'min' : 'seg';
  return `${interval.value} ${unit}`;
}

/** "Hoje 14:30", "Ontem 09:00" ou "25/09 11:30" no horário de Brasília. */
export function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  const tz = 'America/Sao_Paulo';
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(date);
  if (day(date) === day(new Date())) return `Hoje ${time}`;
  if (day(date) === day(new Date(Date.now() - 86_400_000))) return `Ontem ${time}`;
  return `${new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' }).format(date)} ${time}`;
}
