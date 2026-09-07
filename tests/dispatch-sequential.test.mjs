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
