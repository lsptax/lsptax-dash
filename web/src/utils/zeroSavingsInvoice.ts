export const ZERO_SAVINGS_INVOICE_TEMPLATE_KEY = "invoice_zero_savings";

/** Tax savings of $0, including a missing amount. */
export function isZeroSavingsAmount(value: number | string | null | undefined): boolean {
  if (value == null || value === "") return true;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return true;
  return Math.round(amount * 100) === 0;
}
