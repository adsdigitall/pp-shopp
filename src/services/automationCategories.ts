/**
 * Catálogo de categorias da automação + sugestões por horário.
 *
 * Os ids são os mesmos slugs do plano de descoberta do backend
 * (server/services/automation/categories.mjs). O teste
 * tests/automation-ids-contract.test.mjs garante que continuem canônicos —
 * id fora do plano vira keyword solta na busca e a seleção "some" da tela.
 */

export interface AutomationCategory {
  id: string;
  label: string;
  /** Aparece na lista principal "categorias que o piloto pode buscar". */
  prioritized: boolean;
}

export const AUTOMATION_CATEGORY_CATALOG: AutomationCategory[] = [
  { id: 'essenciais-dia-a-dia', label: 'Essenciais do dia a dia (casa, limpeza, higiene, café)', prioritized: true },
  { id: 'casa-cozinha', label: 'Casa e cozinha (50%)', prioritized: true },
  { id: 'beleza-autocuidado', label: 'Beleza e autocuidado (20%)', prioritized: true },
  { id: 'organizacao', label: 'Organização (15%)', prioritized: true },
  { id: 'moda-feminina', label: 'Moda feminina barata (10%)', prioritized: true },
  { id: 'utilidades', label: 'Utilidades do dia a dia (5%)', prioritized: true },
  { id: 'maternidade-infantil', label: 'Maternidade e infantil', prioritized: true },
  { id: 'cama-mesa-banho', label: 'Cama, mesa e banho', prioritized: true },
  { id: 'banheiro', label: 'Banheiro', prioritized: true },
  { id: 'acessorios-femininos', label: 'Acessórios femininos', prioritized: true },
  { id: 'eletronicos-baratos', label: 'Eletrônicos baratos', prioritized: true },
  { id: 'compra-por-impulso', label: 'Compra por impulso (gadget, kit, presente)', prioritized: false },
  { id: 'melhores-ofertas', label: 'Melhores ofertas do dia', prioritized: false },
  { id: 'ofertas-fortes', label: 'Ofertas fortes (relâmpago e desconto alto)', prioritized: false },
];

const LABEL_BY_ID = new Map(AUTOMATION_CATEGORY_CATALOG.map((item) => [item.id, item.label]));

/** Rótulo para exibir. Categoria digitada à mão aparece como veio. */
export function categoryLabel(id: string): string {
  return LABEL_BY_ID.get(id) || id;
}

export const PRIORITIZED_AUTOMATION_CATEGORIES = AUTOMATION_CATEGORY_CATALOG.filter((item) => item.prioritized);

/** "HH:MM" -> minutos desde 00:00. Null quando o horário não é válido. */
export function timeToMinutes(value: string): number | null {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')
    ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
    : null;
}

interface SuggestionRule {
  /** Início da fatia do dia, em minutos. A fatia vai até o início da próxima. */
  startMinutes: number;
  categories: string[];
  reason: string;
}

/**
 * Sugestões por fatia do dia. Baseadas em quando cada tipo de compra acontece:
 * de manhã a casa está em pé, à tarde entra cuidado pessoal e moda, à noite o
 * pico de compra por impulso, na madrugada só desconto forte segura atenção.
 */
const SUGGESTION_RULES: SuggestionRule[] = [
  { startMinutes: 0, categories: ['ofertas-fortes', 'compra-por-impulso'], reason: 'Madrugada: quem está acordado só para em desconto forte.' },
  { startMinutes: 5 * 60, categories: ['essenciais-dia-a-dia'], reason: 'Começo do dia: item de reposição, do tipo que acaba em casa.' },
  { startMinutes: 8 * 60, categories: ['casa-cozinha', 'essenciais-dia-a-dia'], reason: 'Manhã: casa em ordem, cozinha e limpeza.' },
  { startMinutes: 10 * 60, categories: ['organizacao', 'banheiro'], reason: 'Meio da manhã: organização e banheiro.' },
  { startMinutes: 12 * 60, categories: ['compra-por-impulso', 'utilidades'], reason: 'Almoço: celular na mão, compra rápida de impulso.' },
  { startMinutes: 14 * 60, categories: ['beleza-autocuidado', 'acessorios-femininos'], reason: 'Tarde: beleza e autocuidado.' },
  { startMinutes: 16 * 60, categories: ['moda-feminina', 'acessorios-femininos'], reason: 'Fim da tarde: moda feminina barata.' },
  { startMinutes: 18 * 60, categories: ['casa-cozinha', 'utilidades'], reason: 'Volta para casa: utilidade e cozinha.' },
  { startMinutes: 20 * 60, categories: ['melhores-ofertas', 'eletronicos-baratos'], reason: 'Horário nobre: o que tem mais saída e eletrônico barato.' },
  { startMinutes: 22 * 60, categories: ['ofertas-fortes', 'compra-por-impulso'], reason: 'Noite: desconto alto e compra por impulso.' },
];

export interface CategorySuggestion {
  categories: string[];
  reason: string;
}

/**
 * Sugestão para a faixa. Usa o horário de início; faixa que vira o dia
 * (23:00 → 02:00) cai na regra da noite, que é onde ela começa.
 */
export function suggestCategoriesForSlot(from: string, until?: string): CategorySuggestion {
  const start = timeToMinutes(from);
  if (start === null) return { categories: ['melhores-ofertas'], reason: 'Sem horário definido: ofertas em alta.' };
  const rule = [...SUGGESTION_RULES].reverse().find((item) => start >= item.startMinutes) || SUGGESTION_RULES[0];
  const end = until ? timeToMinutes(until) : null;
  // Faixa longa (mais de 4h) ganha uma categoria a mais para não repetir tanto.
  const duration = end === null || start === end ? null : (end - start + 1440) % 1440;
  if (duration !== null && duration > 240) {
    const extra = SUGGESTION_RULES.find((item) => item !== rule && !rule.categories.includes(item.categories[0]));
    if (extra) return { categories: [...rule.categories, extra.categories[0]], reason: `${rule.reason} Faixa longa: entra mais uma categoria no rodízio.` };
  }
  return { categories: [...rule.categories], reason: rule.reason };
}
