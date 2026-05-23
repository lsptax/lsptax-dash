/**
 * Reusable pagination for list APIs (clients, properties, prospects, invoices).
 * Normalizes limit/offset from query params and returns { data, total, limit, offset, hasMore }.
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse and clamp limit from query (string or number).
 * @param {string|number|undefined} limit - Raw limit from req.query
 * @param {number} [defaultLimit=10]
 * @param {number} [maxLimit=100]
 * @returns {number}
 */
export function normalizeLimit(limit, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
  if (limit == null || limit === "") return defaultLimit;
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return defaultLimit;
  return Math.min(n, maxLimit);
}

/**
 * Parse and clamp offset from query (string or number).
 * @param {string|number|undefined} offset - Raw offset from req.query
 * @returns {number}
 */
export function normalizeOffset(offset) {
  if (offset == null || offset === "") return 0;
  const n = parseInt(offset, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Paginate a Prisma model: runs findMany + count in parallel, applies optional transform.
 * Transform may be sync or async (e.g. for DocuSign enrichment on prospects).
 *
 * @param {object} model - Prisma model (e.g. prisma.client, prisma.property)
 * @param {object} options
 * @param {object} [options.where] - Prisma where clause
 * @param {object} [options.orderBy] - Prisma orderBy
 * @param {object} [options.select] - Prisma select
 * @param {string|number} [options.limit] - Page size (default 10, max 100)
 * @param {string|number} [options.offset] - Number of records to skip (default 0)
 * @param {(row: any) => any | Promise<any>} [options.transform] - Map each row to DTO (optional)
 * @param {number} [options.defaultLimit=10]
 * @param {number} [options.maxLimit=100]
 * @returns {Promise<{ data: any[], total: number, limit: number, offset: number, hasMore: boolean }>}
 */
export async function paginate(model, options = {}) {
  const {
    where = {},
    orderBy,
    select,
    limit,
    offset = 0,
    transform = (x) => x,
    defaultLimit = DEFAULT_LIMIT,
    maxLimit = MAX_LIMIT,
  } = options;

  const take = normalizeLimit(limit, defaultLimit, maxLimit);
  const skip = normalizeOffset(offset);

  const [items, total] = await Promise.all([
    model.findMany({ where, orderBy, select, take, skip }),
    model.count({ where }),
  ]);

  const data = await Promise.all(items.map((row) => Promise.resolve(transform(row))));

  return {
    data,
    total,
    limit: take,
    offset: skip,
    hasMore: skip + items.length < total,
  };
}

/**
 * Paginate an in-memory array (e.g. grouped invoices). Use when the list is
 * computed in JS rather than a single Prisma findMany.
 *
 * @param {any[]} items - Full list of items
 * @param {string|number} [limit] - Page size
 * @param {string|number} [offset] - Skip count
 * @param {{ defaultLimit?: number, maxLimit?: number }} [opts]
 * @returns {{ data: any[], total: number, limit: number, offset: number, hasMore: boolean }}
 */
export function paginateResult(items, limit, offset, opts = {}) {
  const { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = opts;
  const take = normalizeLimit(limit, defaultLimit, maxLimit);
  const skip = normalizeOffset(offset);
  const total = items.length;
  const data = items.slice(skip, skip + take);

  return {
    data,
    total,
    limit: take,
    offset: skip,
    hasMore: skip + data.length < total,
  };
}
