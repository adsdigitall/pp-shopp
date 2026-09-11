import { initEnv } from './lib/env.mjs';
import { dataStore } from './services/storage/DataStore.mjs';

initEnv();
process.env.DISPATCH_WORKER = 'external';

// Um rejection não tratado derruba o Node (exit) e congela fila + descoberta
// com heartbeat parado — exatamente o incidente visto em produção. Falhas
// transitórias (Supabase, WAHA, timeout) devem ser logadas, nunca matar.
process.on('unhandledRejection', (reason) => {
  console.log(`[worker] Unhandled rejection contida: ${reason && reason.message ? reason.message : reason}`);
});
process.on('uncaughtException', (error) => {
  console.log(`[worker] Uncaught exception, reiniciando via Easypanel: ${error && error.message ? error.message : error}`);
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 500).unref?.();
});
// Carregamento dinâmico é intencional: index.mjs calcula o modo do worker
// durante a avaliação do módulo. Um import estático era executado antes da
// atribuição acima e fazia o processo externo se comportar como inline.
const { resumeDispatchQueue, runAutomaticOfferDiscovery, runDailyRhythm } = await import('./index.mjs');
await dataStore.init();
console.log('[worker] Dispatch queue worker started.');
const writeHeartbeat = async () => {
  const heartbeat = { id: 'dispatch-worker', status: 'running', updatedAt: new Date().toISOString() };
  const existing = await dataStore.findById('workerStatus', heartbeat.id);
  if (existing) await dataStore.update('workerStatus', heartbeat.id, heartbeat);
  else await dataStore.add('workerStatus', heartbeat);
};
const tick = () => {
  writeHeartbeat().catch((error) => console.log(`[worker] Heartbeat falhou: ${error?.message || error}`));
  resumeDispatchQueue().catch((error) => console.log(`[worker] Fila falhou: ${error?.message || error}`));
  runAutomaticOfferDiscovery().catch((error) => console.log(`[worker] Descoberta falhou: ${error?.message || error}`));
  runDailyRhythm().catch((error) => console.log(`[worker] Ritmo diário falhou: ${error?.message || error}`));
};
await tick();
setInterval(tick, 15_000);
