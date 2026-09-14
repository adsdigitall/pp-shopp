/**
 * Buscas da descoberta automática por categoria.
 *
 * A API de afiliados da Shopee devolve 0 produtos para palavras-chave longas
 * ("melhores ofertas promoção desconto cupom mais vendidos"), o que deixava
 * faixas inteiras sem disparo. Cada categoria usa buscas curtas, validadas
 * contra a API real com o gate da automação, e roda uma por ciclo.
 */

// "trending" devolve lançamentos sem vendas/avaliação e nunca passa no gate.
export const AUTOMATION_DISCOVERY_FILTER = 'top_sales';

export const AUTOMATION_CATEGORY_PLAN = [
  // O que a massa compra no dia a dia e vende bem na Shopee (validado com o gate em 14/09/2026).
  // Mercearia (arroz, óleo, feijão, leite) ficou de fora: quase não vende na Shopee e paga 3%.
  {
    id: 'essenciais-dia-a-dia',
    terms: ['café', 'amaciante', 'shampoo', 'papel higiênico', 'desodorante', 'pote hermético', 'garrafa térmica', 'pano de prato', 'esponja', 'ventilador', 'sabonete', 'creme dental', 'detergente', 'tapete banheiro'],
  },
  { id: 'casa-cozinha', terms: ['casa e cozinha', 'cozinha', 'utensílios cozinha', 'potes'] },
  { id: 'beleza-autocuidado', terms: ['beleza', 'skincare', 'maquiagem', 'cabelo'] },
  { id: 'organizacao', terms: ['organizadores', 'organizador', 'caixa organizadora', 'colmeia organizadora'] },
  { id: 'moda-feminina', terms: ['legging', 'blusa feminina', 'bolsa feminina', 'chinelo feminino', 'pijama feminino'] },
  { id: 'utilidades', terms: ['carregador', 'luminária', 'suporte celular', 'mini ventilador'] },
  { id: 'maternidade-infantil', terms: ['infantil', 'brinquedo', 'bebê'] },
  { id: 'cama-mesa-banho', terms: ['toalha', 'jogo de lençol', 'tapete'] },
  { id: 'banheiro', terms: ['banheiro', 'organizador banheiro', 'tapete banheiro'] },
  { id: 'acessorios-femininos', terms: ['brinco', 'colar feminino', 'presilha cabelo'] },
  { id: 'eletronicos-baratos', terms: ['fone bluetooth', 'carregador', 'caixa de som'] },
  { id: 'compra-por-impulso', terms: ['gadget', 'kit', 'presente criativo'] },
  { id: 'melhores-ofertas', terms: ['promoção', 'kit', 'casa', 'oferta'] },
  { id: 'ofertas-fortes', terms: ['cozinha', 'organizador', 'oferta relâmpago', 'desconto'] },
];

function rotate(list, start) {
  const offset = ((Math.trunc(start) % list.length) + list.length) % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)];
}

/**
 * Buscas a tentar neste ciclo, na ordem. Slug conhecido rotaciona pelos termos
 * da categoria; palavra-chave livre é buscada como veio; vazio usa o plano geral.
 */
export function automationSearchTerms(category, cursor = 0) {
  const safeCursor = Math.max(0, Number(cursor) || 0);
  const raw = String(category || '').trim().toLowerCase();
  if (!raw) {
    const plan = AUTOMATION_CATEGORY_PLAN[safeCursor % AUTOMATION_CATEGORY_PLAN.length];
    return rotate(plan.terms, safeCursor);
  }
  const plan = AUTOMATION_CATEGORY_PLAN.find(item => item.id === raw);
  return plan ? rotate(plan.terms, safeCursor) : [String(category).trim()];
}

// Regras por categoria. Essenciais são baratos e de giro alto: aceitam a partir de
// R$ 8, exigem muita venda e só entram se o título tiver o termo buscado (a busca
// da Shopee devolve "hidratante facial" para "arroz").
const CATEGORY_RULES = {
  'essenciais-dia-a-dia': {
    gate: { preferredMinPrice: 8, preferredMaxPrice: 120, minSales: 500 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
};

export function automationCategoryRules(category) {
  const rules = CATEGORY_RULES[String(category || '').trim().toLowerCase()];
  return rules
    ? { gate: { ...rules.gate }, requireTitleMatch: rules.requireTitleMatch, preferDiscount: rules.preferDiscount }
    : { gate: {}, requireTitleMatch: false, preferDiscount: false };
}

const STOPWORDS = new Set(['de', 'da', 'do', 'em', 'e', 'para', 'com']);
const normalizeWords = (text) => String(text || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(Boolean);

// O vendedor põe o que o produto É no começo do nome; acessório que só cita o
// produto ("Chaleira ... para Café") traz o termo lá no fim.
const TITLE_HEAD_WORDS = 5;
// Nome que começa assim é acessório do produto, não o produto ("Suporte de Papel Higiênico").
const ACCESSORY_LEADS = new Set(['suporte', 'porta', 'dispenser', 'dispensador', 'organizador', 'copo', 'caneca', 'capa', 'escorredor', 'lixeira', 'forma', 'coador']);

/**
 * Todas as palavras do termo aparecem no título (aceita plural: "pote" casa com
 * "potes") e a primeira delas está entre as primeiras palavras do nome.
 */
export function offerMatchesSearchTerm(title, term) {
  const titleWords = normalizeWords(title);
  const termWords = normalizeWords(term).filter((word) => !STOPWORDS.has(word));
  if (!titleWords.length || !termWords.length) return false;
  const matches = (word, candidate) => candidate === word || (word.length >= 3 && candidate.startsWith(word));
  const positions = termWords.map((word) => titleWords.findIndex((candidate) => matches(word, candidate)));
  if (positions.some((index) => index < 0)) return false;
  const first = Math.min(...positions);
  // Acessório antes do produto, mesmo depois da marca ("MEIDOO Suporte para papel higiênico").
  if (titleWords.slice(0, first).some((word) => ACCESSORY_LEADS.has(word) && !termWords.includes(word))) return false;
  return first < TITLE_HEAD_WORDS;
}
