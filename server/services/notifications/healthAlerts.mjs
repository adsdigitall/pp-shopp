/**
 * Avisos de saúde da automação no celular.
 *
 * Quando o WhatsApp cai (ou a automação para por outro motivo), o grupo deixa
 * de receber e ninguém fica sabendo até abrir o app. Aqui decidimos QUANDO
 * avisar, sem I/O, para o teste travar as regras:
 *
 * - só avisa problema que PERSISTE (evita aviso a cada oscilação da sessão);
 * - repete no máximo de 6 em 6 horas enquanto durar;
 * - avisa também quando volta ao normal, se chegou a avisar do problema;
 * - "parado dentro do horário" exige silêncio longo (2h) para não avisar à toa
 *   quando é só o filtro sem oferta boa num ciclo.
 */

export const PERSISTENCIA_MS = 3 * 60_000;
export const REPETE_ALERTA_MS = 6 * 60 * 60_000;
export const SILENCIO_MAXIMO_MS = 2 * 60 * 60_000;

/** Motivos que merecem aviso no celular, com o texto de cada um. */
const PROBLEMAS = {
  'whatsapp-fora': {
    title: 'WhatsApp desconectado',
    body: 'O Radar parou de enviar ofertas. Abra o app e reconecte o WhatsApp.',
  },
  'sem-grupo': {
    title: 'Nenhum grupo selecionado',
    body: 'A automação está ligada, mas sem grupo para receber. Escolha os grupos no app.',
  },
  parado: {
    title: 'Sem enviar há mais de 2 horas',
    body: 'Está dentro do horário e nada foi enviado. Veja o motivo na tela da Automação.',
  },
};

/**
 * @param {object} entrada
 * @param {object} entrada.diagnostico saída de diagnoseAutomation
 * @param {object|null} entrada.previous estado salvo ({ problema, desde, avisadoEm })
 * @param {Date} [entrada.agora]
 * @returns {{ alerts: Array<{id:string,title:string,body:string}>, state: object }}
 */
export function planHealthAlerts({ diagnostico, previous = null, agora = new Date() }) {
  const t = agora.getTime();
  const anterior = previous && typeof previous === 'object' ? previous : {};
  const alerts = [];

  // Automação desligada é escolha do usuário: nunca vira aviso.
  if (!diagnostico?.ligada) {
    return { alerts, state: { problema: null, desde: null, avisadoEm: null, checadoEm: new Date(t).toISOString() } };
  }

  const paradoDemais = diagnostico.dentroDoHorario
    && diagnostico.whatsappConectado
    && diagnostico.ultimoEnvio
    && t - new Date(diagnostico.ultimoEnvio).getTime() >= SILENCIO_MAXIMO_MS;

  const problema = PROBLEMAS[diagnostico.status] ? diagnostico.status : (paradoDemais ? 'parado' : null);

  if (!problema) {
    // Voltou ao normal depois de um aviso: fecha o ciclo avisando a melhora.
    if (anterior.problema && anterior.avisadoEm) {
      alerts.push({
        id: `saude-ok-${t}`,
        title: 'Radar voltou a enviar',
        body: 'O problema foi resolvido e as ofertas voltaram a sair para os grupos.',
      });
    }
    return { alerts, state: { problema: null, desde: null, avisadoEm: null, checadoEm: new Date(t).toISOString() } };
  }

  const mesmoProblema = anterior.problema === problema;
  const desde = mesmoProblema && anterior.desde ? new Date(anterior.desde).getTime() : t;
  const avisadoEm = mesmoProblema && anterior.avisadoEm ? new Date(anterior.avisadoEm).getTime() : null;
  const persistiu = t - desde >= PERSISTENCIA_MS;
  const podeRepetir = avisadoEm === null || t - avisadoEm >= REPETE_ALERTA_MS;

  let novoAvisadoEm = avisadoEm;
  if (persistiu && podeRepetir) {
    const texto = PROBLEMAS[problema];
    alerts.push({ id: `saude-${problema}-${t}`, title: texto.title, body: texto.body });
    novoAvisadoEm = t;
  }

  return {
    alerts,
    state: {
      problema,
      desde: new Date(desde).toISOString(),
      avisadoEm: novoAvisadoEm ? new Date(novoAvisadoEm).toISOString() : null,
      checadoEm: new Date(t).toISOString(),
    },
  };
}
