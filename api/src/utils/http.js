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

