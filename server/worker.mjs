import { initEnv } from './lib/env.mjs';
import { dataStore } from './services/storage/DataStore.mjs';
import { resumeDispatchQueue, runAutomaticOfferDiscovery } from './index.mjs';

initEnv();
process.env.DISPATCH_WORKER = 'external';
await dataStore.init();
console.log('[worker] Dispatch queue worker started.');
const writeHeartbeat = async () => {
  const heartbeat = { id: 'dispatch-worker', status: 'running', updatedAt: new Date().toISOString() };
  const existing = await dataStore.findById('workerStatus', heartbeat.id);
  if (existing) await dataStore.update('workerStatus', heartbeat.id, heartbeat);
  else await dataStore.add('workerStatus', heartbeat);
};
await writeHeartbeat();
await resumeDispatchQueue();
await runAutomaticOfferDiscovery();
setInterval(() => { void writeHeartbeat(); void resumeDispatchQueue(); void runAutomaticOfferDiscovery(); }, 15_000);
