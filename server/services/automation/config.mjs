/**
 * Normalização dos campos selecionáveis da automação de disparos.
 *
 * A UI envia apenas identificadores (`groupIds`, `categoryIds`); o backend
 * precisa persistir exatamente o que o usuário selecionou, sem descartar
 * silenciosamente nenhum campo. Descartar um campo no save faz a seleção
 * "sumir" ao voltar para a tela — bug já ocorrido com `groups: []` fixo.
 */

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
