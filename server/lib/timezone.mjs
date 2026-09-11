/**
 * Horário de referência das regras comerciais de disparo.
 *
 * Os servidores rodam em UTC (Easypanel/Vercel), mas pausa noturna,
 * pausa de fim de semana e janelas da automação valem no horário do
 * operador. Tudo aqui é calculado em America/Sao_Paulo por padrão,
 * sobrescrevível via DISPATCH_TIMEZONE.
 */

export const DISPATCH_TIMEZONE =
  process.env.DISPATCH_TIMEZONE || 'America/Sao_Paulo';

const WEEKDAY_TO_NUM = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Decompõe um instante em hora/minuto/dia-da-semana no fuso de disparo.
 * Usa Intl (sem dependências) e funciona igual em qualquer TZ do servidor.
 * @param {Date} [now]
 * @param {string} [timeZone]
 * @returns {{ hour: number, minute: number, day: number }}
 */
export function dispatchTimeParts(now = new Date(), timeZone = DISPATCH_TIMEZONE) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
        hour12: false,
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    return {
      // Alguns ICU retornam "24" à meia-noite com hour12:false.
      hour: Number(parts.hour) % 24,
      minute: Number(parts.minute),
      day: WEEKDAY_TO_NUM[parts.weekday] ?? now.getDay(),
    };
  } catch {
    return { hour: now.getHours(), minute: now.getMinutes(), day: now.getDay() };
  }
}

/** Minutos desde 00:00 no fuso de disparo (para comparar janelas "HH:MM"). */
export function dispatchMinutesOfDay(now = new Date(), timeZone) {
  const { hour, minute } = dispatchTimeParts(now, timeZone);
  return hour * 60 + minute;
}
