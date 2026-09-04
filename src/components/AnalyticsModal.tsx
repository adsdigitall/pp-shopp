import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, ExternalLink, TrendingUp, ShoppingCart, DollarSign, MousePointer, Eye, Loader2, Calendar, Filter } from 'lucide-react';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  activeMarketplace: 'shopee' | 'mercado_livre';
}

interface ClickData {
  id: string;
  productId: string;
  productName: string;
  marketplace: string;
  clicks: number;
  conversions: number;
  commission: number;
  lastClickAt: string;
  affiliateUrl: string;
}

interface ConversionData {
  id: string;
  productId: string;
  productName: string;
  orderId: string;
  purchaseTime: string;
  commission: number;
  netCommission: number;
  status: string;
  items: Array<{
    itemId: string;
    itemName: string;
    itemPrice: number;
    qty: number;
    commission: number;
  }>;
}

interface AnalyticsSummary {
  totalClicks: number;
  totalConversions: number;
  totalCommission: number;
  conversionRate: number;
  topProducts: ClickData[];
  recentConversions: ConversionData[];
  commissionStatus: {
    unknown: number;
    pending: number;
    validated: number;
    rejected: number;
    cancelled: number;
  };
  marketplaces: string[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  activeMarketplace,
}) => {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalClicks: 0,
    totalConversions: 0,
    totalCommission: 0,
    conversionRate: 0,
    topProducts: [],
    recentConversions: [],
    commissionStatus: { unknown: 0, pending: 0, validated: 0, rejected: 0, cancelled: 0 },
    marketplaces: [],
  });
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      
      const res = await fetch(`/api/analytics?marketplace=all&hours=${hours}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'analytics');
      setSummary(data);
    } catch {
      onShowToast('Erro ao carregar analytics', 'Tente novamente', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeMarketplace, timeRange, onShowToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAnalytics, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                Analytics - Todos os marketplaces
              </h2>
              <p className="text-xs text-slate-500">Cliques, conversões e comissões em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span>Auto (1min)</span>
            </label>
            <button onClick={fetchAnalytics} disabled={loading} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Time Range Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${
                timeRange === range
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {range === '24h' ? '24h' : range === '7d' ? '7 dias' : '30 dias'}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            icon={<MousePointer className="w-5 h-5" />}
            label="Cliques Totais"
            value={summary.totalClicks.toLocaleString('pt-BR')}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <SummaryCard
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Conversões"
            value={summary.totalConversions.toLocaleString('pt-BR')}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <SummaryCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Comissão Total"
            value={formatCurrency(summary.totalCommission)}
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Taxa Conversão"
            value={`${summary.conversionRate.toFixed(2)}%`}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
        </div>

        <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span className="font-bold text-slate-700">Comissões:</span>
          <span className="text-emerald-700">Validadas: {summary.commissionStatus.validated}</span>
          <span className="text-amber-700">Pendentes: {summary.commissionStatus.pending}</span>
          <span className="text-slate-600">Não validadas: {summary.commissionStatus.unknown}</span>
          <span className="text-red-700">Rejeitadas: {summary.commissionStatus.rejected}</span>
          {summary.marketplaces.length > 0 && <span className="text-slate-500">Fontes: {summary.marketplaces.join(', ')}</span>}
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex border-b border-slate-100 bg-slate-50 px-4">
            <button className="py-3 px-4 text-sm font-bold border-b-2 border-blue-500 text-blue-600">Top Produtos (Cliques)</button>
            <button className="py-3 px-4 text-sm font-bold border-b-2 border-transparent text-slate-500">Conversões Recentes</button>
          </div>

          {/* Top Products by Clicks */}
          <div className="p-4 space-y-3">
            {summary.topProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Eye className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">Nenhum clique registrado neste período</p>
                <p className="text-xs text-slate-400 mt-1">Compartilhe links para começar a rastrear</p>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.topProducts.map((product, index) => (
                  <ProductAnalyticsRow
                    key={product.id}
                    product={product}
                    rank={index + 1}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}> = ({ icon, label, value, color, bgColor }) => (
  <div className={`p-4 rounded-2xl ${bgColor} border border-slate-200`}>
    <div className="flex items-center justify-between">
      <div className={color}>{icon}</div>
      <div className="text-right">
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
        <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      </div>
    </div>
  </div>
);

interface ProductAnalyticsRowProps {
  product: {
    id: string;
    productId: string;
    productName: string;
    marketplace: string;
    clicks: number;
    conversions: number;
    commission: number;
    lastClickAt: string;
    affiliateUrl: string;
  };
  rank: number;
  formatCurrency: (v: number) => string;
  formatDate: (d: string) => string;
}

const ProductAnalyticsRow: React.FC<ProductAnalyticsRowProps> = ({ product, rank, formatCurrency, formatDate }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-3 hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      <span className="w-6 text-center text-xs font-bold text-slate-400">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">{product.productName}</p>
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">{product.marketplace}</span>
          <span>Último clique: {formatDate(product.lastClickAt)}</span>
        </p>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div className="text-center">
          <p className="text-lg font-extrabold text-blue-600">{product.clicks}</p>
          <p className="text-[10px] text-slate-500">Cliques</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-green-600">{product.conversions}</p>
          <p className="text-[10px] text-slate-500">Vendas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-amber-600">{formatCurrency(product.commission)}</p>
          <p className="text-[10px] text-slate-500">Comissão</p>
        </div>
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
          title="Abrir link afiliado"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
    {product.conversions > 0 && (
      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="font-medium text-green-600">{product.conversions} conversão(ões) realizada(s)</span>
      </div>
    )}
  </div>
);
