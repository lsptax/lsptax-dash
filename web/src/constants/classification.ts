export const PROPERTY_TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "BPP", label: "BPP" },
  { value: "LAND", label: "Land" },
] as const;

export const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "PAST_DUE", label: "Past Due" },
  { value: "VOIDED", label: "Voided" },
  { value: "WRITTEN_OFF", label: "Written Off" },
] as const;

export const PROTEST_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "RESULTS_PENDING", label: "Results pending" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number]["value"];
export type ProtestStatusValue = (typeof PROTEST_STATUSES)[number]["value"];
export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined
) {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label || value;
}

export function invoiceStatusBadgeClass(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300";
    case "SENT":
      return "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300";
    case "PAST_DUE":
      return "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300";
    case "VOIDED":
    case "WRITTEN_OFF":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-400/15 dark:text-zinc-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300";
  }
}
