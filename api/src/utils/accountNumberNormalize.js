/**
 * Normalize numeric account numbers for comparison (strip leading zeros).
 * Non-numeric values (e.g. R226434) are returned trimmed unchanged.
 */
export function normalizeAccountNumber(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return trimmed.replace(/^0+/, "") || "0";
}

/**
 * True when two account strings refer to the same numeric value but differ in formatting.
 */
export function accountNumbersDifferOnlyByLeadingZeros(a, b) {
  const left = String(a ?? "").trim();
  const right = String(b ?? "").trim();
  if (!left || !right || left === right) return false;
  if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return false;
  return normalizeAccountNumber(left) === normalizeAccountNumber(right);
}
