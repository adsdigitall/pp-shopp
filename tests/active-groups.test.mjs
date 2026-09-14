import test from 'node:test';
import assert from 'node:assert/strict';
import { activeDispatchGroups } from '../server/services/analytics/activeGroups.mjs';

const NOW = new Date('2026-09-14T21:00:00Z').getTime();
const HOUR = 3_600_000;
const sent = (groupId, hoursAgo) => ({ status: 'sent', groupId, sentAt: new Date(NOW - hoursAgo * HOUR).toISOString() });

test('conta grupos distintos com envio real dentro da janela', () => {
  const jobs = [
    {
      destinations: { groups: [{ id: 'g10', name: '#10 Radar' }, { id: 'g17', name: '#17 Radar' }] },
      attempts: [sent('g10', 1), sent('g17', 1), sent('g10', 2)],
    },
    { destinations: { groups: [{ id: 'g3', name: '#3 Antigo' }] }, attempts: [sent('g3', 30)] },
  ];
  assert.deepEqual(activeDispatchGroups(jobs, { hours: 24, now: NOW }), [
    { id: 'g10', name: '#10 Radar', lastSentAt: new Date(NOW - HOUR).toISOString() },
    { id: 'g17', name: '#17 Radar', lastSentAt: new Date(NOW - HOUR).toISOString() },
  ]);
});

test('falha, deduplicado e cancelado não contam como grupo recebendo', () => {
  const jobs = [{
    destinations: { groups: [{ id: 'g1', name: 'G1' }] },
    attempts: [
      { status: 'failed', groupId: 'g1', sentAt: new Date(NOW - HOUR).toISOString() },
      { status: 'deduplicated', groupId: 'g1', sentAt: new Date(NOW - HOUR).toISOString() },
    ],
  }];
  assert.deepEqual(activeDispatchGroups(jobs, { hours: 24, now: NOW }), []);
});

test('sem nome conhecido usa o id e ignora dados quebrados', () => {
  const jobs = [
    { attempts: [sent('g9', 3), { status: 'sent', groupId: '', sentAt: 'x' }, null] },
    null,
    { attempts: 'lixo' },
  ];
  assert.deepEqual(activeDispatchGroups(jobs, { hours: 24, now: NOW }).map(g => g.name), ['g9']);
});
