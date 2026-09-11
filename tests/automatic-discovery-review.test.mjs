import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('automatic discovery dispatches approved offers in auto mode', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function enqueueAutomaticOfferForReview');
  const sendStart = source.indexOf('const productKey = dispatchProductKey(offer);', start);
  const end = source.indexOf('\nlet automaticDiscoveryRunning', start);
  const activePath = source.slice(sendStart, end);
  assert.ok(start >= 0 && sendStart >= 0 && end >= 0);
  assert.match(activePath, /PublicationHistoryStore\.save/);
  assert.match(activePath, /config\.mode !== 'auto'/);
  assert.match(activePath, /evaluateAutomationOffer\(offer\)/);
  assert.match(activePath, /DispatchStore\.save/);
  assert.match(activePath, /resumeDispatchQueue/);
  assert.match(source, /for \(const config of configs\.filter\(item => item\?\.enabled\)\)/);
  assert.match(source, /const batchSize = Math\.min\(50, Math\.max\(1, Math\.round\(Number\(config\.batchSize\) \|\| 10\)\)\);/);
  assert.match(source, /for \(const offer of offers\)/);
  assert.match(source, /if \(!isBrazilianOffer\(item\)\) \{ blocked\.other \+= 1; return false; \}/);
  assert.match(source, /!recentDiscoveryKeys\.has\(key\)/);
  assert.match(source, /const stableQueueId = `queue-auto-/);
  assert.match(source, /if \(!String\(item\?\.title \|\| ''\)\.trim\(\)\) \{ blocked\.other \+= 1; return false; \}/);
});

test('manual queue additions do not enqueue dispatches', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function handleAddToQueue');
  const end = source.indexOf('\nasync function handleRemoveFromQueue', start);
  const handler = source.slice(start, end);
  assert.match(handler, /PublicationHistoryStore\.save/);
  assert.doesNotMatch(handler, /enqueueAutomatic|DispatchStore\.save|resumeDispatchQueue/);
});

test('automatic jobs honor pause and relationship-message state', async () => {
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const enqueueStart = source.indexOf('async function enqueueAutomaticOfferForReview');
  const enqueueEnd = source.indexOf('\nlet automaticDiscoveryRunning', enqueueStart);
  const enqueue = source.slice(enqueueStart, enqueueEnd);
  assert.match(enqueue, /offersSinceHumanMessage/);
  assert.match(enqueue, /humanMessageAfter/);

  const processStart = source.indexOf('async function processDispatchJob');
  const processEnd = source.indexOf('\nasync function dispatchWasCancelled', processStart);
  const process = source.slice(processStart, processEnd);
  assert.match(process, /job\.status = 'paused'/);
  assert.match(process, /destinations\.humanMessageAfter === true/);
});

test('external worker selects its mode before importing the backend', async () => {
  const source = await readFile(new URL('../server/worker.mjs', import.meta.url), 'utf8');
  const modeAt = source.indexOf("process.env.DISPATCH_WORKER = 'external'");
  const importAt = source.indexOf("await import('./index.mjs')");
  assert.ok(modeAt >= 0 && importAt > modeAt);
  assert.doesNotMatch(source, /import \{ resumeDispatchQueue, runAutomaticOfferDiscovery \} from/);
});
