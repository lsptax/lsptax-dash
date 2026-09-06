import type { PaymentAcknowledgementEmailResult } from "@/store/invoices";

function clientLabel(item: { clientName?: string; clientId?: number }): string {
  if (item.clientName?.trim()) return item.clientName.trim();
  if (item.clientId != null) return `Client #${item.clientId}`;
  return "Client";
}

function itemDetail(item: { reason?: string; error?: string; message?: string }): string {
  return item.reason?.trim() || item.error?.trim() || item.message?.trim() || "Unknown issue";
}

export function describePaymentAcknowledgementIssues(
  acknowledgementEmail: PaymentAcknowledgementEmailResult
): string {
  const parts: string[] = [];

  for (const item of acknowledgementEmail.failed ?? []) {
    parts.push(`${clientLabel(item)}: ${itemDetail(item)}`);
  }
  for (const item of acknowledgementEmail.skipped ?? []) {
    parts.push(`${clientLabel(item)}: ${itemDetail(item)}`);
  }

  return parts.join(" · ");
}

export function hasPaymentAcknowledgementIssues(
  acknowledgementEmail?: PaymentAcknowledgementEmailResult | null
): boolean {
  return Boolean(
    acknowledgementEmail?.failed?.length || acknowledgementEmail?.skipped?.length
  );
}
