export const SAVINGS_KIND = "savings";
export const ZERO_SAVINGS_KIND = "zero_savings";

/** Tax savings of $0, including a missing amount. */
export function isZeroSavingsAmount(value) {
  if (value == null || value === "") return true;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return true;
  return Math.round(amount * 100) === 0;
}

export function savingsKindForInvoice(invoice) {
  return isZeroSavingsAmount(invoice?.taxableSavings) ? ZERO_SAVINGS_KIND : SAVINGS_KIND;
}

export function bulkRecipientGroupKey(clientId, savingsKind) {
  return `${clientId}:${savingsKind}`;
}
