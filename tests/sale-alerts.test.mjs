import test from 'node:test';
import assert from 'node:assert/strict';
import { planSaleAlerts } from '../server/services/notifications/saleAlerts.mjs';

const conv = (id, status, { commission = '1.50', item = 'Capa de Celular Samsung A17', price = '19' } = {}) => ({
  conversionId: id,
  purchaseTime: 1789400000,
  conversionStatus: status,
  netCommission: commission,
  totalCommission: commission,
  orders: [{ orderStatus: status, items: [{ itemId: `i-${id}`, itemName: item, itemPrice: price, qty: 1 }] }],
});

test('primeira execução só grava o estado, sem avisar pedidos antigos', () => {
  const { alerts, state } = planSaleAlerts({ conversions: [conv('a', 'PENDING'), conv('b', 'UNPAID')], previous: null });
  assert.deepEqual(alerts, []);
  assert.deepEqual(state.statuses, { a: 'paid', b: 'unpaid' });
});

test('venda nova paga e pedido novo não pago viram avisos diferentes', () => {
  const previous = { statuses: { old: 'paid' } };
  const { alerts } = planSaleAlerts({ conversions: [conv('old', 'PENDING'), conv('n1', 'PENDING', { commission: '3.17', item: 'Kit De Drenagem De Pia' }), conv('n2', 'UNPAID', { commission: '4.8' })], previous });
  assert.equal(alerts.length, 2);
  const paid = alerts.find((a) => a.conversionId === 'n1');
  assert.equal(paid.kind, 'paid');
  assert.match(paid.title, /Venda paga/);
  assert.match(paid.body, /R\$\s?3,17/);
  assert.match(paid.body, /Kit De Drenagem De Pia/);
  const unpaid = alerts.find((a) => a.conversionId === 'n2');
  assert.equal(unpaid.kind, 'unpaid');
  assert.match(unpaid.title, /aguardando pagamento/i);
});

test('mudança de status avisa: pagamento confirmado e venda concluída', () => {
  const previous = { statuses: { x: 'unpaid', y: 'paid', z: 'paid' } };
  const { alerts, state } = planSaleAlerts({ conversions: [conv('x', 'PENDING'), conv('y', 'COMPLETED'), conv('z', 'PENDING')], previous });
  assert.deepEqual(alerts.map((a) => [a.conversionId, a.kind]), [['x', 'payment_confirmed'], ['y', 'completed']]);
  assert.equal(state.statuses.y, 'completed');
});

test('cancelamento e status que só piora não geram aviso', () => {
  const previous = { statuses: { c: 'paid', d: 'completed' } };
  const { alerts, state } = planSaleAlerts({ conversions: [conv('c', 'CANCELLED'), conv('d', 'PENDING'), conv('e', 'CANCELLED')], previous });
  assert.deepEqual(alerts, []);
  assert.equal(state.statuses.c, 'cancelled');
  assert.equal(state.statuses.d, 'completed', 'não volta de concluída para paga');
});

test('muitos avisos de uma vez viram um resumo só', () => {
  const previous = { statuses: {} };
  const conversions = Array.from({ length: 5 }, (_, i) => conv(`m${i}`, 'PENDING', { commission: '2' }));
  const { alerts } = planSaleAlerts({ conversions, previous, maxIndividual: 3 });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, 'summary');
  assert.match(alerts[0].title, /5 vendas/);
  assert.match(alerts[0].body, /R\$\s?10,00/);
});

test('estado guarda pedidos que saíram da janela por um tempo, sem crescer sem limite', () => {
  const previous = { statuses: Object.fromEntries(Array.from({ length: 900 }, (_, i) => [`old${i}`, 'paid'])) };
  const { state } = planSaleAlerts({ conversions: [conv('novo', 'PENDING')], previous, maxState: 600 });
  assert.equal(Object.keys(state.statuses).length, 600);
  assert.equal(state.statuses.novo, 'paid');
});
