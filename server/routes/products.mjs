import { loadShopeeConfigForUser } from '../services/shopee/effectiveConfig.mjs';
import {
  searchProductOffers,
  mapFilterToShopeeArgs,
} from '../services/shopee/products.mjs';
import { normalizeProductOffers } from '../services/shopee/normalizer.mjs';

const ALLOWED_FILTERS = [
  'trending',
  'top_sales',
  'high_commission',
  'high_discount',
  'nacionais',
];

export function parseProductsQuery(url) {
  const qs = url.searchParams;
  const rawFilter = (qs.get('sort') || qs.get('filter') || 'trending').trim();
  const filter = ALLOWED_FILTERS.includes(rawFilter) ? rawFilter : 'trending';

  const keyword = (qs.get('keyword') || '').toString().slice(0, 80);
  const categoryIdRaw = Number.parseInt(qs.get('categoryId') || '', 10);
  const categoryId = Number.isInteger(categoryIdRaw) && categoryIdRaw > 0 ? categoryIdRaw : null;

  let page = Number.parseInt(qs.get('page') || '1', 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > 50) page = 50;

  let limit = Number.parseInt(qs.get('limit') || '12', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 12;
  // Teto real da API: acima de 50 itens ela responde 400.
  if (limit > 50) limit = 50;

  return { filter, keyword, categoryId, page, limit };
}

export async function handleProducts(req, res, { sendJson }) {
  const parsed = new URL(req.url || '/', `http://${req.headers.host}`);
  const { filter, keyword, categoryId, page, limit } = parseProductsQuery(parsed);
  const config = await loadShopeeConfigForUser();

  const { nodes, pageInfo } = await searchProductOffers({
    keyword,
    filter,
    page,
    limit,
    categoryId,
    config,
  });

  const products = normalizeProductOffers(nodes, filter);

  sendJson(res, 200, {
    products,
    meta: {
      source: 'shopee-affiliate-api',
      operation: 'productOfferV2',
      listType: mapFilterToShopeeArgs(filter).listType,
      sortType: mapFilterToShopeeArgs(filter).sortType,
      page: pageInfo.page,
      limit: pageInfo.limit,
      hasNextPage: pageInfo.hasNextPage,
      count: products.length,
    },
    // Contrato público interno: campos privados nunca devem ser removidos
    // deste painel, mas também jamais propagados para payloads de compartilhamento.
  });
}
