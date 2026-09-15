import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQueueOverview } from '../server/services/analytics/queueOverview.mjs';

// 14/09/2026 18:00 em Brasília (21:00 UTC).
const NOW = Date.parse('2026-09-14T21:00:00Z');
const HOUR = 3_600_000;
const at = (ms) => new Date(NOW - ms).toISOString();
const offer = (id, extra = {}) => ({ id, title: `Produto ${id}`, imageUrl: `https://img/${id}`, currentPrice: 20, originalPrice: 40, discountPercentage: 50, marketplace: 'shopee', affiliateUrl: `https://s.shopee.com.br/${id}`, ...extra });
const groups = [{ id: 'g10', name: '#10 Radar' }, { id: 'g17', name: '#17 Radar' }];

test('agendadas: jobs ainda não concluídos, com produto, grupos e horário', () => {
  const data = buildQueueOverview({
    now: NOW,
    jobs: [
      { id: 'j1', status: 'pending', source: 'queue_automation', createdAt: at(HOUR), offers: [offer('a')], destinations: { groups, interval: { value: 5, unit: 'minutes' } }, stats: { sent: 0 } },
      { id: 'j2', status: 'pending', createdAt: at(2 * HOUR), offers: [offer('b')], destinations: { groups: [groups[0]], scheduledAt: '2026-09-15T12:00:00Z' }, stats: { sent: 0 } },
      { id: 'j3', status: 'completed', createdAt: at(3 * HOUR), offers: [offer('c')], destinations: { groups }, attempts: [] },
      { id: 'j4', status: 'cancelled', createdAt: at(3 * HOUR), offers: [offer('d')], destinations: { groups } },
    ],
  });
  assert.equal(data.counts.scheduled, 2);
  assert.deepEqual(data.scheduled.map((item) => item.jobId), ['j2', 'j1']);
  const j1 = data.scheduled.find((item) => item.jobId === 'j1');
  assert.equal(j1.product.name, 'Produto a');
  assert.equal(j1.groupsCount, 2);
  assert.deepEqual(j1.interval, { value: 5, unit: 'minutes' });
  assert.equal(j1.automatic, true);
});

test('enviadas e falhas: um evento por oferta do job, hoje vs ontem até a mesma hora', () => {
  const data = buildQueueOverview({
    now: NOW,
    jobs: [
      {
        id: 'j1', status: 'completed', offers: [offer('a'), offer('b')], destinations: { groups },
        attempts: [
          { status: 'sent', offerId: 'a', groupId: 'g10', sentAt: at(HOUR) },
          { status: 'sent', offerId: 'a', groupId: 'g17', sentAt: at(HOUR - 2000) },
          { status: 'failed', offerId: 'b', groupId: 'g10', sentAt: at(30 * 60_000), error: 'Sessão WAHA não conectada.' },
          { status: 'deduplicated', offerId: 'b', groupId: 'g17', sentAt: at(30 * 60_000) },
        ],
      },
      { id: 'j0', status: 'completed', offers: [offer('y')], destinations: { groups }, attempts: [{ status: 'sent', offerId: 'y', groupId: 'g10', sentAt: at(25 * HOUR) }] },
      { id: 'jold', status: 'completed', offers: [offer('z')], destinations: { groups }, attempts: [{ status: 'sent', offerId: 'z', groupId: 'g10', sentAt: at(20 * HOUR) }] },
    ],
  });
  assert.equal(data.counts.sentToday, 1);
  assert.equal(data.counts.sentYesterday, 1);
  assert.equal(data.counts.failedToday, 1);
  assert.equal(data.counts.failedYesterday, 0);
  assert.equal(data.sent[0].product.name, 'Produto a');
  assert.equal(data.sent[0].groupsCount, 2);
  assert.deepEqual(data.sent[0].groupNames, ['#10 Radar', '#17 Radar']);
  assert.equal(data.failed[0].error, 'Sessão WAHA não conectada.');
  assert.equal(data.series.sent.length, 24);
  assert.equal(data.series.sent.reduce((a, b) => a + b, 0), 1);
});

test('job que falhou sem tentativa ainda aparece nas falhas com o motivo do job', () => {
  const data = buildQueueOverview({ now: NOW, jobs: [{ id: 'jf', status: 'failed', error: 'Sem grupos', completedAt: at(HOUR), createdAt: at(2 * HOUR), offers: [offer('f')], destinations: { groups: [] }, attempts: [] }] });
  assert.equal(data.failed.length, 1);
  assert.equal(data.failed[0].error, 'Sem grupos');
});

test('dados quebrados não derrubam a visão da fila', () => {
  const data = buildQueueOverview({ now: NOW, jobs: [null, { id: 'x', status: 'pending' }, { id: 'y', attempts: 'lixo' }] });
  assert.equal(data.counts.scheduled, 1);
  assert.equal(data.scheduled[0].product.name, 'Oferta');
});

test('listas de enviadas e falhas trazem só hoje (batem com os cards)', () => {
  const data = buildQueueOverview({
    now: NOW,
    jobs: [
      { id: 'hoje', status: 'completed', offers: [offer('h')], destinations: { groups }, attempts: [{ status: 'sent', offerId: 'h', groupId: 'g10', sentAt: at(HOUR) }] },
      { id: 'ontem', status: 'completed', offers: [offer('o')], destinations: { groups }, attempts: [{ status: 'sent', offerId: 'o', groupId: 'g10', sentAt: at(22 * HOUR) }, { status: 'failed', offerId: 'o', groupId: 'g17', sentAt: at(22 * HOUR), error: 'x' }] },
    ],
  });
  assert.deepEqual(data.sent.map((e) => e.jobId), ['hoje']);
  assert.equal(data.sent.length, data.counts.sentToday);
  assert.equal(data.failed.length, data.counts.failedToday);
});
