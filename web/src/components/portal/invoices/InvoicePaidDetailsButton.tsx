import { EllipsisVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatUSD } from "@/utils/formatCurrency";
import { formatInvoiceDisplayDate } from "@/utils/invoiceDates";
import type { PaidInvoiceDetail } from "@/types/types";

type InvoicePaidDetailsButtonProps = {
  paidInvoices?: PaidInvoiceDetail[];
  paidCount?: number;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function PaidInvoiceEntry({
  entry,
  showYear,
}: {
  entry: PaidInvoiceDetail;
  showYear: boolean;
}) {
  const paidDate = formatInvoiceDisplayDate(entry.paidDate) || "—";
  const notes = entry.paymentNotes?.trim() || "—";

  return (
    <div className="space-y-2">
      {showYear && entry.year ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {entry.year}
        </p>
      ) : null}
      <DetailRow label="Date" value={paidDate} />
      <DetailRow label="Amount" value={formatUSD(entry.invoiceAmount)} />
      <DetailRow label="Notes" value={notes} />
    </div>
  );
}

export function InvoicePaidDetailsButton({
  paidInvoices,
  paidCount,
}: InvoicePaidDetailsButtonProps) {
  const entries = paidInvoices ?? [];
  const hasPaid = (paidCount ?? entries.length) > 0;

  if (!hasPaid || entries.length === 0) return null;

  const showYear = entries.length > 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-70 transition-all hover:bg-muted/80 hover:text-foreground hover:opacity-100 focus-visible:opacity-100 data-[state=open]:bg-muted data-[state=open]:text-foreground data-[state=open]:opacity-100"
          aria-label="View payment details"
          onClick={(event) => event.stopPropagation()}
        >
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 p-0 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Payment details</p>
          {showYear ? (
            <p className="text-xs text-muted-foreground">
              {entries.length} paid invoice{entries.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <div className="max-h-64 space-y-4 overflow-y-auto px-4 py-3">
          {entries.map((entry, index) => (
            <div key={entry.id}>
              {index > 0 ? <div className="mb-4 border-t pt-4" /> : null}
              <PaidInvoiceEntry entry={entry} showYear={showYear} />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
