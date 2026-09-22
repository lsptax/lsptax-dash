import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateSelect } from "@/components/portal/account/EmailTemplateSelect";
import { BulkInvoiceSendDialog } from "@/components/portal/invoices/BulkInvoiceSendDialog";
import { PROPERTY_INVOICE_YEARS } from "@/components/portal/properties/propertyInvoiceYears";
import { getEmailTemplates, type EmailTemplatePurpose } from "@/api/emailTemplates";
import { sendPaymentAcknowledgementEmails } from "@/store/invoices";
import { useQuery } from "@tanstack/react-query";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";

export function SendClientEmailDialog({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [year, setYear] = useState(
    String(PROPERTY_INVOICE_YEARS[PROPERTY_INVOICE_YEARS.length - 1])
  );
  const [sending, setSending] = useState(false);
  const [invoiceSendOpen, setInvoiceSendOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
    enabled: open,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });
  const selected = templatesQuery.data?.find((template) => template.key === templateKey);
  const purpose: EmailTemplatePurpose | undefined = selected?.purpose;
  const isPaymentTemplate = purpose === "payment_acknowledgement";

  async function sendPaymentAcknowledgement() {
    setSending(true);
    try {
      const result = await sendPaymentAcknowledgementEmails({ clientId, templateKey });
      toast({ title: "Payment acknowledgement sent", description: result.message });
      setOpen(false);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not send email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail />
        Send email
      </Button>
      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send email</DialogTitle>
            <DialogDescription>
              Choose a template for {clientName || "this client"}. Invoice templates also need a tax year.
            </DialogDescription>
          </DialogHeader>
          <EmailTemplateSelect
            id="client-send-template"
            value={templateKey}
            onChange={setTemplateKey}
            disabled={sending}
          />
          {!isPaymentTemplate ? (
            <div className="space-y-1.5">
              <Label htmlFor="client-send-year">Tax year</Label>
              <Select value={year} onValueChange={setYear} disabled={sending}>
                <SelectTrigger id="client-send-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_INVOICE_YEARS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={sending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={sending || !templateKey || (!isPaymentTemplate && !year)}
              onClick={() => {
                if (!isPaymentTemplate) {
                  setOpen(false);
                  setInvoiceSendOpen(true);
                  return;
                }
                void sendPaymentAcknowledgement();
              }}
            >
              {sending ? "Sending…" : isPaymentTemplate ? "Send" : "Choose recipients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkInvoiceSendDialog
        open={invoiceSendOpen}
        onOpenChange={setInvoiceSendOpen}
        filters={{ clientIds: [clientId], years: [Number(year)] }}
        initialTemplateKey={templateKey}
      />
    </>
  );
}
