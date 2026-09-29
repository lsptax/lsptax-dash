export const INVOICE_TEMPLATES = ["current", "arbitration", "homestead"] as const;

export type InvoiceTemplate = (typeof INVOICE_TEMPLATES)[number];

export const INVOICE_TEMPLATE_LABELS: Record<InvoiceTemplate, string> = {
  current: "Current",
  arbitration: "Arbitration",
  homestead: "Homestead",
};

export function isInvoiceTemplate(value: unknown): value is InvoiceTemplate {
  return value === "current" || value === "arbitration" || value === "homestead";
}

/**
 * A saved choice wins. Otherwise an arbitration year uses the arbitration layout.
 */
export function resolveInvoiceTemplate(invoice?: {
  invoiceTemplate?: string | null;
  underArbitration?: boolean;
} | null): InvoiceTemplate {
  if (isInvoiceTemplate(invoice?.invoiceTemplate)) return invoice.invoiceTemplate;
  if (invoice?.underArbitration) return "arbitration";
  return "current";
}
