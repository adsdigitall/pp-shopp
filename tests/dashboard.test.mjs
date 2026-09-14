import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard } from '../server/services/analytics/dashboard.mjs';

// 14/09/2026 18:00 em Brasília (21:00 UTC).
const NOW = Date.parse('2026-09-14T21:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const secondsAgo = (ms) => String(Math.floor((NOW - ms) / 1000));

const sale = (ageMs, { status = 'PENDING', commission = '1.5', item = 'Bolsa', itemId = 'i1', price = '30' } = {}) => ({
  conversionId: `c-${ageMs}-${item}`,
  purchaseTime: secondsAgo(ageMs),
  conversionStatus: status,
  totalCommission: commission,
  netCommission: commission,
  orders: [{ items: [{ itemId, itemName: item, itemPrice: price, qty: 1, imageUrl: `https://img/${itemId}` }] }],
});

const job = (id, offers, attempts) => ({
  id,
  source: 'queue_automation',
  destinations: { groups: [{ id: 'g10', name: '#10 Radar' }, { id: 'g17', name: '#17 Radar' }] },
  offers,
  attempts,
});
const sent = (offerId, groupId, ageMs) => ({ status: 'sent', offerId, groupId, sentAt: new Date(NOW - ageMs).toISOString() });

test('7 dias: comissão e vendas somam só conversões não canceladas, com período anterior', () => {
  const data = buildDashboard({
    period: '7d',
    now: NOW,
    conversions: [
      sale(1 * HOUR, { commission: '2.5' }),
      sale(2 * DAY, { commission: '1.0' }),
      sale(3 * DAY, { status: 'CANCELLED', commission: '9' }),
      sale(9 * DAY, { commission: '4' }),
    ],
    jobs: [],
  });
  assert.equal(data.kpis.commission.value, 3.5);
  assert.equal(data.kpis.commission.previous, 4);
  assert.equal(data.kpis.sales.value, 2);
  assert.equal(data.kpis.sales.previous, 1);
  assert.equal(data.series.length, 7);
  assert.equal(data.series.at(-1).key, '2026-09-14');
  assert.equal(data.series.at(-1).commission, 2.5);
  assert.deepEqual(data.kpis.sales.series, data.series.map((b) => b.sales));
});

test('envios e grupos ativos vêm só de tentativas enviadas', () => {
  const data = buildDashboard({
    period: '7d',
    now: NOW,
    conversions: [],
    jobs: [job('j1', [{ id: 'o1', title: 'Legging', imageUrl: 'https://img/o1', currentPrice: 39.9 }], [
      sent('o1', 'g10', HOUR),
      sent('o1', 'g17', HOUR),
      { status: 'failed', offerId: 'o1', groupId: 'g10', sentAt: new Date(NOW - 2 * HOUR).toISOString(), error: 'timeout' },
      { status: 'deduplicated', offerId: 'o1', groupId: 'g10', sentAt: new Date(NOW - 2 * HOUR).toISOString() },
    ])],
  });
  assert.equal(data.kpis.sends.value, 2);
  assert.equal(data.kpis.activeGroups.value, 2);
  assert.deepEqual(data.kpis.activeGroups.names.sort(), ['#10 Radar', '#17 Radar']);
});

test('hoje: 24 faixas de hora e comparação com ontem', () => {
  const data = buildDashboard({ period: 'today', now: NOW, conversions: [sale(1 * HOUR), sale(DAY)], jobs: [] });
  assert.equal(data.series.length, 24);
  assert.equal(data.series[0].label, '00h');
  assert.equal(data.kpis.sales.value, 1);
  assert.equal(data.kpis.sales.previous, 1);
});

test('atividade recente mistura vendas e envios, mais novo primeiro, envio agrupado por oferta', () => {
  const data = buildDashboard({
    period: '7d',
    now: NOW,
    conversions: [sale(30 * 60_000, { item: 'Bolsa mini', price: '32.99' })],
    jobs: [job('j1', [{ id: 'o1', title: 'Legging' }], [sent('o1', 'g10', 10 * 60_000), sent('o1', 'g17', 10 * 60_000)])],
  });
  assert.equal(data.activity[0].type, 'send');
  assert.match(data.activity[0].detail, /Legging/);
  assert.match(data.activity[0].detail, /2 grupos/);
  assert.equal(data.activity[1].type, 'sale');
  assert.match(data.activity[1].detail, /R\$\s?32,99/);
  assert.equal(data.activity.filter((a) => a.type === 'send').length, 1);
});

test('top produtos: vendidos quando há venda; senão mais enviados, avisando o tipo', () => {
  const withSales = buildDashboard({
    period: '7d', now: NOW,
    conversions: [sale(HOUR, { item: 'Bolsa', itemId: 'b' }), sale(2 * HOUR, { item: 'Bolsa', itemId: 'b' }), sale(3 * HOUR, { item: 'Saia', itemId: 's' })],
    jobs: [],
  });
  assert.equal(withSales.topProducts.kind, 'sold');
  assert.deepEqual(withSales.topProducts.items.map((i) => [i.name, i.count]), [['Bolsa', 2], ['Saia', 1]]);

  const onlySends = buildDashboard({
    period: '7d', now: NOW, conversions: [],
    jobs: [job('j1', [{ id: 'o1', title: 'Legging', currentPrice: 39.9 }], [sent('o1', 'g10', HOUR), sent('o1', 'g17', HOUR)])],
  });
  assert.equal(onlySends.topProducts.kind, 'sent');
  assert.deepEqual(onlySends.topProducts.items.map((i) => [i.name, i.count]), [['Legging', 2]]);
});

test('dados quebrados não derrubam o painel', () => {
  const data = buildDashboard({ period: 'xyz', now: NOW, conversions: [null, { purchaseTime: 'x' }], jobs: [null, { attempts: 'lixo' }] });
  assert.equal(data.period, '7d');
  assert.equal(data.kpis.sales.value, 0);
  assert.deepEqual(data.activity, []);
});

test('atividade recente reserva as vendas mais recentes mesmo com muitos envios depois', () => {
  const offers = Array.from({ length: 10 }, (_, i) => ({ id: `o${i}`, title: `Oferta ${i}` }));
  const attempts = offers.map((offer, i) => sent(offer.id, 'g10', (i + 1) * 60_000));
  const data = buildDashboard({ period: '7d', now: NOW, conversions: [sale(3 * HOUR, { item: 'Vestido' })], jobs: [job('j1', offers, attempts)] });
  assert.equal(data.activity.length, 6);
  assert.equal(data.activity.filter((a) => a.type === 'sale').length, 1);
  assert.equal(data.activity.at(-1).type, 'sale');
});
