import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWahaGroups } from '../server/services/waha/groups.mjs';

test('normalizes the uppercase GOWS group payload', () => {
  const groups = normalizeWahaGroups([{
    JID: '120363000000000000@g.us',
    Name: 'Ofertas Shopee',
    Participants: [{ JID: '5511999999999@s.whatsapp.net' }],
  }], 'default', '2026-09-05T12:00:00.000Z');

  assert.deepEqual(groups, [{
    id: '120363000000000000@g.us',
    name: 'Ofertas Shopee',
    memberCount: 1,
    isAdmin: false,
    status: 'active',
    messagesSent30d: 0,
    messagesReceived30d: 0,
    lastActivity: '2026-09-05T12:00:00.000Z',
    addedAt: '2026-09-05T12:00:00.000Z',
    sessionId: 'default',
  }]);
});

test('normalizes standard WAHA groups and removes invalid/duplicate entries', () => {
  const groups = normalizeWahaGroups({ groups: [
    { id: '1@g.us', subject: 'VIP', participants: [{}, {}] },
    { id: '1@g.us', subject: 'VIP atualizado', participants: [] },
    { subject: 'Sem identificador' },
  ] }, 'default');

  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, '1@g.us');
  assert.equal(groups[0].name, 'VIP atualizado');
});

test('derives current account admin permission from GOWS participants', () => {
  const groups = normalizeWahaGroups([{
    JID: '120363000000@g.us',
    Name: 'Grupo administrado',
    Participants: [
      { JID: '554796116381@s.whatsapp.net', IsAdmin: true, IsSuperAdmin: false },
      { JID: '5511999999999@s.whatsapp.net', IsAdmin: false },
    ],
  }], 'default', '2026-09-06T00:00:00.000Z', { id: '554796116381@c.us' });

  assert.equal(groups[0].isAdmin, true);
});
