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

// Desde 21/09/2026 o intervalo tem variação de ±25% (ritmo humano, não
// metrônomo): a espera fica em torno do configurado, não cravada nele.
const perto = (real, alvo, margem, mensagem) =>
  assert.ok(Math.abs(real - alvo) <= margem, `${mensagem}: esperava ~${alvo}ms (±${margem}), veio ${real}ms`);

test('próxima oferta automática espera, em torno do delay, desde o último envio', () => {
  const jobs = [job('queue_automation', 'completed', ['2026-09-14T20:04:00Z'])];
  const interval = { value: 5, unit: 'minutes' };
  perto(automationPaceWaitMs(jobs, interval, at('2026-09-14T20:04:15Z')), 4 * MIN + 45_000, 1.25 * MIN, '15s após o envio');
  assert.equal(automationPaceWaitMs(jobs, interval, at('2026-09-14T20:11:00Z')), 0, 'passado o intervalo máximo, libera');
  assert.equal(automationPaceWaitMs([], interval, at('2026-09-14T20:04:15Z')), 0);
});

test('delay em segundos e horas é respeitado', () => {
  const jobs = [job('queue_automation', 'completed', ['2026-09-14T20:00:00Z'])];
  perto(automationPaceWaitMs(jobs, { value: 30, unit: 'seconds' }, at('2026-09-14T20:00:10Z')), 20_000, 7_500, 'delay de 30s');
  perto(automationPaceWaitMs(jobs, { value: 1, unit: 'hours' }, at('2026-09-14T20:30:00Z')), 30 * MIN, 15 * MIN, 'delay de 1h');
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
  // O grupo recebe no ritmo do campo "Nova oferta a cada" (offerInterval).
  // Usar interval primeiro fazia 5 min na tela sair de 7 em 7 minutos.
  assert.match(resume, /automationPaceWaitMs\(jobs, automation\?\.offerInterval \|\| automation\?\.interval \|\| nextJob\.destinations\?\.interval\) > 0\) return;/);
  const discovery = source.slice(source.indexOf('async function runAutomaticOfferDiscovery'), source.indexOf('\nlet dailyRhythmRunning'));
  assert.match(discovery, /const queueRoom = AUTOMATION_QUEUE_TARGET - pendingAutomationJobs\(/);
  assert.match(discovery, /if \(queueRoom <= 0\) continue;/);
  assert.match(discovery, /\.slice\(0, Math\.min\(batchSize, queueRoom\)\)/);
});

// ---- Ritmo humano: o intervalo do usuário vira média, não metrônomo ----
test('intervalo varia ±25% em torno do que o usuário escolheu', async () => {
  const { pacedIntervalMs, PACE_JITTER_RATIO } = await import('../server/services/automation/pacing.mjs');
  const cincoMin = { value: 5, unit: 'minutes' };
  const base = 5 * 60_000;
  const amostras = [];
  for (let i = 0; i < 1000; i += 1) {
    const efetivo = pacedIntervalMs(cincoMin, 1_700_000_000_000 + i * 37);
    assert.ok(efetivo >= base * (1 - PACE_JITTER_RATIO) && efetivo <= base * (1 + PACE_JITTER_RATIO),
      `intervalo ${efetivo} fora de ±25% de ${base}`);
    amostras.push(efetivo);
  }
  const media = amostras.reduce((soma, item) => soma + item, 0) / amostras.length;
  assert.ok(Math.abs(media - base) < base * 0.02, `média ${Math.round(media)} deveria ficar perto de ${base}`);
});

test('mesma espera em todas as checagens do ciclo (não sorteia a cada 15s)', async () => {
  const { pacedIntervalMs, automationPaceWaitMs } = await import('../server/services/automation/pacing.mjs');
  const interval = { value: 5, unit: 'minutes' };
  const sentAt = new Date('2026-09-21T12:00:00.734Z');
  const jobs = [{ source: 'queue_automation', status: 'sent', attempts: [{ status: 'sent', sentAt: sentAt.toISOString() }] }];
  const primeira = pacedIntervalMs(interval, sentAt.getTime());
  assert.equal(pacedIntervalMs(interval, sentAt.getTime()), primeira, 'o intervalo do mesmo envio não pode mudar entre ticks');
  const esperaA = automationPaceWaitMs(jobs, interval, sentAt.getTime() + 15_000);
  const esperaB = automationPaceWaitMs(jobs, interval, sentAt.getTime() + 30_000);
  assert.equal(esperaA - esperaB, 15_000, 'a espera só deve diminuir com o tempo que passou');
});

test('sem envio anterior continua saindo na hora (primeira oferta do dia)', async () => {
  const { automationPaceWaitMs } = await import('../server/services/automation/pacing.mjs');
  assert.equal(automationPaceWaitMs([], { value: 5, unit: 'minutes' }), 0);
});
