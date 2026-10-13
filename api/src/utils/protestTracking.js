export const PROTEST_STATUSES = ["PENDING", "COMPLETED", "RESULTS_PENDING"];

const PROTEST_ALIASES = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  COMPLETE: "COMPLETED",
  RESULTS_PENDING: "RESULTS_PENDING",
  RESULTSPENDING: "RESULTS_PENDING",
  AWAITING_RESULTS: "RESULTS_PENDING",
  RESULTS_PENDING_CASES: "RESULTS_PENDING",
};

export function parseProtestStatus(raw) {
  if (raw == null || String(raw).trim() === "" || String(raw).trim().toUpperCase() === "NONE") {
    return { ok: true, value: null };
  }
  const key = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");
  const value = PROTEST_ALIASES[key];
  if (!value) return { ok: false, value: null };
  return { ok: true, value };
}

function hasProtestDate(invoice) {
  return Boolean(String(invoice?.protestDate || "").trim());
}

/**
 * One property-year case.
 * Awaiting invoice: the protest is completed and the invoice is still a draft.
 */
export function protestCaseBuckets(invoice, asOf) {
  const explicit = invoice?.protestStatus || null;
  const protested = Boolean(explicit) || hasProtestDate(invoice);
  const status = explicit || (hasProtestDate(invoice) ? "PENDING" : null);
  const invoiceStatus = invoice?.invoiceStatus || invoice?.status || (invoice?.isPaid ? "PAID" : "DRAFT");
  const awaitingInvoice = status === "COMPLETED" && invoiceStatus === "DRAFT" && !invoice?.isPaid;
  return {
    protested,
    pending: status === "PENDING",
    resultsPending: status === "RESULTS_PENDING",
    completed: status === "COMPLETED",
    awaitingInvoice,
    asOf: asOf || null,
  };
}

export function summarizeProtestCases(invoices, asOf) {
  const summary = {
    protested: 0,
    pending: 0,
    resultsPending: 0,
    completed: 0,
    awaitingInvoice: 0,
  };
  for (const invoice of invoices) {
    const bucket = protestCaseBuckets(invoice, asOf);
    if (bucket.protested) summary.protested += 1;
    if (bucket.pending) summary.pending += 1;
    if (bucket.resultsPending) summary.resultsPending += 1;
    if (bucket.completed) summary.completed += 1;
    if (bucket.awaitingInvoice) summary.awaitingInvoice += 1;
  }
  return summary;
}
