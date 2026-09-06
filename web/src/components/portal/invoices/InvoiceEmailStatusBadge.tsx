import { cn } from "@/lib/utils";
import {
  formatInvoiceEmailTrackingTooltip,
  getInvoiceEmailStatusDisplay,
  invoiceEmailStatusBadgeClass,
  type InvoiceEmailTracking,
} from "@/utils/invoiceEmailStatus";

type InvoiceEmailStatusBadgeProps = {
  lastDelivery?: InvoiceEmailTracking | null;
  className?: string;
};

export function InvoiceEmailStatusBadge({
  lastDelivery,
  className,
}: InvoiceEmailStatusBadgeProps) {
  const { displayLabel, tone } = getInvoiceEmailStatusDisplay(lastDelivery);
  const tooltip = lastDelivery ? formatInvoiceEmailTrackingTooltip(lastDelivery) : undefined;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        invoiceEmailStatusBadgeClass(tone),
        className
      )}
      title={tooltip || undefined}
    >
      {displayLabel}
    </span>
  );
}
