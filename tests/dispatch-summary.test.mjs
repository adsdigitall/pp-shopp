import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDispatchJob } from '../server/services/analytics/dispatchSummary.mjs';

test('resumo leve mantém status e stats, tira ofertas/tentativas e traz a primeira oferta', () => {
  const job = {
    id: 'j1', status: 'running', stats: { sent: 2, failed: 1 }, destinations: { groups: [{ id: 'g' }] },
    message: { whatsapp: { customMessage: 'texto enorme' } },
    offers: [{ id: 'o1', title: 'Fone Bluetooth', imageUrl: 'https://img/1', currentPrice: '19.9', originalPrice: 50, marketplace: 'shopee', category: 'Eletrônicos', affiliateUrl: 'https://s.shopee.com.br/x' }, { id: 'o2' }],
    attempts: [{ status: 'failed', error: 'timeout' }, { status: 'sent' }, { status: 'failed', error: 'Sessão WAHA não conectada.' }],
  };
  const summary = summarizeDispatchJob(job);
  assert.equal(summary.offers, undefined);
  assert.equal(summary.attempts, undefined);
  assert.equal(summary.message, undefined);
  assert.equal(summary.status, 'running');
  assert.deepEqual(summary.stats, { sent: 2, failed: 1 });
  assert.equal(summary.offersCount, 2);
  assert.deepEqual(summary.firstOffer, { name: 'Fone Bluetooth', image: 'https://img/1', price: 19.9, originalPrice: 50, marketplace: 'shopee', category: 'Eletrônicos', affiliateUrl: 'https://s.shopee.com.br/x' });
  assert.equal(summary.lastError, 'Sessão WAHA não conectada.');
});

test('job sem ofertas não quebra o resumo', () => {
  const summary = summarizeDispatchJob({ id: 'x', status: 'failed', error: 'Sem grupos' });
  assert.equal(summary.firstOffer, null);
  assert.equal(summary.offersCount, 0);
  assert.equal(summary.lastError, 'Sem grupos');
  assert.equal(summarizeDispatchJob(null), null);
});
