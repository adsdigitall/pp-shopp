/**
 * Ritmo diário humanizado: mensagens de relacionamento em horários fixos
 * (bom dia, aquecimento, almoço, voltei, fim de tarde, boa noite).
 *
 * Puro e testável: decide o que está vencido; o envio mora no worker.
 * Sem nome, sem assinatura — voz feminina genérica, como grupo de verdade.
 */
import { DISPATCH_TIMEZONE } from '../../lib/timezone.mjs';

export const DEFAULT_DAILY_RHYTHM = [
  {
    id: 'bom-dia',
    label: 'Bom dia',
    time: '07:30',
    enabled: true,
    messages: [
      'Bom dia, meninas! ☀️ Bora começar o dia com o pé direito 💛',
      'Bom dia, gente! Hoje tem achadinho bom vindo aí ✨',
      'Bom dia! Que seu dia seja leve e cheio de coisa boa 💕',
    ],
  },
  {
    id: 'aquecimento',
    label: 'Aquecimento (10 min antes)',
    time: '07:50',
    enabled: true,
    messages: [
      'Tô garimpando aqui tudinho pra vocês, daqui a pouquinho começo a mandar as melhores 👀',
      'Já tô olhando as ofertas com carinho, em 10 minutinhos começo 💛',
    ],
  },
  {
    id: 'almoco',
    label: 'Pausa do almoço',
    time: '12:00',
    enabled: true,
    messages: [
      'Vou dar uma pausa pro almoço, meninas 🍽️ Já volto com mais achadinhos!',
      'Horário de almoço por aqui, já volto com novidades ✨',
    ],
  },
  {
    id: 'voltei',
    label: 'Voltei do almoço',
    time: '13:00',
    enabled: true,
    messages: [
      'Voltei, meninas! Bora continuar que a tarde tá cheia de oferta boa ✨',
      'De volta! A tarde promete, fiquem ligadas 👀',
    ],
  },
  {
    id: 'tarde',
    label: 'Fim de tarde',
    time: '18:00',
    enabled: true,
    messages: [
      'Fim de tarde por aqui... separei umas coisinhas especiais pra vocês 💕',
      'Seis horas! Hora de conferir o que apareceu de bom hoje ✨',
    ],
  },
  {
    id: 'boa-noite',
    label: 'Boa noite',
    time: '22:50',
    enabled: true,
    messages: [
      'Boa noite, meninas 🌙 Obrigada pela companhia de hoje, Deus abençoe vocês. Durmam bem 💛',
      'Boa noite! Que vocês descansem bem, amanhã tem mais achadinhos ✨ Deus abençoe 🙏',
    ],
  },
];

/** Mescla o salvo pelo usuário sobre os padrões (horário validado). */
export function normalizeDailyRhythm(value) {
  const list = Array.isArray(value) ? value : [];
  const byId = new Map(
    list.filter((s) => s && typeof s.id === 'string').map((s) => [s.id, s]),
  );
  return DEFAULT_DAILY_RHYTHM.map((def) => {
    const custom = byId.get(def.id) || {};
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(custom.time || ''))
      ? String(custom.time)
      : def.time;
    return {
      id: def.id,
      label: def.label,
      time,
      enabled: custom.enabled !== false,
      messages: def.messages,
    };
  });
}

/** Chave do dia (YYYY-MM-DD) no fuso de disparo. */
export function rhythmDayKey(now = new Date(), timeZone = DISPATCH_TIMEZONE) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    if (parts.year && parts.month && parts.day) {
      return `${parts.year}-${parts.month}-${parts.day}`;
    }
  } catch {
    /* fallback abaixo */
  }
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Slots vencidos e ainda não enviados hoje. Atraso tolerado: 20 min
 * (passou disso, pula — "bom dia" às 15h é mais robô que humano).
 */
export function slotsDueToday({ slots, nowMinutes, sentToday = [], lateMinutes = 20 }) {
  const sent = new Set(sentToday);
  return (slots || []).filter((slot) => {
    if (!slot || slot.enabled === false) return false;
    if (sent.has(slot.id)) return false;
    const [h, m] = String(slot.time || '').split(':').map(Number);
    if (!Number.isInteger(h) || !Number.isInteger(m)) return false;
    const at = h * 60 + m;
    return nowMinutes >= at && nowMinutes - at <= lateMinutes;
  });
}

/** Variação do dia (estável no dia, muda no dia seguinte). */
export function pickRhythmMessage(slot, dayKey) {
  const msgs = Array.isArray(slot?.messages) && slot.messages.length ? slot.messages : null;
  if (!msgs) return '';
  let seed = 0;
  for (const ch of String(`${dayKey || ''}:${slot.id}`)) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return msgs[seed % msgs.length];
}
