import { activeDoubleDateCampaign } from './campaigns.mjs';

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

// Campanhas e itens de limpeza precisam conciliar saída com retorno de
// afiliado. A API oficial permite pedir primeiro os de maior comissão; o gate
// abaixo ainda exige vendas, nota, desconto e score antes de enfileirar.
const HIGH_COMMISSION_DISCOVERY_CATEGORIES = new Set([
  'black-friday', 'natal-presentes', 'roupas-natal', 'ano-novo', 'datas-duplas',
  'limpeza-casa', 'ofertas-fortes', 'melhores-ofertas', 'compra-por-impulso',
]);

export function automationDiscoveryFilter(category) {
  return HIGH_COMMISSION_DISCOVERY_CATEGORIES.has(String(category || '').trim().toLowerCase())
    ? 'high_commission'
    : AUTOMATION_DISCOVERY_FILTER;
}

export const AUTOMATION_CATEGORY_PLAN = [
  // O que a massa compra no dia a dia e vende bem na Shopee (validado com o gate em 14/09/2026).
  // Mercearia (arroz, óleo, feijão, leite) ficou de fora: quase não vende na Shopee e paga 3%.
  {
    id: 'essenciais-dia-a-dia',
    terms: ['café', 'amaciante', 'shampoo', 'papel higiênico', 'desodorante', 'pote hermético', 'garrafa térmica', 'pano de prato', 'esponja', 'ventilador', 'sabonete', 'creme dental', 'detergente', 'tapete banheiro'],
  },
  // Limpeza tem procura recorrente e entra como prioridade operacional no
  // período de Natal, quando o grupo precisa de produtos úteis além de presentes.
  { id: 'limpeza-casa', terms: ['amaciante', 'desinfetante', 'lava roupas', 'sabão líquido', 'limpa vidro'] },
  { id: 'casa-cozinha', terms: ['air fryer', 'potes herméticos', 'utensílios cozinha', 'panela'] },
  { id: 'beleza-autocuidado', terms: ['beleza', 'skincare', 'maquiagem', 'cabelo'] },
  { id: 'organizacao', terms: ['organizadores', 'organizador', 'caixa organizadora', 'colmeia organizadora'] },
  { id: 'moda-feminina', terms: ['vestido feminino', 'blusa feminina', 'pijama feminino', 'look feminino', 'bolsa feminina'] },
  { id: 'utilidades', terms: ['carregador', 'luminária', 'suporte celular', 'mini ventilador'] },
  { id: 'maternidade-infantil', terms: ['infantil', 'brinquedo', 'bebê'] },
  { id: 'cama-mesa-banho', terms: ['toalha', 'jogo de lençol', 'tapete'] },
  { id: 'banheiro', terms: ['banheiro', 'organizador banheiro', 'tapete banheiro'] },
  { id: 'acessorios-femininos', terms: ['brinco', 'colar feminino', 'presilha cabelo'] },
  { id: 'eletronicos-baratos', terms: ['fone bluetooth', 'carregador', 'caixa de som'] },
  { id: 'compra-por-impulso', terms: ['gadget', 'kit', 'presente criativo'] },
  { id: 'melhores-ofertas', terms: ['promoção', 'kit', 'casa', 'oferta'] },
  { id: 'ofertas-fortes', terms: ['cozinha', 'organizador', 'oferta relâmpago', 'desconto'] },
  // Campanhas sazonais: entram na rotação apenas dentro da janela comercial.
  // As buscas permanecem curtas porque a API da Shopee zera resultados com
  // frases longas. A régua de desconto e comissão fica em CATEGORY_RULES.
  { id: 'black-friday', terms: ['black friday', 'oferta relâmpago', 'super oferta', 'cupom desconto'] },
  { id: 'natal-presentes', terms: ['presente natal', 'kit presente', 'pisca pisca', 'árvore natal', 'brinquedo'] },
  { id: 'roupas-natal', terms: ['roupa natal', 'vestido natal', 'pijama natal', 'look natal', 'camiseta natal'] },
  { id: 'ano-novo', terms: ['roupa branca', 'vestido branco', 'mesa ano novo', 'taça champanhe', 'decoração ano novo'] },
  { id: 'datas-duplas', terms: ['oferta relâmpago', 'cupom desconto', 'super oferta', 'promoção'] },
];

/** Campanhas recorrentes no calendário brasileiro (horário de São Paulo). */
export function isAutomationCategoryActive(category, now = new Date()) {
  const id = String(category || '').trim().toLowerCase();
  if (id === 'datas-duplas') return Boolean(activeDoubleDateCampaign(now));
  if (!['black-friday', 'natal-presentes', 'roupas-natal', 'ano-novo'].includes(id)) return true;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', month: 'numeric', day: 'numeric',
  }).formatToParts(now);
  const valueOf = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  const month = valueOf('month');
  const day = valueOf('day');
  if (id === 'black-friday') return month === 11;
  if (id === 'natal-presentes' || id === 'roupas-natal') return month === 11 || (month === 12 && day <= 25);
  return (month === 12 && day >= 26) || (month === 1 && day <= 7);
}

/**
 * Campanhas que passam à frente da faixa horária quando estão na temporada.
 * Assim, em novembro/dezembro o grupo recebe primeiro o que as pessoas estão
 * procurando agora, sem depender de alguém trocar o agendamento manualmente.
 */
export function seasonalAutomationCategories(now = new Date(), cursor = 0) {
  const seasonal = ['black-friday', 'natal-presentes', 'roupas-natal', 'ano-novo']
    .filter((category) => isAutomationCategoryActive(category, now));
  const offset = seasonal.length ? ((Math.trunc(cursor) % seasonal.length) + seasonal.length) % seasonal.length : 0;
  const rotated = [...seasonal.slice(offset), ...seasonal.slice(0, offset)];
  // Em data dupla ela continua na frente em todo ciclo; o segundo tema gira
  // entre Black Friday, Natal e roupas para a descoberta não ficar repetitiva.
  return activeDoubleDateCampaign(now) ? ['datas-duplas', ...rotated] : rotated;
}

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
  'limpeza-casa': {
    gate: { minSales: 50, preferredMinPrice: 12, preferredMaxPrice: 250, minDiscount: 20, minScore: 75, minCommissionRate: 10 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
  // Campanha não pode virar liquidação de comissão baixa: exige comissão
  // mínima própria, desconto real e uma pontuação mais alta que a normal.
  'black-friday': {
    gate: { minSales: 50, preferredMinPrice: 15, preferredMaxPrice: 800, minDiscount: 25, minScore: 75, minCommissionRate: 10 },
    requireTitleMatch: false,
    preferDiscount: true,
  },
  'natal-presentes': {
    gate: { minSales: 30, preferredMinPrice: 15, preferredMaxPrice: 500, minDiscount: 25, minScore: 78, minCommissionRate: 10 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
  'roupas-natal': {
    gate: { minSales: 30, preferredMinPrice: 20, preferredMaxPrice: 500, minDiscount: 25, minScore: 78, minCommissionRate: 10 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
  'ano-novo': {
    gate: { minSales: 30, preferredMinPrice: 20, preferredMaxPrice: 600, minDiscount: 25, minScore: 78, minCommissionRate: 10 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
  'datas-duplas': {
    gate: { minSales: 50, preferredMinPrice: 15, preferredMaxPrice: 800, minDiscount: 25, minScore: 78, minCommissionRate: 10 },
    requireTitleMatch: false,
    preferDiscount: true,
  },
  'casa-cozinha': {
    gate: { minSales: 40, preferredMinPrice: 20, preferredMaxPrice: 600, minDiscount: 20, minScore: 75, minCommissionRate: 10 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
  'moda-feminina': {
    gate: { minSales: 30, preferredMinPrice: 20, preferredMaxPrice: 500, minDiscount: 20, minScore: 75, minCommissionRate: 10 },
    requireTitleMatch: true,
    preferDiscount: true,
  },
  'ofertas-fortes': {
    gate: { minSales: 50, preferredMinPrice: 15, preferredMaxPrice: 800, minDiscount: 25, minScore: 78, minCommissionRate: 10 },
    requireTitleMatch: false,
    preferDiscount: true,
  },
  'melhores-ofertas': {
    gate: { minSales: 50, preferredMinPrice: 15, preferredMaxPrice: 800, minDiscount: 25, minScore: 78, minCommissionRate: 10 },
    requireTitleMatch: false,
    preferDiscount: true,
  },
  'compra-por-impulso': {
    gate: { minSales: 30, preferredMinPrice: 15, preferredMaxPrice: 500, minDiscount: 20, minScore: 75, minCommissionRate: 10 },
    requireTitleMatch: false,
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
