/**
 * Decide quais avisos de venda mandar comparando o relatório da Shopee com o
 * último status conhecido de cada pedido. Função pura: quem chama lê/grava o estado.
 *
 * Avisa: venda nova paga, pedido novo não pago, não pago -> pago, pago -> concluído.
 * Não avisa: cancelamentos e "voltas" de status (a Shopee às vezes oscila).
 */
import { saleStatus } from '../analytics/dashboard.mjs';

const RANK = { unpaid: 1, paid: 2, completed: 3, cancelled: 4 };

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function describe(conversion) {
  const items = (Array.isArray(conversion?.orders) ? conversion.orders : []).flatMap((o) => (Array.isArray(o?.items) ? o.items : []));
  const name = String(items[0]?.itemName || 'Produto Shopee').replace(/\s+/g, ' ').trim();
  const product = name.length > 60 ? `${name.slice(0, 57)}…` : name;
  const commission = Number(conversion?.netCommission ?? conversion?.totalCommission ?? 0) || 0;
  return { product, commission, extra: Math.max(0, items.length - 1) };
}

function alertFor(kind, conversion) {
  const { product, commission, extra } = describe(conversion);
  const more = extra ? ` (+${extra} ${extra === 1 ? 'item' : 'itens'})` : '';
  const texts = {
    paid: { title: '💰 Venda paga!', body: `Comissão ${money(commission)} · ${product}${more}` },
    unpaid: { title: '🕒 Pedido aguardando pagamento', body: `${money(commission)} de comissão se for pago · ${product}${more}` },
    payment_confirmed: { title: '✅ Pagamento confirmado', body: `Comissão ${money(commission)} · ${product}${more}` },
    completed: { title: '🎉 Venda concluída', body: `Comissão liberada: ${money(commission)} · ${product}${more}` },
  };
  return { conversionId: String(conversion.conversionId), kind, commission, product, ...texts[kind] };
}

export function planSaleAlerts({ conversions = [], previous = null, maxIndividual = 4, maxState = 600 } = {}) {
  const known = previous?.statuses && typeof previous.statuses === 'object' ? { ...previous.statuses } : null;
  const next = { ...(known || {}) };
  const alerts = [];

  for (const conversion of Array.isArray(conversions) ? conversions : []) {
    const id = conversion?.conversionId ? String(conversion.conversionId) : null;
    if (!id) continue;
    const status = saleStatus(conversion);
    const before = known ? known[id] : undefined;

    if (!known) { next[id] = status; continue; }

    if (before === undefined) {
      if (status === 'paid' || status === 'completed') alerts.push(alertFor('paid', conversion));
      else if (status === 'unpaid') alerts.push(alertFor('unpaid', conversion));
      next[id] = status;
      continue;
    }
    if (before === status) continue;
    // Só avança; cancelado é final e não gera aviso.
    if (status === 'cancelled') { next[id] = 'cancelled'; continue; }
    if (RANK[status] <= RANK[before] || before === 'cancelled') continue;
    if (before === 'unpaid' && status === 'paid') alerts.push(alertFor('payment_confirmed', conversion));
    else if (status === 'completed') alerts.push(alertFor('completed', conversion));
    next[id] = status;
  }

  // Mantém os mais recentes (ordem de inserção) para o estado não crescer sem fim.
  const entries = Object.entries(next);
  const statuses = Object.fromEntries(entries.slice(Math.max(0, entries.length - maxState)));

  if (alerts.length > maxIndividual) {
    const sales = alerts.filter((a) => a.kind === 'paid' || a.kind === 'payment_confirmed');
    const total = sales.reduce((sum, a) => sum + a.commission, 0);
    const others = alerts.length - sales.length;
    const parts = [];
    if (sales.length) parts.push(`${money(total)} em comissão`);
    if (others) parts.push(`${others} ${others === 1 ? 'outra atualização' : 'outras atualizações'}`);
    return {
      alerts: [{
        conversionId: 'summary',
        kind: 'summary',
        commission: total,
        product: '',
        title: sales.length ? `💰 ${sales.length} vendas novas!` : `${alerts.length} atualizações de pedidos`,
        body: `${parts.join(' · ')}. Toque para ver.`,
      }],
      state: { statuses },
    };
  }
  return { alerts, state: { statuses } };
}
