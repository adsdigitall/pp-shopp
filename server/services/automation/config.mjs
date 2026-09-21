/**
 * Normalização dos campos selecionáveis da automação de disparos.
 *
 * A UI envia apenas identificadores (`groupIds`, `categoryIds`); o backend
 * precisa persistir exatamente o que o usuário selecionou, sem descartar
 * silenciosamente nenhum campo. Descartar um campo no save faz a seleção
 * "sumir" ao voltar para a tela — bug já ocorrido com `groups: []` fixo.
 */

import { dispatchMinutesOfDay, dispatchTimeParts } from '../../lib/timezone.mjs';

/** Dias ativos da automação (0 = domingo ... 6 = sábado). Ausente = todos. */
export function normalizeActiveDays(value) {
  if (!Array.isArray(value)) return [0, 1, 2, 3, 4, 5, 6];
  const days = [...new Set(value.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return days.length ? days : [0, 1, 2, 3, 4, 5, 6];
}

function normalizeIdList(value, { max }) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => String(item ?? '').trim())
      .filter((item) => item.length > 0 && item.length <= 120),
  )].slice(0, max);
}

/** IDs de categorias selecionadas (ex.: "casa e cozinha", "beleza"). */
export function normalizeAutomationCategoryIds(value, max = 12) {
  return normalizeIdList(value, { max }).map(canonicalAutomationCategoryId).filter(Boolean).filter((id, index, list) => list.indexOf(id) === index);
}

/**
 * Unifica as três gerações de ids de categoria nos slugs do plano de
 * descoberta (AUTOMATION_CATEGORY_PLAN): rótulos da UI atual, slugs e
 * variantes antigas salvas. Sem isso, o salvo nunca dá match exato com a
 * tela e a seleção "some" visualmente — além de se perder no próximo save.
 * Desconhecidos passam como estão (viram keyword na descoberta).
 */
const CATEGORY_CANONICAL = new Map([
  ['casa e cozinha', 'casa-cozinha'],
  ['casa-cozinha', 'casa-cozinha'],
  ['beleza', 'beleza-autocuidado'],
  ['beleza-autocuidado', 'beleza-autocuidado'],
  ['organizadores', 'organizacao'],
  ['organizacao', 'organizacao'],
  ['moda feminina barata', 'moda-feminina'],
  ['moda feminina', 'moda-feminina'],
  ['moda-feminina', 'moda-feminina'],
  ['utilidades domésticas', 'utilidades'],
  ['utilidades domesticas', 'utilidades'],
  ['utilidades', 'utilidades'],
  ['maternidade e infantil', 'maternidade-infantil'],
  ['maternidade-infantil', 'maternidade-infantil'],
  ['cama mesa e banho', 'cama-mesa-banho'],
  ['cama-mesa-banho', 'cama-mesa-banho'],
  ['casa e banho', 'cama-mesa-banho'],
  ['banheiro', 'banheiro'],
  ['acessórios femininos', 'acessorios-femininos'],
  ['acessorios femininos', 'acessorios-femininos'],
  ['acessórios', 'acessorios-femininos'],
  ['acessorios', 'acessorios-femininos'],
  ['eletrônicos baratos', 'eletronicos-baratos'],
  ['eletronicos baratos', 'eletronicos-baratos'],
  ['eletronicos-baratos', 'eletronicos-baratos'],
  ['eletrônicos', 'eletronicos-baratos'],
  ['eletronicos', 'eletronicos-baratos'],
  ['celular', 'eletronicos-baratos'],
  ['compra por impulso', 'compra-por-impulso'],
  ['compra-por-impulso', 'compra-por-impulso'],
  ['melhores ofertas', 'melhores-ofertas'],
  ['melhores-ofertas', 'melhores-ofertas'],
  ['ofertas fortes', 'ofertas-fortes'],
  ['ofertas-fortes', 'ofertas-fortes'],
  ['essenciais', 'essenciais-dia-a-dia'],
  ['essenciais do dia a dia', 'essenciais-dia-a-dia'],
  ['essenciais-dia-a-dia', 'essenciais-dia-a-dia'],
]);

export function canonicalAutomationCategoryId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return CATEGORY_CANONICAL.get(raw.toLowerCase()) || raw;
}

/**
 * Grupos selecionados como objetos `{ id }`.
 * Nomes/sessão são enriquecidos no handler a partir dos grupos conhecidos;
 * aqui garantimos apenas ids válidos, únicos e limitados.
 */
export function normalizeAutomationGroupIds(value, max = 50) {
  return normalizeIdList(value, { max }).map((id) => ({ id }));
}

/**
 * Une lista salva + lista ao vivo sem perder grupos.
 * O ao vivo vence em caso de conflito (dado mais fresco); ids inéditos de
 * qualquer lado são preservados. Sync vazio/falho nunca reduz a lista.
 */
export function mergeGroupLists(saved, live) {
  const keyOf = (group) => String(group?.id ?? group?.groupId ?? '').trim();
  const merged = new Map();
  for (const group of [...(Array.isArray(saved) ? saved : []), ...(Array.isArray(live) ? live : [])]) {
    const key = keyOf(group);
    if (key) merged.set(key, group);
  }
  return [...merged.values()];
}

/**
 * Intervalos efetivos do disparo manual: valor explícito do wizard vence;
 * senão usa a config da automação; senão o padrão seguro.
 * Extração pura para travar o contrato em teste (um `?.` sobre variável
 * não declarada aqui já derrubou o POST /api/dispatch com 500).
 */
export function resolveDispatchIntervals(destinations = {}, body = {}, automationConfig = null) {
  const pick = (key) => destinations?.[key] ?? body?.[key] ?? automationConfig?.[key];
  const human = pick('humanMessageInterval') || {};
  const min = Math.round(Number(human.minOffers));
  const max = Math.round(Number(human.maxOffers));
  const repeat = Number(pick('repeatCooldownHours'));
  return {
    humanMessageInterval: {
      minOffers: Number.isFinite(min) ? Math.min(1000, Math.max(1, min)) : 8,
      maxOffers: Number.isFinite(max) ? Math.min(1000, Math.max(Number.isFinite(min) ? min : 1, max)) : 12,
    },
    repeatCooldownHours: Number.isFinite(repeat) ? Math.min(720, Math.max(1, repeat)) : 4,
  };
}

export function isValidAutomationTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
}

// Janelas padrão do garimpo. Podem ser substituídas por scheduleSlots na
// configuração da automação sem alterar o contrato existente de categorias.
export const DEFAULT_AUTOMATION_SCHEDULE = [
  { from: '08:00', until: '10:00', categories: ['casa-cozinha'] },
  { from: '10:00', until: '12:00', categories: ['organizacao'] },
  { from: '12:00', until: '14:00', categories: ['compra-por-impulso'] },
  { from: '14:00', until: '16:00', categories: ['beleza-autocuidado'] },
  { from: '16:00', until: '18:00', categories: ['moda-feminina'] },
  { from: '18:00', until: '20:00', categories: ['casa-cozinha', 'utilidades'] },
  { from: '20:00', until: '22:00', categories: ['melhores-ofertas'] },
  { from: '22:00', until: '23:00', categories: ['ofertas-fortes'] },
  // Madrugada: quem está acordado só para em desconto forte.
  { from: '23:00', until: '02:00', categories: ['ofertas-fortes', 'compra-por-impulso'] },
];

export function normalizeAutomationSchedule(value) {
  if (!Array.isArray(value) || !value.length) return DEFAULT_AUTOMATION_SCHEDULE;
  return value.slice(0, 12).map((slot, index) => ({
    id: typeof slot?.id === 'string' && slot.id.trim() ? slot.id.trim().slice(0, 80) : `slot-${index + 1}`,
    enabled: slot?.enabled !== false,
    order: Number.isFinite(Number(slot?.order)) ? Number(slot.order) : index,
    from: isValidAutomationTime(slot?.from) ? String(slot.from) : '08:00',
    until: isValidAutomationTime(slot?.until) ? String(slot.until) : '23:00',
    // Mesma canonicalização das categorias gerais: id antigo salvo na faixa
    // (ou rótulo colado à mão) vira slug do plano, senão vira keyword solta.
    categories: Array.isArray(slot?.categories)
      ? [...new Set(slot.categories.map(item => canonicalAutomationCategoryId(item)).filter(Boolean))].slice(0, 8)
      : [],
  }));
}

/** Faixa que cobre o instante, ignorando o interruptor (para decidir pausa). */
export function automationSlotAt(config, now = new Date()) {
  const schedule = normalizeAutomationSchedule(config?.scheduleSlots);
  // Janelas valem no horário de Brasília (DISPATCH_TIMEZONE).
  const current = dispatchMinutesOfDay(now);
  const parse = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  return schedule.find(slot => {
    const from = parse(slot.from);
    const until = parse(slot.until);
    return from < until ? current >= from && current < until : current >= from || current < until;
  }) || null;
}

/** Faixa ativa: cobre o instante E está ligada. Null = sem garimpo agora. */
export function activeAutomationSchedule(config, now = new Date()) {
  const slot = automationSlotAt(config, now);
  return slot && slot.enabled !== false ? slot : null;
}

/**
 * Comissão mínima aceita no garimpo, em % (10 = 10%).
 * Fora da faixa 0–50 volta para o padrão; 0 desliga o corte.
 */
export function normalizeMinCommissionRate(value, fallback = 10) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50) return fallback;
  return Math.round(parsed * 10) / 10;
}

/**
 * A automação pode enviar agora?
 *
 * Vale para a descoberta E para a fila já montada: "Parar de enviar às 01:00"
 * precisa parar o disparo do que já está enfileirado, senão a automação
 * continuava mandando madrugada adentro. Janela que vira o dia
 * (23:00 → 02:00) é suportada. Dia é o dia da data atual em Brasília —
 * depois da meia-noite já conta como o dia seguinte.
 */
export function automationIsWithinSchedule(config, now = new Date()) {
  const days = normalizeActiveDays(config?.activeDays);
  if (!days.includes(dispatchTimeParts(now).day)) return false;
  const from = isValidAutomationTime(config?.activeFrom) ? String(config.activeFrom) : '08:00';
  const until = isValidAutomationTime(config?.activeUntil) ? String(config.activeUntil) : '23:00';
  if (from === until) return true;
  const current = dispatchMinutesOfDay(now);
  const parse = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const start = parse(from);
  const end = parse(until);
  return start < end ? current >= start && current < end : current >= start || current < end;
}

/**
 * Disparo da fila permitido agora. Só a automação respeita a janela: o que o
 * usuário mandou enviar (ou agendou na mão) sai na hora marcada.
 */
export function dispatchJobAllowedNow(job, config, now = new Date()) {
  if (job?.source !== 'queue_automation') return true;
  return automationIsWithinSchedule(config, now);
}
