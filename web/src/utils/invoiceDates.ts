import { Invoice } from "@/types/types";

type InvoiceDateFields = Pick<Invoice, "generatedDate" | "invoiceDate" | "dueDate">;

function formatMdyDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/** Display API date strings as stored (e.g. `7/1/2026`). */
export function formatInvoiceDisplayDate(value?: string | null): string {
  if (!value?.trim()) return "";
  return value.trim();
}

function parseFlexibleDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const date = new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** PDF “Invoice Date” — prefer `generatedDate`, then legacy `invoiceDate`. */
export function getInvoiceGeneratedDate(invoice?: InvoiceDateFields | null): string {
  const fromApi =
    formatInvoiceDisplayDate(invoice?.generatedDate) ||
    formatInvoiceDisplayDate(invoice?.invoiceDate);
  return fromApi || formatMdyDate(new Date());
}

/** PDF “Due Date” — use API `dueDate`; only compute locally when unset. */
export function getInvoiceDueDate(
  invoice?: InvoiceDateFields | null,
  generatedDate?: string
): string {
  const fromApi = formatInvoiceDisplayDate(invoice?.dueDate);
  if (fromApi) return fromApi;

  const base = generatedDate || getInvoiceGeneratedDate(invoice);
  return addInvoiceDays(base, 28);
}

export function getInvoiceSheetDates(invoice?: InvoiceDateFields | null): {
  invoiceDate: string;
  dueDate: string;
} {
  const invoiceDate = getInvoiceGeneratedDate(invoice);
  return {
    invoiceDate,
    dueDate: getInvoiceDueDate(invoice, invoiceDate),
  };
}

/** @deprecated Prefer getInvoiceGeneratedDate — kept for existing imports. */
export function formatInvoiceDate(value?: string): string {
  if (!value?.trim()) return formatMdyDate(new Date());
  const parsed = parseFlexibleDate(value);
  if (!parsed) return value.trim();
  return formatMdyDate(parsed);
}

export function addInvoiceDays(value: string, days: number): string {
  const date = parseFlexibleDate(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return formatMdyDate(date);
}
