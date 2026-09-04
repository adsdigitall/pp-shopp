const DEFAULT_REFRESH_PAGE_LIMIT = 5;

export function nextRefreshPage(
  currentPage: number,
  pageLimit = DEFAULT_REFRESH_PAGE_LIMIT,
): number {
  if (!Number.isInteger(currentPage) || currentPage < 1) return 1;
  if (!Number.isInteger(pageLimit) || pageLimit < 2) return 1;
  return currentPage >= pageLimit ? 1 : currentPage + 1;
}
