/**
 * Por que a automação não está enviando agora.
 *
 * O app ficava mudo quando parava de mandar oferta: sem saber se era horário,
 * WhatsApp caído, filtro apertado ou fila vazia, só restava adivinhar. Aqui a
 * decisão é pura (sem I/O) para a tela e os testes lerem o mesmo motivo.
 */

import { automationIsWithinSchedule } from './config.mjs';
import { automationPaceWaitMs, pendingAutomationJobs, lastAutomationSentAt } from './pacing.mjs';

/** Motivos em ordem de prioridade: o primeiro que bate é o que a tela mostra. */
export const AUTOMATION_STATUS = {
  DESLIGADA: 'desligada',
  SEM_GRUPO: 'sem-grupo',
  FORA_DO_HORARIO: 'fora-do-horario',
  WHATSAPP_FORA: 'whatsapp-fora',
  SEM_OFERTA_APROVADA: 'sem-oferta-aprovada',
  AGUARDANDO_INTERVALO: 'aguardando-intervalo',
  ENVIANDO: 'enviando',
};

const MENSAGENS = {
  [AUTOMATION_STATUS.DESLIGADA]: 'A automação está desligada. Ligue a chave acima para o Radar voltar a enviar.',
  [AUTOMATION_STATUS.SEM_GRUPO]: 'Nenhum grupo selecionado: escolha pelo menos um grupo para receber as ofertas.',
  [AUTOMATION_STATUS.FORA_DO_HORARIO]: 'Fora do horário de envio. Volta a enviar no próximo horário configurado.',
  [AUTOMATION_STATUS.WHATSAPP_FORA]: 'O WhatsApp está desconectado. Reconecte para os envios voltarem.',
  [AUTOMATION_STATUS.SEM_OFERTA_APROVADA]: 'Nenhuma oferta passou nos filtros no último garimpo. Nada foi enviado para não mandar produto ruim.',
  [AUTOMATION_STATUS.AGUARDANDO_INTERVALO]: 'Tudo certo: aguardando o intervalo entre ofertas.',
  [AUTOMATION_STATUS.ENVIANDO]: 'Enviando normalmente.',
};

/** Quantos minutos faltam, arredondado para cima (0 quando já passou). */
function minutosAte(ms) {
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}

/**
 * @param {object} entrada
 * @param {object|null} entrada.config configuração da automação
 * @param {Array} entrada.jobs disparos conhecidos (DispatchStore.list)
 * @param {boolean} entrada.whatsappConectado sessão WAHA em WORKING
 * @param {Date} [entrada.agora]
 */
export function diagnoseAutomation({ config, jobs = [], whatsappConectado, agora = new Date() }) {
  const grupos = Array.isArray(config?.groups) ? config.groups.filter((group) => group?.id) : [];
  const naFila = pendingAutomationJobs(jobs);
  const ultimoEnvio = lastAutomationSentAt(jobs) || null;
  const cadencia = config?.offerInterval || config?.interval || null;
  const esperaMs = automationPaceWaitMs(jobs, cadencia, agora.getTime());
  const ultimoGarimpo = config?.lastDiscovery || null;
  const motivosDoGate = ultimoGarimpo?.blocked?.gate && typeof ultimoGarimpo.blocked.gate === 'object'
    ? Object.entries(ultimoGarimpo.blocked.gate).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([motivo, quantas]) => ({ motivo, quantas }))
    : [];

  const base = {
    ligada: config?.enabled === true,
    dentroDoHorario: automationIsWithinSchedule(config, agora),
    whatsappConectado: whatsappConectado === true,
    grupos: grupos.length,
    ofertasNaFila: naFila,
    ultimoEnvio: ultimoEnvio ? new Date(ultimoEnvio).toISOString() : null,
    proximaEmMinutos: minutosAte(esperaMs),
    janela: { de: config?.activeFrom || '08:00', ate: config?.activeUntil || '23:00' },
    comissaoMinima: config?.minCommissionRate ?? null,
    ultimoGarimpo: ultimoGarimpo
      ? {
        quando: ultimoGarimpo.at || null,
        categoria: ultimoGarimpo.category || null,
        vistas: Number(ultimoGarimpo.scanned) || 0,
        aprovadas: Number(ultimoGarimpo.kept) || 0,
        repetidas: Number(ultimoGarimpo.blocked?.repeats) || 0,
        motivos: motivosDoGate,
      }
      : null,
  };

  const status = (() => {
    if (!base.ligada) return AUTOMATION_STATUS.DESLIGADA;
    if (!grupos.length) return AUTOMATION_STATUS.SEM_GRUPO;
    if (!base.dentroDoHorario) return AUTOMATION_STATUS.FORA_DO_HORARIO;
    if (!base.whatsappConectado) return AUTOMATION_STATUS.WHATSAPP_FORA;
    // Fila vazia + último garimpo sem nada aprovado = filtro segurando tudo.
    if (!naFila && ultimoGarimpo && Number(ultimoGarimpo.kept) === 0) return AUTOMATION_STATUS.SEM_OFERTA_APROVADA;
    if (esperaMs > 0) return AUTOMATION_STATUS.AGUARDANDO_INTERVALO;
    return AUTOMATION_STATUS.ENVIANDO;
  })();

  return { ...base, status, mensagem: MENSAGENS[status] };
}
