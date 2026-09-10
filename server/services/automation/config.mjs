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
  return normalizeIdList(value, { max });
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
