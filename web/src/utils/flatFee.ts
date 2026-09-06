/** Per-year flat fee in dollars from invoice row (included in `invoiceAmount`). */
export function getFlatFeeAmount(
  invoice?: { flatFee?: number | string | null } | null
): number {
  const value = invoice?.flatFee;
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const num = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

/** Value for yearly edit table inputs. */
export function getFlatFeeEditValue(
  invoice?: { flatFee?: number | string | null } | null
): string {
  const amount = getFlatFeeAmount(invoice);
  return amount > 0 ? String(amount) : "";
}
