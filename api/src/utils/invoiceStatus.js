export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PAID",
  "PAST_DUE",
  "VOIDED",
  "WRITTEN_OFF",
];

const STATUS_ALIASES = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PAID: "PAID",
  PAST_DUE: "PAST_DUE",
  PASTDUE: "PAST_DUE",
  VOIDED: "VOIDED",
  VOID: "VOIDED",
  WRITTEN_OFF: "WRITTEN_OFF",
  WRITTENOFF: "WRITTEN_OFF",
};

export function parseInvoiceStatus(raw) {
  if (raw == null || String(raw).trim() === "") return { ok: false, value: null };
  const key = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");
  const value = STATUS_ALIASES[key];
  if (!value) return { ok: false, value: null };
  return { ok: true, value };
}

export function isClosedInvoiceStatus(status) {
  return status === "VOIDED" || status === "WRITTEN_OFF";
}

function calendarDay(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value || "").trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const year = us ? Number(us[3]) : iso ? Number(iso[1]) : NaN;
  const month = us ? Number(us[1]) : iso ? Number(iso[2]) : NaN;
  const day = us ? Number(us[2]) : iso ? Number(iso[3]) : NaN;
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function hasIssuedDate(invoice) {
  return Boolean(
    String(invoice?.invoiceDate || "").trim() || String(invoice?.generatedDate || "").trim()
  );
}

/**
 * Status shown in the app. Sent invoices become Past Due once the due date is before `asOf`.
 * An explicitly stored Past Due stays Past Due.
 */
export function effectiveInvoiceStatus(invoice, asOf = new Date()) {
  // isPaid wins over the Draft default so a legacy paid row is not saved back as unpaid.
  if (invoice?.isPaid || invoice?.status === "PAID") return "PAID";
  const stored = invoice?.status || "DRAFT";
  if (stored === "VOIDED" || stored === "WRITTEN_OFF" || stored === "DRAFT") {
    return stored;
  }
  if (stored === "PAST_DUE") return "PAST_DUE";
  const due = calendarDay(invoice?.dueDate);
  const today = calendarDay(asOf);
  if (due && today && due < today) return "PAST_DUE";
  return "SENT";
}

export function paymentWriteData(isPaid, existing, paidDate) {
  if (isPaid) {
    return { isPaid: true, status: "PAID", paidDate };
  }
  if (isClosedInvoiceStatus(existing?.status)) {
    return { isPaid: false, status: existing.status, paidDate: "" };
  }
  const issued =
    hasIssuedDate(existing) || existing?.status === "SENT" || existing?.status === "PAST_DUE";
  return { isPaid: false, status: issued ? "SENT" : "DRAFT", paidDate: "" };
}

/** Generating or emailing an invoice moves Draft to Sent and does not reopen closed rows. */
export function statusAfterIssue(existingStatus, { isPaid } = {}) {
  if (isPaid === true) return "PAID";
  if (isClosedInvoiceStatus(existingStatus) || existingStatus === "PAID" || existingStatus === "PAST_DUE") {
    return existingStatus;
  }
  return "SENT";
}
