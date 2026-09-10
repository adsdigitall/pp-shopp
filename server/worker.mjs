import { initEnv } from './lib/env.mjs';
import { dataStore } from './services/storage/DataStore.mjs';

initEnv();
process.env.DISPATCH_WORKER = 'external';
// Carregamento dinâmico é intencional: index.mjs calcula o modo do worker
// durante a avaliação do módulo. Um import estático era executado antes da
// atribuição acima e fazia o processo externo se comportar como inline.
const { resumeDispatchQueue, runAutomaticOfferDiscovery } = await import('./index.mjs');
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
