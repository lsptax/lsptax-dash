const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse stored `bppInvoice` string to dollars (legacy ISO dates → 0). */
export function parseBppInvoiceString(value?: string | null): number {
  if (!value || value.trim() === "" || value.trim() === "-") return 0;
  if (ISO_DATE_PATTERN.test(value.trim())) return 0;
  const num = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

type BppInvoiceFields = {
  bppInvoice?: string | null;
  bppInvoiceAmount?: number | null;
};

/** Display amount: prefer server-parsed `bppInvoiceAmount`, else parse `bppInvoice`. */
export function getBppInvoiceAmount(invoice?: BppInvoiceFields | null): number {
  if (invoice?.bppInvoiceAmount != null && Number.isFinite(invoice.bppInvoiceAmount)) {
    return invoice.bppInvoiceAmount;
  }
  return parseBppInvoiceString(invoice?.bppInvoice);
}

/** Value for edit inputs: dollar string from `bppInvoice`, else `bppInvoiceAmount`. */
export function getBppInvoiceEditValue(invoice?: BppInvoiceFields | null): string {
  if (!invoice) return "";
  const raw = invoice.bppInvoice?.trim() ?? "";
  if (raw && !ISO_DATE_PATTERN.test(raw)) return raw.replace(/,/g, "");
  const amount = invoice.bppInvoiceAmount;
  if (amount != null && amount !== 0) return String(amount);
  return "";
}
