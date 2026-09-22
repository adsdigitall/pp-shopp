/**
 * Saúde da fila de disparo.
 *
 * Dois problemas reais de produção (22/09/2026):
 *
 * 1. Job que entra em "running" e nunca termina (processo reiniciado no meio,
 *    ou chamada externa pendurada) trava a fila: o ciclo seguinte escolhe
 *    sempre ele e nada mais sai. Passado o limite, volta para "pending".
 *
 * 2. Fila acumulada: com o disparo parado, a descoberta continuou enfileirando
 *    e sobraram quase mil ofertas de dias atrás. Soltar tudo de uma vez jogaria
 *    preço velho no grupo — oferta vencida é cancelada, não enviada.
 */

export const RUNNING_TRAVADO_MS = 10 * 60_000;
export const OFERTA_VENCE_EM_MS = 6 * 60 * 60_000;

const AUTOMACAO = 'queue_automation';

function instante(valor) {
  const tempo = Date.parse(String(valor || ''));
  return Number.isFinite(tempo) ? tempo : null;
}

/**
 * @param {object} entrada
 * @param {Array} entrada.jobs disparos conhecidos
 * @param {Date} [entrada.agora]
 * @returns {{ destravar: string[], expirar: string[] }} ids por ação
 */
export const MAX_POR_CICLO = 50;

export function planQueueMaintenance({ jobs = [], agora = new Date(), limite = MAX_POR_CICLO }) {
  const t = agora.getTime();
  const destravar = [];
  const expirar = [];

  for (const job of jobs) {
    if (!job?.id) continue;

    if (job.status === 'running') {
      const inicio = instante(job.startedAt) ?? instante(job.createdAt);
      // Sem horário de início não dá para saber se travou: deixa quieto.
      if (inicio !== null && t - inicio >= RUNNING_TRAVADO_MS) destravar.push(job.id);
      continue;
    }

    // Só oferta automática vence. Disparo que o usuário mandou ou agendou é
    // decisão dele — não cancelamos pelas costas.
    if (job.source !== AUTOMACAO) continue;
    if (job.status !== 'pending' && job.status !== 'paused') continue;
    if (job.destinations?.scheduledAt) continue;
    const criado = instante(job.createdAt);
    if (criado !== null && t - criado >= OFERTA_VENCE_EM_MS) expirar.push(job.id);
  }

  // Fila acumulada de mil ofertas nao pode virar mil escritas num ciclo so:
  // o ciclo seguinte continua de onde parou.
  return { destravar, expirar: expirar.slice(0, limite) };
}
