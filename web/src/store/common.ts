/** Default number of items per page for paginated API responses. */
export const DEFAULT_PAGE_SIZE = 10;

/** Max `limit` the API accepts on list endpoints (see api_v2.md). */
export const MAX_API_PAGE_SIZE = 100;

export const getFormattedDate = () => {
  const date = new Date();
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();
  const ordinalSuffix =
    day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
  return `${day}${ordinalSuffix}${month}${year}`;
};

/** Paginated list response per API v2 (limit, offset, data, total, hasMore) */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export const emptyPaginated = <T>(): PaginatedResponse<T> => ({
  data: [],
  total: 0,
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
  hasMore: false,
});
