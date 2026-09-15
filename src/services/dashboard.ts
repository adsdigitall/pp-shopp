// Contrato de GET /api/dashboard (server/services/analytics/dashboard.mjs).

export type DashboardPeriod = 'today' | '7d' | '30d';

export interface DashboardKpi {
  value: number;
  previous: number;
  series: number[];
}

export interface DashboardActivity {
  type: 'sale' | 'send' | 'send_failed';
  at: string;
  tone: 'success' | 'warning' | 'danger';
  title: string;
  detail: string;
}

export interface DashboardProduct {
  name: string;
  image: string | null;
  price: number;
  count: number;
}

/** paid = pago esperando entrega; completed = concluído; unpaid = não pago; cancelled = cancelado. */
export type SaleStatus = 'paid' | 'completed' | 'unpaid' | 'cancelled';

export interface DashboardSale {
  id: string;
  at: string;
  status: SaleStatus;
  product: string;
  image: string | null;
  price: number;
  qty: number;
  extraItems: number;
  commission: number;
}

export const SALE_STATUS_INFO: Record<SaleStatus, { label: string; hint: string }> = {
  paid: { label: 'Paga', hint: 'Pedido pago. A comissão libera quando o cliente receber.' },
  completed: { label: 'Concluída', hint: 'Pedido entregue. Comissão confirmada.' },
  unpaid: { label: 'Aguardando pagamento', hint: 'O cliente ainda não pagou. Só conta quando pagar.' },
  cancelled: { label: 'Cancelada', hint: 'Pedido cancelado. Não gera comissão.' },
};

export interface DashboardData {
  period: DashboardPeriod;
  kpis: {
    commission: DashboardKpi;
    sales: DashboardKpi;
    sends: DashboardKpi;
    activeGroups: DashboardKpi & { names: string[] };
  };
  series: { key: string; label: string; commission: number; sales: number; sends: number }[];
  activity: DashboardActivity[];
  topProducts: { kind: 'sold' | 'sent'; items: DashboardProduct[] };
  sales: DashboardSale[];
  salesSummary: Record<SaleStatus, { count: number; commission: number }>;
  salesAvailable: boolean;
  salesTruncated: boolean;
  generatedAt: string;
}

export async function fetchDashboard(period: DashboardPeriod, signal?: AbortSignal): Promise<DashboardData> {
  const response = await fetch(`/api/dashboard?period=${period}`, { cache: 'no-store', signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.kpis) {
    throw new Error(body?.error?.message || 'Não foi possível carregar a visão geral.');
  }
  return body as DashboardData;
}

export const PERIOD_OPTIONS: { value: DashboardPeriod; label: string; comparison: string }[] = [
  { value: 'today', label: 'Hoje', comparison: 'vs. ontem' },
  { value: '7d', label: '7 dias', comparison: 'vs. semana anterior' },
  { value: '30d', label: '30 dias', comparison: 'vs. mês anterior' },
];

export const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatRelativeTime(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Ontem' : `Há ${days} dias`;
}
