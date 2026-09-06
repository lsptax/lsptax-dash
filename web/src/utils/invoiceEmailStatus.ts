import { format, parseISO } from "date-fns";

export type InvoiceEmailTracking = {
  deliveryId?: number;
  year?: number | null;
  recipientEmail?: string;
  emailSentAt?: string | null;
  emailDeliveredAt?: string | null;
  emailOpenedAt?: string | null;
  emailLastEvent?: string | null;
  emailBounceReason?: string | null;
  createdAt?: string;
};

/** API enum on lastDelivery.emailLastEvent / emailTracking.emailLastEvent */
export const INVOICE_EMAIL_LAST_EVENT = {
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  BOUNCED: "BOUNCED",
  BLOCKED: "BLOCKED",
  INVALID: "INVALID",
  DEFERRED: "DEFERRED",
} as const;

export type InvoiceEmailLastEvent =
  (typeof INVOICE_EMAIL_LAST_EVENT)[keyof typeof INVOICE_EMAIL_LAST_EVENT];

/** sendStatus query param for GET /api/invoices */
export const INVOICE_EMAIL_FILTER = {
  ALL: "all",
  NOT_SENT: "not_sent",
  SENT: "sent",
  DELIVERED: "delivered",
  OPENED: "opened",
  BOUNCED: "bounced",
  BLOCKED: "blocked",
  INVALID: "invalid",
  DEFERRED: "deferred",
} as const;

export type InvoiceEmailStatusFilter =
  (typeof INVOICE_EMAIL_FILTER)[keyof typeof INVOICE_EMAIL_FILTER];

export type InvoiceEmailStatusTone =
  | "muted"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type InvoiceEmailStatusDisplay = {
  displayLabel: string;
  filterValue?: InvoiceEmailStatusFilter;
  tone: InvoiceEmailStatusTone;
  brevoTerm?: string;
};

/** Single source of truth: API value → UI label, filter, badge tone */
export const INVOICE_EMAIL_STATUS_META: Record<
  InvoiceEmailLastEvent,
  InvoiceEmailStatusDisplay & { filterValue: InvoiceEmailStatusFilter }
> = {
  [INVOICE_EMAIL_LAST_EVENT.SENT]: {
    displayLabel: "Sent",
    filterValue: INVOICE_EMAIL_FILTER.SENT,
    tone: "neutral",
    brevoTerm: "Sent",
  },
  [INVOICE_EMAIL_LAST_EVENT.DELIVERED]: {
    displayLabel: "Delivered",
    filterValue: INVOICE_EMAIL_FILTER.DELIVERED,
    tone: "info",
    brevoTerm: "Delivered",
  },
  [INVOICE_EMAIL_LAST_EVENT.OPENED]: {
    displayLabel: "Opened",
    filterValue: INVOICE_EMAIL_FILTER.OPENED,
    tone: "success",
    brevoTerm: "Opened",
  },
  [INVOICE_EMAIL_LAST_EVENT.BOUNCED]: {
    displayLabel: "Bounced",
    filterValue: INVOICE_EMAIL_FILTER.BOUNCED,
    tone: "danger",
    brevoTerm: "Bounced",
  },
  [INVOICE_EMAIL_LAST_EVENT.BLOCKED]: {
    displayLabel: "Blocked",
    filterValue: INVOICE_EMAIL_FILTER.BLOCKED,
    tone: "danger",
    brevoTerm: "Blocked",
  },
  [INVOICE_EMAIL_LAST_EVENT.INVALID]: {
    displayLabel: "Invalid email",
    filterValue: INVOICE_EMAIL_FILTER.INVALID,
    tone: "danger",
    brevoTerm: "Invalid email",
  },
  [INVOICE_EMAIL_LAST_EVENT.DEFERRED]: {
    displayLabel: "Deferred",
    filterValue: INVOICE_EMAIL_FILTER.DEFERRED,
    tone: "warning",
    brevoTerm: "Deferred",
  },
};

export const INVOICE_EMAIL_NOT_SENT: InvoiceEmailStatusDisplay & {
  filterValue: InvoiceEmailStatusFilter;
} = {
  displayLabel: "Not sent",
  filterValue: INVOICE_EMAIL_FILTER.NOT_SENT,
  tone: "muted",
};

/** Filter dropdown options (order matches Brevo funnel) */
export const INVOICE_EMAIL_FILTER_OPTIONS: {
  value: InvoiceEmailStatusFilter;
  label: string;
}[] = [
  { value: INVOICE_EMAIL_FILTER.ALL, label: "All" },
  { value: INVOICE_EMAIL_FILTER.NOT_SENT, label: INVOICE_EMAIL_NOT_SENT.displayLabel },
  { value: INVOICE_EMAIL_FILTER.SENT, label: "Sent" },
  { value: INVOICE_EMAIL_FILTER.DELIVERED, label: "Delivered" },
  { value: INVOICE_EMAIL_FILTER.OPENED, label: "Opened" },
  { value: INVOICE_EMAIL_FILTER.BOUNCED, label: "Bounced" },
  { value: INVOICE_EMAIL_FILTER.BLOCKED, label: "Blocked" },
  { value: INVOICE_EMAIL_FILTER.INVALID, label: "Invalid email" },
  { value: INVOICE_EMAIL_FILTER.DEFERRED, label: "Deferred" },
];

/** @deprecated use INVOICE_EMAIL_FILTER_OPTIONS */
export const INVOICE_EMAIL_STATUS_FILTER_OPTIONS = INVOICE_EMAIL_FILTER_OPTIONS;

export function getInvoiceEmailStatusDisplay(
  lastDelivery?: InvoiceEmailTracking | null
): InvoiceEmailStatusDisplay {
  if (!lastDelivery?.emailLastEvent) {
    return INVOICE_EMAIL_NOT_SENT;
  }

  const event = lastDelivery.emailLastEvent.toUpperCase() as InvoiceEmailLastEvent;
  return (
    INVOICE_EMAIL_STATUS_META[event] ?? {
      displayLabel: lastDelivery.emailLastEvent,
      tone: "neutral",
    }
  );
}

export function invoiceEmailStatusBadgeClass(tone: InvoiceEmailStatusTone): string {
  switch (tone) {
    case "success":
      return "bg-emerald-100 text-emerald-800";
    case "info":
      return "bg-blue-100 text-blue-800";
    case "neutral":
      return "bg-slate-100 text-slate-700";
    case "warning":
      return "bg-amber-100 text-amber-900";
    case "danger":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

/** @deprecated use getInvoiceEmailStatusDisplay */
export function invoiceEmailStatusLabel(
  lastDelivery?: InvoiceEmailTracking | null
): { label: string; tone: InvoiceEmailStatusTone } {
  const display = getInvoiceEmailStatusDisplay(lastDelivery);
  return { label: display.displayLabel, tone: display.tone };
}

/** @deprecated use getInvoiceEmailStatusDisplay */
export function invoiceEmailEventLabel(event: string): string {
  return getInvoiceEmailStatusDisplay({ emailLastEvent: event }).displayLabel;
}

function formatTrackingDate(value?: string | null): string | null {
  if (!value) return null;
  try {
    return format(parseISO(value), "MMM d, yyyy h:mm a");
  } catch {
    return new Date(value).toLocaleString();
  }
}

export function formatInvoiceEmailTrackingTooltip(
  tracking: InvoiceEmailTracking
): string {
  const lines: string[] = [];
  const display = getInvoiceEmailStatusDisplay(tracking);

  if (display.brevoTerm) {
    lines.push(`Brevo: ${display.brevoTerm}`);
  }
  if (tracking.recipientEmail) lines.push(`To: ${tracking.recipientEmail}`);
  if (tracking.year != null) lines.push(`Year: ${tracking.year}`);

  const sentAt = formatTrackingDate(tracking.emailSentAt ?? tracking.createdAt);
  if (sentAt) lines.push(`Sent: ${sentAt}`);

  const deliveredAt = formatTrackingDate(tracking.emailDeliveredAt);
  if (deliveredAt) lines.push(`Delivered: ${deliveredAt}`);

  const openedAt = formatTrackingDate(tracking.emailOpenedAt);
  if (openedAt) lines.push(`Opened: ${openedAt}`);

  if (tracking.emailBounceReason) {
    lines.push(`Bounce reason: ${tracking.emailBounceReason}`);
  }

  return lines.join("\n");
}

/** Map a delivery row (history API) to the shared tracking shape. */
export function deliveryToEmailTracking(delivery: {
  id: number;
  year?: number | null;
  recipientEmail?: string;
  emailSentAt?: string | null;
  emailDeliveredAt?: string | null;
  emailOpenedAt?: string | null;
  emailLastEvent?: string | null;
  emailBounceReason?: string | null;
  createdAt?: string;
  emailTracking?: InvoiceEmailTracking | null;
}): InvoiceEmailTracking | null {
  if (delivery.emailTracking) return delivery.emailTracking;

  if (delivery.emailLastEvent) {
    return {
      deliveryId: delivery.id,
      year: delivery.year,
      recipientEmail: delivery.recipientEmail,
      emailSentAt: delivery.emailSentAt,
      emailDeliveredAt: delivery.emailDeliveredAt,
      emailOpenedAt: delivery.emailOpenedAt,
      emailLastEvent: delivery.emailLastEvent,
      emailBounceReason: delivery.emailBounceReason,
      createdAt: delivery.createdAt,
    };
  }

  return null;
}

function deliveryTimestamp(delivery: {
  emailSentAt?: string | null;
  createdAt?: string;
}): number {
  const value = delivery.emailSentAt ?? delivery.createdAt;
  return value ? new Date(value).getTime() : 0;
}

/** Latest successful email tracking for a tax year from delivery history. */
export function latestDeliveryTrackingForYear<
  T extends {
    id: number;
    year?: number | null;
    emailStatus?: string;
    emailSentAt?: string | null;
    createdAt?: string;
    recipientEmail?: string;
    emailDeliveredAt?: string | null;
    emailOpenedAt?: string | null;
    emailLastEvent?: string | null;
    emailBounceReason?: string | null;
    emailTracking?: InvoiceEmailTracking | null;
  },
>(deliveries: T[], year: number): InvoiceEmailTracking | null {
  const forYear = deliveries.filter(
    (delivery) =>
      delivery.emailStatus?.toUpperCase() === "SENT" && delivery.year === year
  );
  if (forYear.length === 0) return null;

  const latest = [...forYear].sort(
    (a, b) => deliveryTimestamp(b) - deliveryTimestamp(a)
  )[0];
  return deliveryToEmailTracking(latest);
}
