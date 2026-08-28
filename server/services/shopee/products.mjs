import { shopeeGraphqlRequest } from './client.mjs';

/**
 * Camada de produtos da Shopee Affiliate Open API.
 *
 * Operação oficial: `productOfferV2` (GraphQL, POST).
 * Parâmetros oficiais usados:
 *   keyword   String - busca por nome do produto
 *   listType  Int    - 0=Recomendados, 1=Maior comissão, 2=Top performance
 *   sortType  Int    - 1=Relevância, 2=Vendidos, 3=Maior preço,
 *                      4=Menor preço, 5=Comissão
 *   page      Int    - página (a partir de 1)
 *   limit     Int    - itens por página (1-500, default oficial 10)
 *
 * Resposta oficial:
 *   { nodes: ProductOfferV2[], pageInfo: { page, limit, hasNextPage } }
 */

/** Campos solicitados à API — apenas os documentados. */
const PRODUCT_OFFER_FIELDS = `
      itemId
      productName
      productLink
      offerLink
      imageUrl
      priceMin
      priceMax
      priceDiscountRate
      sales
      ratingStar
      commissionRate
      commission
      shopId
      shopName
      productCatIds
      periodStartTime
      periodEndTime`;

/** Escapa string para interpolação segura na query GraphQL inline. */
function gqlEscapeString(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    // remove quebras/controles que quebrariam a query
    .replace(/[\r\n\t]/g, ' ');
}

/**
 * Mapeia o filtro interno do app para os parâmetros OFICIAIS da API.
 * @param {'trending'|'top_sales'|'high_commission'|'high_discount'} filter
 * @returns {{ listType: number, sortType: number }}
 */
export function mapFilterToShopeeArgs(filter) {
  switch (filter) {
    case 'top_sales':
      return { listType: 0, sortType: 2 }; // mais vendidos
    case 'high_commission':
      return { listType: 1, sortType: 5 }; // maior comissão
    case 'high_discount':
      // A API não expõe ordenação por desconto; buscamos recomendados e
      // ordenamos no normalizador pelo priceDiscountRate documentado.
      return { listType: 0, sortType: 1 };
    case 'trending':
    default:
      return { listType: 0, sortType: 1 }; // recomendados / relevância
  }
}

/**
 * Busca ofertas de produto na Shopee.
 *
 * @param {{
 *   keyword?: string,
 *   filter?: 'trending'|'top_sales'|'high_commission'|'high_discount',
 *   page?: number,
 *   limit?: number,
 *   categoryId?: number,
 *   config: { appId: string, secret: string, apiUrl: string, timeoutMs: number }
 * }} p
 * @returns {Promise<{ nodes: any[], pageInfo: { page: number, limit: number, hasNextPage: boolean } }>}
 */
export async function searchProductOffers({
  keyword = '',
  filter = 'trending',
  page = 1,
  limit = 10,
  categoryId = null,
  config,
}) {
  const { listType, sortType } = mapFilterToShopeeArgs(filter);

  /** @type {string[]} */
  const args = [
    `listType: ${listType}`,
    `sortType: ${sortType}`,
    `page: ${page}`,
    `limit: ${limit}`,
  ];
  if (keyword.trim()) {
    args.unshift(`keyword: "${gqlEscapeString(keyword.trim())}"`);
  }
  if (Number.isInteger(categoryId) && categoryId > 0) {
    args.unshift(`productCatId: ${categoryId}`);
  }

  const query = `{
  productOfferV2(${args.join(', ')}) {
    nodes {
${PRODUCT_OFFER_FIELDS}
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}`;

  const data = await shopeeGraphqlRequest({ query, config });
  const result = data?.productOfferV2;

  return {
    nodes: Array.isArray(result?.nodes) ? result.nodes : [],
    pageInfo: {
      page: result?.pageInfo?.page ?? page,
      limit: result?.pageInfo?.limit ?? limit,
      hasNextPage: Boolean(result?.pageInfo?.hasNextPage),
    },
  };
}
