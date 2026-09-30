/**
 * Shared utilities for request search terms.
 */

/**
 * Sanitize a search term coming from query params.
 * Treats null/undefined/"null"/"undefined"/empty as empty string.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeSearchTerm(value) {
  const raw =
    value == null || value === "" ? "" : String(value).trim();
  const q = raw === "undefined" || raw === "null" ? "" : raw;
  return q;
}

/**
 * Prisma Client where for a free-text client filter.
 * Matches client name (partial), client number (prefix, optional leading "#"),
 * or system client id (exact, when the term is numeric).
 * @param {unknown} value
 * @returns {object | null}
 */
export function clientFilterWhere(value) {
  const term = sanitizeSearchTerm(value);
  if (!term) return null;

  const numberTerm = term.startsWith("#") ? term.slice(1).trim() : term;
  const or = [{ clientName: { contains: term, mode: "insensitive" } }];
  if (numberTerm) {
    or.push({ clientNumber: { startsWith: numberTerm, mode: "insensitive" } });
  }
  if (/^\d+$/.test(numberTerm)) {
    const id = parseInt(numberTerm, 10);
    if (id <= 2147483647) or.push({ id });
  }
  return { OR: or };
}

