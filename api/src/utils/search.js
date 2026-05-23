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

