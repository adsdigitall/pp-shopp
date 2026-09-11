/**
 * Regras determinísticas do garimpo automático.
 * Não chama providers nem altera persistência: recebe uma oferta normalizada
 * e devolve score/motivos para o orquestrador decidir o que enfileirar.
 */

const DEFAULT_AUTOMATION_FILTERS = Object.freeze({
  minSales: 10,
  minRating: 4.5,
  minReviews: 0,
  preferredMinPrice: 15,
  preferredMaxPrice: 120,
  preferredMinDiscount: 20,
  minScore: 70,
});

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Score comercial de 0 a 100, com vendas/qualidade acima de comissão. */
export function scoreAutomationOffer(offer) {
  const sales = Math.max(0, finiteNumber(offer?.salesCount ?? offer?.soldCount));
  const rating = Math.max(0, Math.min(5, finiteNumber(offer?.rating ?? offer?.ratingStar)));
  const reviews = Math.max(0, finiteNumber(offer?.reviewsCount ?? offer?.reviewCount));
  const discount = Math.max(0, Math.min(100, finiteNumber(offer?.discountPercentage)));
  const price = finiteNumber(offer?.currentPrice, NaN);
  const commission = Math.max(0, finiteNumber(offer?.commissionRate ?? offer?.commissionPercentage));
  const stockRaw = offer?.stock;
  const stock = stockRaw === null || stockRaw === undefined || stockRaw === '' ? NaN : finiteNumber(stockRaw, NaN);

  const salesPoints = Math.min(25, Math.log10(Math.max(1, sales)) / 4 * 25);
  const ratingPoints = (rating / 5) * 20;
  const reviewPoints = Math.min(15, Math.log10(Math.max(1, reviews)) / 4 * 15);
  const discountPoints = Math.min(15, discount / 50 * 15);
  const pricePoints = Number.isFinite(price) && price >= 15 && price <= 120 ? 10 : 0;
  const commissionPoints = Math.min(10, commission / 20 * 10);
  const stockPoints = !Number.isFinite(stock) || stock > 0 ? 5 : 0;

  return Math.max(0, Math.min(100, Math.round(
    salesPoints + ratingPoints + reviewPoints + discountPoints + pricePoints + commissionPoints + stockPoints,
  )));
}

export function classifyAutomationScore(score) {
  const value = Math.max(0, Math.min(100, finiteNumber(score)));
  if (value >= 90) return 'Campeão';
  if (value >= 80) return 'Muito bom';
  if (value >= 70) return 'Bom';
  if (value >= 50) return 'Regular';
  return 'Fraco';
}

export function evaluateAutomationOffer(offer, overrides = {}) {
  const filters = { ...DEFAULT_AUTOMATION_FILTERS, ...overrides };
  const sales = Math.max(0, finiteNumber(offer?.salesCount ?? offer?.soldCount));
  const rating = finiteNumber(offer?.rating ?? offer?.ratingStar, 0);
  const reviews = Math.max(0, finiteNumber(offer?.reviewsCount ?? offer?.reviewCount));
  const price = finiteNumber(offer?.currentPrice, NaN);
  const stockRaw = offer?.stock;
  const stock = stockRaw === null || stockRaw === undefined || stockRaw === '' ? NaN : finiteNumber(stockRaw, NaN);
  const score = scoreAutomationOffer(offer);
  const reasons = [];

  if (sales <= 0) reasons.push('0 vendas');
  else if (sales < filters.minSales) reasons.push('Poucas vendas');
  if (rating > 0 && rating < filters.minRating) reasons.push('Avaliação baixa');
  if (filters.minReviews > 0 && reviews < filters.minReviews) reasons.push('Poucas avaliações');
  if (Number.isFinite(stock) && stock <= 0) reasons.push('Produto sem estoque');
  if (!Number.isFinite(price)) reasons.push('Preço ausente');
  else if (price < filters.preferredMinPrice || price > filters.preferredMaxPrice) reasons.push('Preço fora da faixa');
  if (score < filters.minScore) reasons.push('Score abaixo do mínimo');

  return {
    approved: reasons.length === 0,
    score,
    classification: classifyAutomationScore(score),
    reasons,
    filters,
  };
}

export function validateAutomationOfferForDispatch(offer) {
  const title = String(offer?.name || offer?.productName || offer?.title || '').trim();
  const price = finiteNumber(offer?.currentPrice, NaN);
  const affiliateUrl = String(offer?.affiliateUrl || offer?.affiliateLink || '').trim();
  const stockRaw = offer?.stock;
  const stock = stockRaw === null || stockRaw === undefined || stockRaw === '' ? NaN : finiteNumber(stockRaw, NaN);
  const errors = [];
  if (!title) errors.push('nome ausente');
  if (!Number.isFinite(price) || price <= 0) errors.push('preço ausente');
  if (!/^https?:\/\/\S+$/i.test(affiliateUrl)) errors.push('link de afiliado ausente');
  if (Number.isFinite(stock) && stock <= 0) errors.push('produto sem estoque');
  return { valid: errors.length === 0, errors };
}

export { DEFAULT_AUTOMATION_FILTERS };
