/**
 * Minimal shared HTTP response helpers.
 * Keep payloads predictable and avoid leaking internal errors.
 */

/**
 * Send a standardized error response.
 * @param {import("express").Response} res
 * @param {number} status
 * @param {string} message
 * @param {unknown} [err]
 * @param {object} [extras]
 */
export function sendError(res, status, message, err = undefined, extras = undefined) {
  if (err) console.error(message, err);
  const body = { success: false, message };
  if (extras && typeof extras === "object") Object.assign(body, extras);
  return res.status(status).json(body);
}

/**
 * Read a numeric entity id from a body/query object, trying keys in order.
 * Lets handlers accept both typed names (`propertyId`) and legacy `id`.
 * @param {object} source
 * @param {...string} keys
 * @returns {number}
 */
export function parseEntityId(source, ...keys) {
  if (!source || typeof source !== "object") return NaN;
  for (const key of keys) {
    const raw = source[key];
    if (raw == null || raw === "") continue;
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return n;
  }
  return NaN;
}

