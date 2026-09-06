import { useEffect, useState } from "react";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker, isPopoverInteractTarget } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type MarkInvoicePaidPayload = {
  paidDate: string;
  paymentNotes: string;
  sendAcknowledgementEmail: boolean;
};

type MarkInvoicePaidDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceCount?: number;
  submitting?: boolean;
  onConfirm: (payload: MarkInvoicePaidPayload) => void | Promise<void>;
};

export function MarkInvoicePaidDialog({
  open,
  onOpenChange,
  invoiceCount = 1,
  submitting = false,
  onConfirm,
}: MarkInvoicePaidDialogProps) {
  const [paidDate, setPaidDate] = useState<Date | undefined>(new Date());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sendAcknowledgementEmail, setSendAcknowledgementEmail] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaidDate(new Date());
    setPaymentNotes("");
    setSendAcknowledgementEmail(false);
  }, [open]);

  const canSubmit = Boolean(paidDate) && !submitting;

  const handleConfirm = async () => {
    if (!paidDate || submitting) return;
    await onConfirm({
      paidDate: format(paidDate, "MM/dd/yyyy"),
      paymentNotes: paymentNotes.trim(),
      sendAcknowledgementEmail,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (submitting) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-[420px]"
        onInteractOutside={(event) => {
          if (isPopoverInteractTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isPopoverInteractTarget(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>
            {invoiceCount > 1
              ? `Add a paid date and optional notes for ${invoiceCount} invoices.`
              : "Add a paid date and optional notes before marking this invoice paid."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="paid-date">Paid date</Label>
            <DatePicker
              id="paid-date"
              value={paidDate}
              onChange={setPaidDate}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="payment-notes">Notes</Label>
            <textarea
              id="payment-notes"
              value={paymentNotes}
              onChange={(event) => setPaymentNotes(event.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="Optional payment notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="send-payment-acknowledgement"
              checked={sendAcknowledgementEmail}
              disabled={submitting}
              onCheckedChange={(checked) => setSendAcknowledgementEmail(checked === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="send-payment-acknowledgement" className="cursor-pointer font-normal">
                Send payment acknowledgement email
              </Label>
              <p className="text-xs text-muted-foreground">
                Emails the client billing address after marking paid. Payment status is saved even if
                email delivery fails.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="blue"
            disabled={!canSubmit}
            onClick={() => void handleConfirm()}
          >
            {submitting ? <LoaderCircle className="animate-spin" /> : null}
            Mark paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
