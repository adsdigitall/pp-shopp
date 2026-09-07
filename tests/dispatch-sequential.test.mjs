import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dispatch queue processes one job at a time in creation order', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(source, /let dispatchQueueRunning = false/);
  assert.match(source, /const queued = jobs\s*\.filter\([\s\S]*?pending[\s\S]*?\)\s*\.sort\(/);
  assert.match(source, /await processDispatchJob\(nextJob\.id\)/);
  assert.doesNotMatch(source, /void processDispatchJob\(jobId\)/);
});

test('each offer fans out to every selected group before the next offer', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(source, /for \(let offerIndex = 0; offerIndex < offers\.length; offerIndex\+\+\)/);
  assert.match(source, /for \(let i = 0; i < groups\.length; i\+\+\)/);
  assert.match(source, /const totalDeliveries = groups\.length \* offers\.length/);
});

test('dispatch interval is applied after all groups receive the offer', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const loopStart = source.indexOf('for (let offerIndex = 0; offerIndex < offers.length; offerIndex++)');
  const loopEnd = source.indexOf('\n  job.status = \'completed\';', loopStart);
  const loop = source.slice(loopStart, loopEnd);
  assert.ok(loopStart >= 0 && loopEnd > loopStart);
  assert.match(loop, /if \(offerIndex < offers.length - 1 && await sleepUntilNextDispatch\(job, intervalMs\)\)/);
  assert.doesNotMatch(loop.slice(0, loop.lastIndexOf('    }')), /if \(deliveryIndex < totalDeliveries && await sleepUntilNextDispatch/);
});
