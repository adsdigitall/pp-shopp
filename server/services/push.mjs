import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { dataStore } from './storage/DataStore.mjs';

/**
 * Notificações push (PWA). Inscrições e chaves VAPID ficam no banco para
 * sobreviver a reinícios e valer tanto na API (Vercel) quanto no worker.
 * Chaves do ambiente (VAPID_*) têm prioridade; sem elas, a API gera um par
 * uma única vez e grava no banco. A chave privada nunca sai do servidor.
 */

const SUBSCRIPTIONS = 'pushSubscriptions';
const SECRETS = 'appSecrets';
const VAPID_DOC = 'vapid';
const DEFAULT_SUBJECT = 'https://radarfertas.shop';

let cachedKeys = null;

export function subscriptionId(endpoint) {
  return `push_${createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 32)}`;
}

export function isValidSubscription(subscription) {
  const endpoint = subscription?.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  try {
    if (new URL(endpoint).protocol !== 'https:') return false;
  } catch {
    return false;
  }
  const { p256dh, auth } = subscription?.keys || {};
  return typeof p256dh === 'string' && typeof auth === 'string' && p256dh.length < 200 && auth.length < 100;
}

/** @returns {Promise<{ publicKey: string, privateKey: string, subject: string } | null>} */
export async function getVapidKeys({ allowGenerate = false, env = process.env, store = dataStore, generate = () => webpush.generateVAPIDKeys() } = {}) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || DEFAULT_SUBJECT };
  }
  if (cachedKeys && store === dataStore) return cachedKeys;
  const stored = await store.findById(SECRETS, VAPID_DOC);
  if (stored?.publicKey && stored?.privateKey) {
    const keys = { publicKey: stored.publicKey, privateKey: stored.privateKey, subject: env.VAPID_SUBJECT || DEFAULT_SUBJECT };
    if (store === dataStore) cachedKeys = keys;
    return keys;
  }
  if (!allowGenerate) return null;
  const pair = generate();
  await store.add(SECRETS, { id: VAPID_DOC, publicKey: pair.publicKey, privateKey: pair.privateKey, createdAt: new Date().toISOString() });
  // Relê: se outra instância gravou ao mesmo tempo, todos usam o mesmo par.
  const saved = await store.findById(SECRETS, VAPID_DOC);
  const keys = { publicKey: saved?.publicKey || pair.publicKey, privateKey: saved?.privateKey || pair.privateKey, subject: env.VAPID_SUBJECT || DEFAULT_SUBJECT };
  if (store === dataStore) cachedKeys = keys;
  return keys;
}

export async function getPublicKey(options) {
  const keys = await getVapidKeys({ allowGenerate: true, ...options });
  return keys?.publicKey || null;
}

export async function saveSubscription(subscription, { userId = 'default_user', userAgent = '', store = dataStore } = {}) {
  if (!isValidSubscription(subscription)) return false;
  const id = subscriptionId(subscription.endpoint);
  const record = {
    id,
    userId,
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    device: String(userAgent).slice(0, 160),
    updatedAt: new Date().toISOString(),
  };
  const existing = await store.findById(SUBSCRIPTIONS, id);
  if (existing) await store.update(SUBSCRIPTIONS, id, record);
  else await store.add(SUBSCRIPTIONS, { ...record, createdAt: record.updatedAt });
  return true;
}

export async function removeSubscription(endpoint, { store = dataStore } = {}) {
  if (typeof endpoint !== 'string') return false;
  return store.remove(SUBSCRIPTIONS, subscriptionId(endpoint));
}

export async function countSubscriptions({ userId = 'default_user', store = dataStore } = {}) {
  return (await store.find(SUBSCRIPTIONS, { userId })).length;
}

export async function hasSubscription(endpoint, { store = dataStore } = {}) {
  if (typeof endpoint !== 'string') return false;
  return Boolean(await store.findById(SUBSCRIPTIONS, subscriptionId(endpoint)));
}

/**
 * Envia para todos os aparelhos inscritos. Inscrição vencida (404/410) sai do banco.
 * @returns {Promise<{ sent: number, removed: number, failed: number, configured: boolean }>}
 */
export async function notifySubscribers(payload, { userId = 'default_user', store = dataStore, sender = webpush, env = process.env } = {}) {
  const keys = await getVapidKeys({ env, store });
  if (!keys) return { sent: 0, removed: 0, failed: 0, configured: false };
  const subscriptions = await store.find(SUBSCRIPTIONS, { userId });
  const body = JSON.stringify({ icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', url: '/', ...payload });
  let sent = 0, removed = 0, failed = 0;
  for (const subscription of subscriptions) {
    try {
      await sender.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        body,
        { vapidDetails: { subject: keys.subject, publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 60 * 60 * 12, urgency: 'high' },
      );
      sent += 1;
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await store.remove(SUBSCRIPTIONS, subscription.id);
        removed += 1;
      } else {
        failed += 1;
      }
    }
  }
  return { sent, removed, failed, configured: true };
}
