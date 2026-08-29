import { shopeeGraphqlRequest } from './client.mjs';

export async function fetchRecentConversions({ config, sinceSeconds, limit = 50 }) {
  const query = `{ conversionReport(purchaseTimeStart: ${Math.floor(sinceSeconds)}, purchaseTimeEnd: ${Math.floor(Date.now() / 1000)}, limit: ${Math.min(Math.max(limit, 1), 50)}) { nodes { conversionId purchaseTime conversionStatus totalCommission netCommission orders { orderId orderStatus items { itemId itemName itemPrice qty imageUrl itemTotalCommission categoryLv1Name categoryLv2Name categoryLv3Name } } } pageInfo { page hasNextPage } } }`;
  const data = await shopeeGraphqlRequest({ query, config });
  const result = data?.conversionReport;
  return { nodes: Array.isArray(result?.nodes) ? result.nodes : [], pageInfo: result?.pageInfo || {} };
}
