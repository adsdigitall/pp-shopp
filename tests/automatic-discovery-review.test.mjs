import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('automatic discovery only adds offers to the manual review queue', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function enqueueAutomaticOfferForReview');
  const sendStart = source.indexOf('const productKey = dispatchProductKey(offer);', start);
  const returnAt = source.indexOf('return item;', sendStart);
  const activePath = source.slice(sendStart, returnAt + 'return item;'.length);
  assert.ok(start >= 0 && sendStart >= 0 && returnAt >= 0);
  assert.match(activePath, /PublicationHistoryStore\.save/);
  assert.doesNotMatch(activePath, /DispatchStore\.save|resumeDispatchQueue|processDispatchJob/);
  assert.match(source, /for \(const config of configs\.filter\(item => item\?\.enabled\)\)/);
  assert.match(source, /const batchSize = 1;/);
  assert.match(source, /for \(const offer of offers\)/);
  assert.match(source, /if \(!isBrazilianOffer\(item\)\) return false;/);
  assert.match(source, /!recentDiscoveryKeys\.has\(key\)/);
  assert.match(source, /const stableQueueId = `queue-auto-/);
  assert.match(source, /if \(!String\(item\?\.title \|\| ''\)\.trim\(\)\) return false;/);
});

test('manual queue additions do not enqueue dispatches', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function handleAddToQueue');
  const end = source.indexOf('\nasync function handleRemoveFromQueue', start);
  const handler = source.slice(start, end);
  assert.match(handler, /PublicationHistoryStore\.save/);
  assert.doesNotMatch(handler, /enqueueAutomatic|DispatchStore\.save|resumeDispatchQueue/);
});
