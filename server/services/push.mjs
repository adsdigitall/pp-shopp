import webpush from 'web-push';

const subscriptions = new Map();

export function configurePush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function saveSubscription(subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return false;
  subscriptions.set(subscription.endpoint, subscription);
  return true;
}

export async function notifySubscribers(payload) {
  if (!configurePush()) return 0;
  let sent = 0;
  for (const [endpoint, subscription] of subscriptions) {
    try { await webpush.sendNotification(subscription, JSON.stringify(payload)); sent += 1; }
    catch (error) { if (error?.statusCode === 404 || error?.statusCode === 410) subscriptions.delete(endpoint); }
  }
  return sent;
}
