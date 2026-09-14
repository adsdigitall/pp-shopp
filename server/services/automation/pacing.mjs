/**
 * Ritmo da automação: uma oferta por vez, respeitando o delay da tela de
 * Automação entre ofertas.
 *
 * Cada oferta automática vira um job de 1 oferta, e o intervalo do job só
 * separa ofertas dentro do mesmo job; sem este controle a fila emendava um job
 * no outro a cada tick (15 s). O último envio vem das tentativas salvas, então
 * o ritmo sobrevive a restart do worker.
 */

export const AUTOMATION_SOURCE = 'queue_automation';

// Ofertas automáticas esperando na fila; manter pouco garante que a oferta
// enviada é da categoria da faixa atual, não de uma faixa que já passou.
export const AUTOMATION_QUEUE_TARGET = 2;

const WAITING_STATUSES = new Set(['pending', 'paused', 'running', 'waiting_connection']);

export function intervalToMs(interval) {
  const value = Number(interval?.value);
  if (!Number.isFinite(value) || value <= 0) return 0;
  switch (interval?.unit) {
    case 'seconds': return value * 1000;
    case 'minutes': return value * 60_000;
    case 'hours': return value * 3_600_000;
    default: return 0;
  }
}

export function lastAutomationSentAt(jobs = []) {
  let last = 0;
  for (const job of jobs) {
    if (job?.source !== AUTOMATION_SOURCE || !Array.isArray(job.attempts)) continue;
    for (const attempt of job.attempts) {
      if (attempt?.status !== 'sent') continue;
      const time = new Date(attempt.sentAt).getTime();
      if (Number.isFinite(time) && time > last) last = time;
    }
  }
  return last;
}

/** Quanto falta (ms) para a próxima oferta automática poder sair. */
export function automationPaceWaitMs(jobs, interval, now = Date.now()) {
  const last = lastAutomationSentAt(jobs);
  if (!last) return 0;
  return Math.max(0, last + intervalToMs(interval) - now);
}

export function pendingAutomationJobs(jobs = []) {
  return jobs.filter((job) => job?.source === AUTOMATION_SOURCE && WAITING_STATUSES.has(job.status)).length;
}
