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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailTemplateSelect } from "@/components/portal/account/EmailTemplateSelect";
import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/paymentMethod";
import { formatUSD } from "@/utils/formatCurrency";

export type MarkInvoicePaidPayload = {
  paidDate: string;
  paymentMethod: PaymentMethod;
  paymentNotes: string;
  sendAcknowledgementEmail: boolean;
  templateKey?: string;
  partial: boolean;
  amountPaid?: number;
};

type PaymentCoverage = "full" | "partial";

type MarkInvoicePaidDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceCount?: number;
  /** Amount due for a single invoice. Partial payment needs this to show the balance. */
  invoiceAmount?: number | null;
  /** Amount already recorded on that invoice. */
  amountAlreadyPaid?: number | null;
  submitting?: boolean;
  onConfirm: (payload: MarkInvoicePaidPayload) => void | Promise<void>;
};

function parsePaymentAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export function MarkInvoicePaidDialog({
  open,
  onOpenChange,
  invoiceCount = 1,
  invoiceAmount = null,
  amountAlreadyPaid = 0,
  submitting = false,
  onConfirm,
}: MarkInvoicePaidDialogProps) {
  const [paidDate, setPaidDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [sendAcknowledgementEmail, setSendAcknowledgementEmail] = useState(false);
  const [templateKey, setTemplateKey] = useState("payment_acknowledgement");
  const [coverage, setCoverage] = useState<PaymentCoverage>("full");
  const [amountPaid, setAmountPaid] = useState("");

  const partialAvailable = invoiceCount === 1;
  const alreadyPaid = Math.max(0, Number(amountAlreadyPaid) || 0);
  const due = invoiceAmount == null ? null : Math.max(0, Number(invoiceAmount) || 0);
  const balanceDue = due == null ? null : Math.max(0, Math.round((due - alreadyPaid) * 100) / 100);
  const parsedAmount = parsePaymentAmount(amountPaid);
  const partial = partialAvailable && coverage === "partial";

  useEffect(() => {
    if (!open) return;
    setPaidDate(new Date());
    setPaymentMethod("");
    setPaymentNotes("");
    setSendAcknowledgementEmail(false);
    setCoverage("full");
    setAmountPaid("");
  }, [open]);

  const amountError = (() => {
    if (!partial) return null;
    if (!amountPaid.trim()) return null;
    if (parsedAmount == null) return "Enter an amount greater than zero.";
    if (balanceDue != null && Math.round(parsedAmount * 100) > Math.round(balanceDue * 100)) {
      return `Amount is more than the balance due (${formatUSD(balanceDue)}).`;
    }
    if (balanceDue != null && Math.round(parsedAmount * 100) === Math.round(balanceDue * 100)) {
      return "This covers the full balance. Choose full payment.";
    }
    return null;
  })();

  const canSubmit =
    Boolean(paidDate) &&
    Boolean(paymentMethod) &&
    !submitting &&
    (!partial || (parsedAmount != null && amountError == null));

  const handleConfirm = async () => {
    if (!paidDate || !paymentMethod || submitting) return;
    if (partial && (parsedAmount == null || amountError)) return;
    await onConfirm({
      paidDate: format(paidDate, "MM/dd/yyyy"),
      paymentMethod,
      paymentNotes: paymentNotes.trim(),
      sendAcknowledgementEmail,
      templateKey: sendAcknowledgementEmail ? templateKey : undefined,
      partial,
      amountPaid: partial ? parsedAmount ?? undefined : undefined,
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
            {partial
              ? "Record the amount received. The invoice stays open for whatever is still left."
              : invoiceCount > 1
                ? `Add a paid date, payment method, and optional notes for ${invoiceCount} invoices.`
                : balanceDue != null
                  ? "Full payment collects the remaining balance."
                  : "Add a paid date, payment method, and optional notes before marking this invoice paid."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {balanceDue != null ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Left to collect</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{formatUSD(balanceDue)}</p>
              {alreadyPaid > 0 && due != null ? (
                <p className="text-xs text-muted-foreground">
                  {formatUSD(alreadyPaid)} already paid of {formatUSD(due)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Payment</Label>
            <RadioGroup
              value={partial ? "partial" : "full"}
              onValueChange={(value) => setCoverage(value as PaymentCoverage)}
              disabled={submitting}
              className="gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="full" id="payment-full" />
                <Label htmlFor="payment-full" className="cursor-pointer font-normal">
                  Full payment
                  {balanceDue != null ? (
                    <span className="text-muted-foreground"> · {formatUSD(balanceDue)}</span>
                  ) : null}
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem
                  value="partial"
                  id="payment-partial"
                  disabled={!partialAvailable || submitting}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label
                    htmlFor="payment-partial"
                    className={partialAvailable ? "cursor-pointer font-normal" : "font-normal text-muted-foreground"}
                  >
                    Partial payment
                  </Label>
                  {partialAvailable ? null : (
                    <p className="text-xs text-muted-foreground">
                      Available when marking one invoice.
                    </p>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          {partial ? (
            <div className="grid gap-2">
              <Label htmlFor="amount-paid">Amount paid</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount-paid"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  disabled={submitting}
                  placeholder="0.00"
                  className="pl-7"
                  aria-invalid={amountError ? true : undefined}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {alreadyPaid > 0 ? `Already paid ${formatUSD(alreadyPaid)}. ` : null}
                {balanceDue != null ? `Balance due ${formatUSD(balanceDue)}.` : "Enter the amount received toward the balance."}
              </p>
              {amountError ? <p className="text-xs text-destructive">{amountError}</p> : null}
            </div>
          ) : null}

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
                Emails the client billing address after the payment is saved. Payment status is saved even if
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
            {partial ? "Record payment" : "Mark paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
