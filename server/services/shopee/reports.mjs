import { shopeeGraphqlRequest } from './client.mjs';

const NODE_FIELDS = 'conversionId purchaseTime conversionStatus totalCommission netCommission orders { orderId orderStatus items { itemId itemName itemPrice qty imageUrl itemTotalCommission categoryLv1Name categoryLv2Name categoryLv3Name } }';

function buildQuery({ start, end, limit, scrollId, withScroll }) {
  const scroll = scrollId ? `, scrollId: ${JSON.stringify(String(scrollId))}` : '';
  const pageInfo = withScroll ? 'pageInfo { page hasNextPage scrollId }' : 'pageInfo { page hasNextPage }';
  return `{ conversionReport(purchaseTimeStart: ${start}, purchaseTimeEnd: ${end}, limit: ${limit}${scroll}) { nodes { ${NODE_FIELDS} } ${pageInfo} } }`;
}

/**
 * Relatório de conversões da Shopee com todas as páginas (a API devolve no máximo
 * 50 por vez e continua pelo scrollId). Para em `maxPages` e devolve
 * hasNextPage=true para a tela avisar que ficou incompleto.
 */
export async function fetchRecentConversions({ config, sinceSeconds, limit = 50, maxPages = 10, request = shopeeGraphqlRequest }) {
  const start = Math.floor(sinceSeconds);
  const end = Math.floor(Date.now() / 1000);
  const pageSize = Math.min(Math.max(limit, 1), 50);
  const seen = new Set();
  const nodes = [];
  let scrollId = '';
  let hasNextPage = false;

  const addNodes = (list) => {
    for (const node of Array.isArray(list) ? list : []) {
      const key = node?.conversionId ? String(node.conversionId) : null;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      nodes.push(node);
    }
  };

  for (let page = 0; page < maxPages; page += 1) {
    let data;
    try {
      data = await request({ query: buildQuery({ start, end, limit: pageSize, scrollId, withScroll: true }), config });
    } catch (error) {
      // Conta sem suporte a scrollId: mantém o comportamento antigo (uma página).
      if (page > 0) throw error;
      data = await request({ query: buildQuery({ start, end, limit: pageSize, withScroll: false }), config });
      const legacy = data?.conversionReport;
      addNodes(legacy?.nodes);
      return { nodes, pageInfo: { hasNextPage: Boolean(legacy?.pageInfo?.hasNextPage) } };
    }
    const result = data?.conversionReport;
    addNodes(result?.nodes);
    hasNextPage = Boolean(result?.pageInfo?.hasNextPage);
    scrollId = result?.pageInfo?.scrollId || '';
    if (!hasNextPage || !scrollId) break;
  }
  return { nodes, pageInfo: { hasNextPage } };
}
