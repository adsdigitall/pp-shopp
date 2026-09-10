/**
 * Normalizador: Shopee ProductOfferV2 -> contrato interno do app.
 *
 * REGRA DE OURO: nenhum valor é inventado. Se a API não trouxer o campo,
 * o resultado é null e o frontend exibe "Não disponível".
 *
 * *** PRIVATE DATA ***
 * commissionRate / commissionAmount são dados PRIVADOS do afiliado.
 * Podem ser exibidos apenas no painel privado; JAMAIS devem entrar em
 * payloads públicos de compartilhamento (ver src/services/offerGenerator.ts).
 */

/**
 * Converte "49.90" | 49.9 | "" | null | undefined -> number | null
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseMoney(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n =
    typeof raw === 'number'
      ? raw
      : Number.parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n =
    typeof raw === 'number'
      ? raw
      : Number.parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

/** Parse Shopee sales counts, including abbreviated values such as "2.7k". */
export function parseSalesCount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : null;
  const text = String(raw).trim().toLowerCase();
  const match = text.match(/([\d.,]+)\s*(k|mil|m|mi)?/i);
  if (!match) return null;
  let valueText = match[1];
  if (match[2]) valueText = valueText.replace(',', '.');
  else if (/^\d{1,3}([.,]\d{3})+$/.test(valueText)) valueText = valueText.replace(/[.,]/g, '');
  else valueText = valueText.replace(',', '.');
  const value = Number.parseFloat(valueText);
  if (!Number.isFinite(value)) return null;
  const suffix = match[2]?.toLowerCase();
  const multiplier = suffix === 'k' || suffix === 'mil' ? 1_000 : suffix === 'm' || suffix === 'mi' ? 1_000_000 : 1;
  return Math.round(value * multiplier);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Preço original derivado APENAS quando a API informa o % de desconto
 * (fórmula documentada pelos SDKs oficiais/da comunidade):
 *   original = atual / (1 - desconto/100)
 * @param {number|null} currentPrice
 * @param {unknown} discountRaw priceDiscountRate (ex.: 37 = 37%)
 * @returns {number|null}
 */
export function deriveOriginalPrice(currentPrice, discountRaw) {
  const discount = parseNumber(discountRaw);
  if (currentPrice === null || discount === null) return null;
  if (discount <= 0 || discount >= 100) return null;
  return round2(currentPrice / (1 - discount / 100));
}

/**
 * @param {any} node nó ProductOfferV2 retornado pela API
 * @returns {import('./types.mjs').NormalizedProduct}
 */
export function normalizeProductOffer(node) {
  if (!node || typeof node !== 'object') {
    throw new TypeError('normalizeProductOffer: node inválido');
  }

  const currentPrice =
    parseMoney(node.priceMin) ?? parseMoney(node.priceMax);
  const discountPercentage = (() => {
    const d = parseNumber(node.priceDiscountRate);
    return d === null ? null : Math.round(d);
  })();

  // commissionRate chega como fração string ("0.38" = 38%)
  const rateFraction = parseMoney(node.commissionRate);
  const commissionRate =
    rateFraction === null ? null : Math.round(rateFraction * 1000) / 10;

  // commission chega estimada em R$ ("18.99"); não recalculamos/inventamos
  const commissionAmount = parseMoney(node.commission);

  const id =
    node.itemId !== null && node.itemId !== undefined
      ? String(node.itemId)
      : '';

  return {
    id,
    title: typeof (node.productName || node.itemName || node.title || node.name) === 'string'
      ? String(node.productName || node.itemName || node.title || node.name).trim()
      : '',
    imageUrl: typeof node.imageUrl === 'string' ? node.imageUrl : '',
    currentPrice,
    originalPrice: deriveOriginalPrice(currentPrice, node.priceDiscountRate),
    discountPercentage,
    // --- PRIVATE DATA ---
    commissionRate,
    commissionAmount,
    // --------------------
    productUrl:
      typeof node.productLink === 'string' && node.productLink
        ? node.productLink
        : null,
    affiliateUrl:
      typeof node.offerLink === 'string' && node.offerLink
        ? node.offerLink
        : null,
    rating: parseNumber(node.ratingStar),
    soldCount: parseSalesCount(
      node.salesCount ?? node.soldCount ?? node.sales ?? node.sold ?? node.sold_quantity,
    ),
    categoryIds: Array.isArray(node.productCatIds) ? node.productCatIds : [],
    periodStartTime: parseNumber(node.periodStartTime),
    periodEndTime: parseNumber(node.periodEndTime),
    isFlashSale:
      parseNumber(node.periodStartTime) !== null &&
      parseNumber(node.periodEndTime) !== null &&
      Date.now() / 1000 >= parseNumber(node.periodStartTime) &&
      Date.now() / 1000 <= parseNumber(node.periodEndTime),
  };
}

/**
 * Normaliza a lista ordenando por desconto quando o filtro pedir
 * (única ordenação client-side, pois a API não expõe esse sort).
 * @param {any[]} nodes
 * @param {'trending'|'top_sales'|'high_commission'|'high_discount'} filter
 * @returns {import('./types.mjs').NormalizedProduct[]}
 */
export function normalizeProductOffers(nodes, filter) {
  const products = nodes.map(normalizeProductOffer).filter((p) => p.id);
  if (filter === 'high_discount') {
    products.sort(
      (a, b) => (b.discountPercentage ?? -1) - (a.discountPercentage ?? -1)
    );
  }
  return products;
}
