/**
 * Normalize a US phone number to E.164 for SMS providers (e.g. Brevo).
 * @param {string|null|undefined} value
 * @param {string} [defaultCountryCode='1']
 * @returns {string|null}
 */
export function toE164(value, defaultCountryCode = "1") {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
