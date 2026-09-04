const DEFAULT_REFRESH_PAGE_LIMIT = 5;
const DISCOVERY_QUERIES = [
  'moda feminina',
  'casa e banho',
  'infantil',
  'beleza',
  'acessórios',
  'eletrônicos',
];

export function nextRefreshPage(
  currentPage: number,
  pageLimit = DEFAULT_REFRESH_PAGE_LIMIT,
): number {
  if (!Number.isInteger(currentPage) || currentPage < 1) return 1;
  if (!Number.isInteger(pageLimit) || pageLimit < 2) return 1;
  return currentPage >= pageLimit ? 1 : currentPage + 1;
}

export function nextRefreshQuery(selectedQuery: string, currentIndex: number) {
  const selected = selectedQuery.trim();
  if (selected) return { query: selected, nextIndex: currentIndex };

  const safeIndex = Number.isInteger(currentIndex) && currentIndex >= 0
    ? currentIndex % DISCOVERY_QUERIES.length
    : 0;
  return {
    query: DISCOVERY_QUERIES[safeIndex],
    nextIndex: (safeIndex + 1) % DISCOVERY_QUERIES.length,
  };
}

export function mergeFreshProducts<T extends { id: string }>(
  current: T[],
  incoming: T[],
  recentlySeen: Set<string>,
  limit: number,
): T[] {
  const uniqueIncoming = incoming.filter(
    (product, index, list) => list.findIndex((item) => item.id === product.id) === index,
  );
  const unseen = uniqueIncoming.filter((product) => !recentlySeen.has(product.id));
  const fallback = [...uniqueIncoming, ...current].filter(
    (product, index, list) => list.findIndex((item) => item.id === product.id) === index,
  );
  return [...unseen, ...fallback.filter((product) => !unseen.some((item) => item.id === product.id))]
    .slice(0, Math.max(0, limit));
}

export function getPullRefreshDistance(startY: number, currentY: number, scrollY: number) {
  if (scrollY > 0 || currentY <= startY) return 0;
  return Math.min(90, (currentY - startY) / 2);
}

export function shouldTriggerPullRefresh(distance: number, threshold = 60) {
  return distance >= threshold;
}
