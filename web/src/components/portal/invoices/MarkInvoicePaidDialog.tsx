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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailTemplateSelect } from "@/components/portal/account/EmailTemplateSelect";
import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/paymentMethod";

export type MarkInvoicePaidPayload = {
  paidDate: string;
  paymentMethod: PaymentMethod;
  paymentNotes: string;
  sendAcknowledgementEmail: boolean;
  templateKey?: string;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sendAcknowledgementEmail, setSendAcknowledgementEmail] = useState(false);
  const [templateKey, setTemplateKey] = useState("payment_acknowledgement");

  useEffect(() => {
    if (!open) return;
    setPaidDate(new Date());
    setPaymentMethod("");
    setPaymentNotes("");
    setSendAcknowledgementEmail(false);
  }, [open]);

  const canSubmit = Boolean(paidDate) && Boolean(paymentMethod) && !submitting;

  const handleConfirm = async () => {
    if (!paidDate || !paymentMethod || submitting) return;
    await onConfirm({
      paidDate: format(paidDate, "MM/dd/yyyy"),
      paymentMethod,
      paymentNotes: paymentNotes.trim(),
      sendAcknowledgementEmail,
      templateKey: sendAcknowledgementEmail ? templateKey : undefined,
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
              ? `Add a paid date, payment method, and optional notes for ${invoiceCount} invoices.`
              : "Add a paid date, payment method, and optional notes before marking this invoice paid."}
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
            <Label htmlFor="payment-method">Payment method</Label>
            <Select
              value={paymentMethod || undefined}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              disabled={submitting}
            >
              <SelectTrigger id="payment-method" aria-label="Payment method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {sendAcknowledgementEmail ? (
                <EmailTemplateSelect
                  id="paid-ack-template"
                  purpose="payment_acknowledgement"
                  value={templateKey}
                  onChange={setTemplateKey}
                  disabled={submitting}
                />
              ) : null}
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
