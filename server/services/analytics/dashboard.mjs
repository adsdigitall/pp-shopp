/**
 * Números da Visão Geral a partir de dados reais: relatório de conversões da
 * Shopee (vendas/comissão) e tentativas de envio salvas nos disparos.
 * Nada é estimado: sem gasto de anúncio não há ROAS/CPA, então eles não existem aqui.
 * Faixas de dia/hora no horário de Brasília.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PERIODS = { today: { buckets: 24, unit: 'hour' }, '7d': { buckets: 7, unit: 'day' }, '30d': { buckets: 30, unit: 'day' } };
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function zonedParts(ms, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

function money(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Janela atual e anterior + função que diz em qual faixa um instante cai. */
function buildWindows(period, now, timeZone) {
  const { buckets, unit } = PERIODS[period];
  const today = zonedParts(now, timeZone).day;
  if (unit === 'hour') {
    const yesterday = zonedParts(now - DAY, timeZone).day;
    const labels = Array.from({ length: 24 }, (_, h) => ({ key: `${today}T${String(h).padStart(2, '0')}`, label: `${String(h).padStart(2, '0')}h` }));
    const nowHour = zonedParts(now, timeZone).hour;
    return {
      labels,
      locate(ms) {
        const { day, hour } = zonedParts(ms, timeZone);
        if (day === today) return { window: 'current', index: hour };
        // "vs. ontem" compara com ontem até a mesma hora.
        if (day === yesterday && hour <= nowHour) return { window: 'previous', index: hour };
        return null;
      },
    };
  }
  const dayKeys = Array.from({ length: buckets * 2 }, (_, i) => zonedParts(now - i * DAY, timeZone).day);
  const current = dayKeys.slice(0, buckets).reverse();
  const previous = new Set(dayKeys.slice(buckets));
  const labels = current.map((key) => ({ key, label: `${key.slice(8, 10)} ${MONTHS[Number(key.slice(5, 7)) - 1]}` }));
  const indexOf = new Map(current.map((key, i) => [key, i]));
  return {
    labels,
    locate(ms) {
      const { day } = zonedParts(ms, timeZone);
      if (indexOf.has(day)) return { window: 'current', index: indexOf.get(day) };
      if (previous.has(day)) return { window: 'previous', index: -1 };
      return null;
    },
  };
}

function conversionTime(conversion) {
  const raw = toNumber(conversion?.purchaseTime);
  if (!raw) return NaN;
  return raw < 1e12 ? raw * 1000 : raw;
}

function conversionItems(conversion) {
  return (Array.isArray(conversion?.orders) ? conversion.orders : [])
    .flatMap((order) => (Array.isArray(order?.items) ? order.items : []))
    .filter(Boolean);
}

// Envio acontece a cada poucos minutos e empurraria as vendas para fora da lista:
// reserva lugar para as 2 vendas mais recentes e completa com envios.
function recentActivity(events, limit = 6) {
  const newestFirst = [...events].sort((a, b) => b.at.localeCompare(a.at));
  const sales = newestFirst.filter((event) => event.type === 'sale').slice(0, 2);
  const others = newestFirst.filter((event) => event.type !== 'sale').slice(0, limit - sales.length);
  return [...sales, ...others].sort((a, b) => b.at.localeCompare(a.at));
}

export function buildDashboard({ conversions = [], jobs = [], period = '7d', now = Date.now(), timeZone = 'America/Sao_Paulo' } = {}) {
  const safePeriod = PERIODS[period] ? period : '7d';
  const { labels, locate } = buildWindows(safePeriod, now, timeZone);
  const series = labels.map(({ key, label }) => ({ key, label, commission: 0, sales: 0, sends: 0, groups: new Set() }));
  const totals = {
    current: { commission: 0, sales: 0, sends: 0, groups: new Map() },
    previous: { commission: 0, sales: 0, sends: 0, groups: new Map() },
  };
  const activity = [];
  const sold = new Map();

  for (const conversion of Array.isArray(conversions) ? conversions : []) {
    if (!conversion) continue;
    const at = conversionTime(conversion);
    if (!Number.isFinite(at) || at > now + HOUR) continue;
    const cancelled = String(conversion.conversionStatus || '').toUpperCase() === 'CANCELLED';
    const items = conversionItems(conversion);
    const place = locate(at);
    if (place && !cancelled) {
      const commission = toNumber(conversion.netCommission ?? conversion.totalCommission);
      const bucket = totals[place.window];
      bucket.commission += commission;
      bucket.sales += 1;
      if (place.window === 'current') {
        series[place.index].commission += commission;
        series[place.index].sales += 1;
        for (const item of items) {
          const key = String(item.itemId || item.itemName || '');
          if (!key) continue;
          const entry = sold.get(key) || { name: String(item.itemName || 'Produto'), image: item.imageUrl || null, price: toNumber(item.itemPrice), count: 0 };
          entry.count += Math.max(1, toNumber(item.qty));
          sold.set(key, entry);
        }
      }
    }
    const first = items[0];
    const status = String(conversion.conversionStatus || '').toUpperCase();
    activity.push({
      type: 'sale',
      at: new Date(at).toISOString(),
      tone: cancelled ? 'danger' : status === 'COMPLETED' ? 'success' : 'warning',
      title: cancelled ? 'Venda cancelada' : status === 'COMPLETED' ? 'Venda aprovada' : 'Nova venda (pendente)',
      detail: `${money(toNumber(first?.itemPrice))} — ${String(first?.itemName || 'Shopee')}`,
    });
  }

  const sentProducts = new Map();
  const sendEvents = new Map();
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || !Array.isArray(job.attempts)) continue;
    const groupNames = new Map((Array.isArray(job.destinations?.groups) ? job.destinations.groups : []).filter((g) => g?.id).map((g) => [String(g.id), g.name]));
    const offers = new Map((Array.isArray(job.offers) ? job.offers : []).filter((o) => o?.id).map((o) => [String(o.id), o]));
    for (const attempt of job.attempts) {
      if (!attempt || (attempt.status !== 'sent' && attempt.status !== 'failed')) continue;
      const at = new Date(attempt.sentAt).getTime();
      if (!Number.isFinite(at) || at > now + HOUR) continue;
      const offer = offers.get(String(attempt.offerId)) || {};
      const productName = String(offer.title || offer.name || offer.productName || 'Oferta');
      const eventKey = `${job.id}:${attempt.offerId}:${attempt.status}`;
      const event = sendEvents.get(eventKey) || { at, status: attempt.status, productName, groups: new Set(), error: attempt.error };
      event.at = Math.max(event.at, at);
      event.groups.add(String(attempt.groupId));
      sendEvents.set(eventKey, event);

      if (attempt.status !== 'sent') continue;
      const place = locate(at);
      if (!place) continue;
      const bucket = totals[place.window];
      bucket.sends += 1;
      if (attempt.groupId) bucket.groups.set(String(attempt.groupId), groupNames.get(String(attempt.groupId)) || String(attempt.groupId));
      if (place.window === 'current') {
        series[place.index].sends += 1;
        if (attempt.groupId) series[place.index].groups.add(String(attempt.groupId));
        const key = String(attempt.productKey || attempt.offerId || productName);
        const entry = sentProducts.get(key) || { name: productName, image: offer.imageUrl || null, price: toNumber(offer.currentPrice), count: 0 };
        entry.count += 1;
        sentProducts.set(key, entry);
      }
    }
  }
  for (const event of sendEvents.values()) {
    const groups = event.groups.size;
    activity.push(event.status === 'sent'
      ? { type: 'send', at: new Date(event.at).toISOString(), tone: 'success', title: 'Oferta enviada', detail: `${event.productName} → ${groups} ${groups === 1 ? 'grupo' : 'grupos'}` }
      : { type: 'send_failed', at: new Date(event.at).toISOString(), tone: 'danger', title: 'Falha no envio', detail: event.productName });
  }

  const kpi = (field) => ({
    value: round2(totals.current[field]),
    previous: round2(totals.previous[field]),
    series: series.map((bucket) => round2(bucket[field])),
  });
  const rank = (map) => [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);
  const topSold = rank(sold);

  return {
    period: safePeriod,
    kpis: {
      commission: kpi('commission'),
      sales: kpi('sales'),
      sends: kpi('sends'),
      activeGroups: {
        value: totals.current.groups.size,
        previous: totals.previous.groups.size,
        series: series.map((bucket) => bucket.groups.size),
        names: [...totals.current.groups.values()],
      },
    },
    series: series.map(({ key, label, commission, sales, sends }) => ({ key, label, commission: round2(commission), sales, sends })),
    activity: recentActivity(activity),
    topProducts: topSold.length ? { kind: 'sold', items: topSold } : { kind: 'sent', items: rank(sentProducts) },
  };
}
