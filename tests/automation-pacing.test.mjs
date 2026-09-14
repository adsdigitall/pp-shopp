import test from 'node:test';
import assert from 'node:assert/strict';
import { lastAutomationSentAt, automationPaceWaitMs, pendingAutomationJobs } from '../server/services/automation/pacing.mjs';

const MIN = 60_000;
const at = (iso) => new Date(iso).getTime();
const job = (source, status, sentTimes = []) => ({
  source,
  status,
  attempts: sentTimes.map((sentAt) => ({ status: 'sent', sentAt })),
});

test('último envio automático considera só tentativas enviadas de jobs automáticos', () => {
  const jobs = [
    job('queue_automation', 'completed', ['2026-09-14T20:04:00Z', '2026-09-14T20:04:03Z']),
    job(undefined, 'completed', ['2026-09-14T20:09:00Z']),
    { source: 'queue_automation', status: 'completed', attempts: [{ status: 'deduplicated', sentAt: '2026-09-14T20:10:00Z' }] },
  ];
  assert.equal(lastAutomationSentAt(jobs), at('2026-09-14T20:04:03Z'));
  assert.equal(lastAutomationSentAt([]), 0);
});

test('próxima oferta automática espera o delay configurado desde o último envio', () => {
  const jobs = [job('queue_automation', 'completed', ['2026-09-14T20:04:00Z'])];
  const interval = { value: 5, unit: 'minutes' };
  assert.equal(automationPaceWaitMs(jobs, interval, at('2026-09-14T20:04:15Z')), 4 * MIN + 45_000);
  assert.equal(automationPaceWaitMs(jobs, interval, at('2026-09-14T20:09:00Z')), 0);
  assert.equal(automationPaceWaitMs([], interval, at('2026-09-14T20:04:15Z')), 0);
});

test('delay em segundos e horas é respeitado', () => {
  const jobs = [job('queue_automation', 'completed', ['2026-09-14T20:00:00Z'])];
  assert.equal(automationPaceWaitMs(jobs, { value: 30, unit: 'seconds' }, at('2026-09-14T20:00:10Z')), 20_000);
  assert.equal(automationPaceWaitMs(jobs, { value: 1, unit: 'hours' }, at('2026-09-14T20:30:00Z')), 30 * MIN);
});

test('conta ofertas automáticas ainda esperando na fila', () => {
  const jobs = [
    job('queue_automation', 'pending'),
    job('queue_automation', 'paused'),
    job('queue_automation', 'running'),
    job('queue_automation', 'completed'),
    job('queue_automation', 'cancelled'),
    job(undefined, 'pending'),
  ];
  assert.equal(pendingAutomationJobs(jobs), 3);
});

test('fila e descoberta usam o ritmo da automação', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../server/index.mjs', import.meta.url), 'utf8');
  const resume = source.slice(source.indexOf('async function resumeDispatchQueue'), source.indexOf('\nfunction renderMessage'));
  assert.match(resume, /nextJob\.source === 'queue_automation' && nextJob\.status !== 'running'\s*&& automationPaceWaitMs\(jobs, automation\?\.interval \|\| nextJob\.destinations\?\.interval\) > 0\) return;/);
  const discovery = source.slice(source.indexOf('async function runAutomaticOfferDiscovery'), source.indexOf('\nlet dailyRhythmRunning'));
  assert.match(discovery, /const queueRoom = AUTOMATION_QUEUE_TARGET - pendingAutomationJobs\(/);
  assert.match(discovery, /if \(queueRoom <= 0\) continue;/);
  assert.match(discovery, /\.slice\(0, Math\.min\(batchSize, queueRoom\)\)/);
});
