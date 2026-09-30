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
 * Client number typed in the list search, with an optional leading "#".
 * Returns null for name searches. Never the database id.
 * @param {unknown} value
 * @returns {string | null}
 */
export function clientNumberSearchTerm(value) {
  const term = sanitizeSearchTerm(value);
  if (!term) return null;
  const numberTerm = term.startsWith("#") ? term.slice(1).trim() : term;
  if (!/^\d+$/.test(numberTerm)) return null;
  return numberTerm;
}

/**
 * Prisma Client where for a free-text client filter.
 * A numeric term matches clientNumber exactly. Anything else matches the client name.
 * @param {unknown} value
 * @returns {object | null}
 */
export function clientFilterWhere(value) {
  const term = sanitizeSearchTerm(value);
  if (!term) return null;

  const number = clientNumberSearchTerm(term);
  if (number) {
    return { clientNumber: { equals: number, mode: "insensitive" } };
  }
  return { clientName: { contains: term, mode: "insensitive" } };
}

/**
 * Invoice rows whose client number on screen equals this number.
 * The list shows invoice.clientNumber, and the client's number only when that is blank.
 * @param {string} number
 * @returns {object}
 */
export function invoiceDisplayedClientNumberWhere(number) {
  const exact = { equals: number, mode: "insensitive" };
  const blankInvoiceNumber = { OR: [{ clientNumber: null }, { clientNumber: "" }] };
  return {
    OR: [
      { clientNumber: exact },
      { AND: [blankInvoiceNumber, { property: { client: { clientNumber: exact } } }] },
    ],
  };
}

