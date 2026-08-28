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
    title: typeof node.productName === 'string' ? node.productName : '',
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
    soldCount: (() => {
      const s = parseNumber(node.sales);
      return s === null ? null : Math.round(s);
    })(),
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
