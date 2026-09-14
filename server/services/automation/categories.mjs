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
