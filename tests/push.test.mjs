import test from 'node:test';
import assert from 'node:assert/strict';
import { getVapidKeys, isValidSubscription, notifySubscribers, saveSubscription, subscriptionId } from '../server/services/push.mjs';

function memoryStore() {
  const data = new Map();
  const col = (name) => { if (!data.has(name)) data.set(name, []); return data.get(name); };
  return {
    data,
    async findById(c, id) { return col(c).find((x) => x.id === id) || null; },
    async find(c, q) { return col(c).filter((x) => Object.entries(q).every(([k, v]) => x[k] === v)); },
    async add(c, item) { const list = col(c); const i = list.findIndex((x) => x.id === item.id); if (i >= 0) list[i] = item; else list.push(item); return item; },
    async update(c, id, patch) { const list = col(c); const i = list.findIndex((x) => x.id === id); if (i < 0) return null; list[i] = { ...list[i], ...patch }; return list[i]; },
    async remove(c, id) { const list = col(c); const i = list.findIndex((x) => x.id === id); if (i < 0) return false; list.splice(i, 1); return true; },
  };
}

const sub = (n) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/abc${n}`, keys: { p256dh: `p${n}`, auth: `a${n}` } });

test('chaves do ambiente têm prioridade; sem elas gera uma vez e reaproveita do banco', async () => {
  const store = memoryStore();
  assert.equal((await getVapidKeys({ env: { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }, store })).publicKey, 'pub');
  assert.equal(await getVapidKeys({ env: {}, store }), null, 'worker não gera chaves');
  let generated = 0;
  const generate = () => { generated += 1; return { publicKey: `PUB${generated}`, privateKey: `PRIV${generated}` }; };
  const first = await getVapidKeys({ env: {}, store, allowGenerate: true, generate });
  const second = await getVapidKeys({ env: {}, store, allowGenerate: true, generate });
  assert.equal(generated, 1);
  assert.equal(first.publicKey, 'PUB1');
  assert.equal(second.privateKey, 'PRIV1');
});

test('só aceita inscrição https com chaves', () => {
  assert.equal(isValidSubscription(sub(1)), true);
  assert.equal(isValidSubscription({ endpoint: 'http://x.com', keys: { p256dh: 'a', auth: 'b' } }), false);
  assert.equal(isValidSubscription({ endpoint: 'https://x.com' }), false);
  assert.equal(isValidSubscription(null), false);
});

test('inscrição fica salva sem duplicar o mesmo aparelho', async () => {
  const store = memoryStore();
  assert.equal(await saveSubscription(sub(1), { store }), true);
  assert.equal(await saveSubscription(sub(1), { store }), true);
  assert.equal(store.data.get('pushSubscriptions').length, 1);
  assert.equal(store.data.get('pushSubscriptions')[0].id, subscriptionId(sub(1).endpoint));
});

test('envia para todos e apaga aparelho que não existe mais', async () => {
  const store = memoryStore();
  await saveSubscription(sub(1), { store });
  await saveSubscription(sub(2), { store });
  await saveSubscription(sub(3), { store });
  const sender = {
    async sendNotification(target, body) {
      assert.match(body, /Venda paga/);
      if (target.endpoint.endsWith('2')) { const e = new Error('gone'); e.statusCode = 410; throw e; }
      if (target.endpoint.endsWith('3')) throw new Error('timeout');
    },
  };
  const result = await notifySubscribers({ title: 'Venda paga', body: 'x' }, { store, sender, env: { VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 'k' } });
  assert.deepEqual(result, { sent: 1, removed: 1, failed: 1, configured: true });
  assert.equal(store.data.get('pushSubscriptions').length, 2);
});

test('sem chaves não tenta enviar', async () => {
  const store = memoryStore();
  await saveSubscription(sub(1), { store });
  const result = await notifySubscribers({ title: 't' }, { store, sender: { sendNotification() { throw new Error('não deveria'); } }, env: {} });
  assert.equal(result.configured, false);
});
