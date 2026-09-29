import { sanitizeSearchTerm } from "./search.js";
import { normalizeAccountNumber } from "./accountNumberNormalize.js";

/** Postgres int4 max. Longer digit strings are account numbers, not row ids. */
const MAX_INT4 = 2147483647;

/** How many rows to return per section. */
export const SEARCH_SECTION_LIMIT = 8;

/**
 * Escape `%`, `_`, and the `!` escape character for LIKE / ILIKE ... ESCAPE '!'.
 * @param {string} value
 */
export function escapeLike(value) {
  return String(value).replace(/[!%_]/g, (ch) => `!${ch}`);
}

/**
 * Normalize a portal search query.
 * A single letter is ignored. A single digit matches row ids and exact numbers only.
 * "#231" is a client-number lookup (the same convention as the client list), not a search for the text "#231".
 * @param {unknown} raw
 * @returns {null | {
 *   q: string,
 *   term: string,
 *   clientNumberOnly: boolean,
 *   isNumeric: boolean,
 *   id: number | null,
 *   like: string,
 *   prefix: string,
 *   strippedLike: string | null,
 *   useContains: boolean,
 * }}
 */
export function parseGlobalSearch(raw) {
  const q = sanitizeSearchTerm(raw).slice(0, 80);
  if (!q) return null;

  let term = q;
  let clientNumberOnly = false;
  if (q.startsWith("#")) {
    const numPart = q.slice(1).trim();
    if (/^\d+$/.test(numPart)) {
      term = numPart;
      clientNumberOnly = true;
    }
  }
  if (clientNumberOnly && !term) return null;

  const isNumeric = /^\d+$/.test(term);
  if (!clientNumberOnly && term.length < 2 && !isNumeric) return null;

  let id = null;
  if (isNumeric && !clientNumberOnly) {
    const n = Number(term);
    if (Number.isInteger(n) && n > 0 && n <= MAX_INT4) id = n;
  }

  const stripped = isNumeric && !clientNumberOnly ? normalizeAccountNumber(term) : "";
  const strippedLike =
    stripped && stripped !== term && stripped.length >= 2
      ? `%${escapeLike(stripped)}%`
      : null;

  return {
    q,
    term,
    clientNumberOnly,
    isNumeric,
    id,
    like: `%${escapeLike(term)}%`,
    prefix: `${escapeLike(term.toLowerCase())}%`,
    strippedLike,
    useContains: !clientNumberOnly && term.length >= 2,
  };
}
