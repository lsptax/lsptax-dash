import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  bulkSendInvoices,
  getBulkInvoiceRecipients,
  previewPaymentAcknowledgementContacts,
  sendPaymentAcknowledgementEmails,
  type BulkInvoiceRecipient,
  type BulkInvoiceSendFilters,
  type PaymentAcknowledgementContact,
} from "@/store/invoices";
import { getEmailTemplates } from "@/api/emailTemplates";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import { elementsToPdfAttachments } from "@/utils/elementToPdfBase64";
import {
  buildRenderJobsForRecipients,
  nextFrame,
  type InvoicePdfRenderJob,
} from "@/utils/bulkInvoicePdf";
import { formatUSD } from "@/utils/formatCurrency";
import { InvoicePdfRenderSheets } from "./InvoicePdfRenderSheets";
import { InvoiceEmailStatusBadge } from "./InvoiceEmailStatusBadge";
import { EmailTemplateSelect } from "@/components/portal/account/EmailTemplateSelect";
import { PROPERTY_INVOICE_YEARS } from "@/components/portal/properties/propertyInvoiceYears";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function initialSendYear(years?: number[]) {
  const selected = (years ?? []).map(Number).filter((value) => Number.isFinite(value));
  return selected.length === 1 ? String(selected[0]) : "all";
}

type BulkInvoiceSendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BulkInvoiceSendFilters;
  onSent?: () => void;
  initialTemplateKey?: string;
};

export function BulkInvoiceSendDialog({
  open,
  onOpenChange,
  filters,
  onSent,
  initialTemplateKey,
}: BulkInvoiceSendDialogProps) {
  const { toast } = useToast();
  const sheetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [recipients, setRecipients] = useState<BulkInvoiceRecipient[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());
  const [renderJobs, setRenderJobs] = useState<InvoicePdfRenderJob[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSms, setSendSms] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [paymentContacts, setPaymentContacts] = useState<PaymentAcknowledgementContact[]>([]);
  const [selectedPaymentClientIds, setSelectedPaymentClientIds] = useState<Set<number>>(new Set());
  const [loadingPaymentContacts, setLoadingPaymentContacts] = useState(false);
  const [unpaidSkippedCount, setUnpaidSkippedCount] = useState(0);
  const [templateKey, setTemplateKey] = useState(initialTemplateKey || "invoice_delivery");
  const [sendMode, setSendMode] = useState<"invoice" | "payment_acknowledgement">("invoice");
  const [year, setYear] = useState(() => initialSendYear(filters.years));

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
    enabled: open,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });
  const selectedTemplate = templatesQuery.data?.find((template) => template.key === templateKey);
  const isInvoiceTemplate = sendMode === "invoice";
  const selectedInvoiceIds = filters.invoiceIds ?? [];

  const effectiveFilters = useMemo(() => {
    if (year !== "all") {
      return { ...filters, years: [Number(year)] };
    }
    if (filters.years?.length) return filters;
    const { years: _years, ...rest } = filters;
    return rest;
  }, [filters, year]);

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedClientIds.has(recipient.clientId) && recipient.canSend),
    [recipients, selectedClientIds]
  );
  const matchedInvoiceCount = useMemo(
    () => recipients.reduce((sum, recipient) => sum + recipient.invoiceCount, 0),
    [recipients]
  );
  const omittedInvoiceCount = Math.max(0, selectedInvoiceIds.length - matchedInvoiceCount);
  const selectedPaymentContacts = useMemo(
    () =>
      paymentContacts.filter(
        (contact) => selectedPaymentClientIds.has(contact.clientId) && contact.canSend
      ),
    [paymentContacts, selectedPaymentClientIds]
  );
  const singleClientId = filters.clientIds?.length === 1 ? filters.clientIds[0] : undefined;
  const paymentInvoiceKey = selectedInvoiceIds.join(",");

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    setRenderJobs([]);
    try {
      const result = await getBulkInvoiceRecipients({
        ...effectiveFilters,
        hasEmail: true,
        limit: effectiveFilters.limit ?? 500,
      });
      setRecipients(result.recipients);
      setSelectedClientIds(
        new Set(result.recipients.filter((recipient) => recipient.canSend).map((recipient) => recipient.clientId))
      );
      setTruncated(result.truncated);
    } catch (error) {
      toast({
        title: "Could not preview recipients",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    const purpose = selectedTemplate?.purpose;
    if (purpose === "invoice" || purpose === "payment_acknowledgement") {
      setSendMode(purpose);
    }
  }, [selectedTemplate?.purpose]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setYear(initialSendYear(filters.years));
      if (initialTemplateKey) setTemplateKey(initialTemplateKey);
    }
    wasOpenRef.current = open;
  }, [open, filters.years, initialTemplateKey]);

  useEffect(() => {
    if (open && isInvoiceTemplate) {
      void loadRecipients();
    } else if (open) {
      void loadPaymentContacts();
    } else {
      setRenderJobs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isInvoiceTemplate, JSON.stringify(effectiveFilters), paymentInvoiceKey, singleClientId]);

  const loadPaymentContacts = async () => {
    if (selectedInvoiceIds.length === 0 && singleClientId == null) {
      setPaymentContacts([]);
      setSelectedPaymentClientIds(new Set());
      setUnpaidSkippedCount(0);
      return;
    }

    setLoadingPaymentContacts(true);
    try {
      const result = await previewPaymentAcknowledgementContacts(
        selectedInvoiceIds.length > 0
          ? { invoiceIds: selectedInvoiceIds }
          : { clientId: singleClientId }
      );
      setPaymentContacts(result.contacts);
      setSelectedPaymentClientIds(
        new Set(result.contacts.filter((contact) => contact.canSend).map((contact) => contact.clientId))
      );
      setUnpaidSkippedCount(result.unpaidCount);
    } catch (error) {
      toast({
        title: "Could not load contacts",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPaymentContacts(false);
    }
  };

  const toggleRecipient = (clientId: number, checked: boolean) => {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (checked) next.add(clientId);
      else next.delete(clientId);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Select at least one eligible client before sending invoices.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { jobs } = await buildRenderJobsForRecipients(selectedRecipients);
      if (jobs.length === 0) {
        throw new Error("No matching invoice PDFs could be prepared for the selected recipients.");
      }

      setRenderJobs(jobs);
      await nextFrame();

      const attachmentsByClient = [];
      for (const recipient of selectedRecipients) {
        const clientJobs = jobs.filter((job) => job.clientId === recipient.clientId);
        const captureElements = clientJobs.map((job) => {
          const element = sheetRefs.current.get(job.key);
          if (!element) {
            throw new Error(`Could not prepare invoice PDF for ${recipient.clientName}.`);
          }
          return { element, filename: job.filename };
        });

        attachmentsByClient.push({
          clientId: recipient.clientId,
          year: recipient.years.length === 1 ? recipient.years[0] : undefined,
          attachments: await elementsToPdfAttachments(captureElements),
        });
      }

      const result = await bulkSendInvoices({
        filters: {
          ...effectiveFilters,
          clientIds: selectedRecipients.map((recipient) => recipient.clientId),
          hasEmail: true,
        },
        attachmentsByClient,
        sendSms,
        templateKey,
        year: year === "all" ? undefined : Number(year),
        limit: selectedRecipients.length,
      });

      const { sent, failed, skipped } = result.data.summary;
      toast({
        title: "Bulk invoice send complete",
        description: `${sent} sent, ${failed} failed, ${skipped} skipped.`,
        variant: failed > 0 ? "destructive" : undefined,
      });

      if (failed > 0 || skipped > 0) {
        const firstIssue = result.data.results.find((row) => row.error);
        if (firstIssue?.error) {
          toast({
            title: "Some invoices were not sent",
            description: firstIssue.error,
            variant: "destructive",
          });
        }
      }

      onSent?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Bulk send failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
      setRenderJobs([]);
    }
  };

  const togglePaymentContact = (clientId: number, checked: boolean) => {
    setSelectedPaymentClientIds((current) => {
      const next = new Set(current);
      if (checked) next.add(clientId);
      else next.delete(clientId);
      return next;
    });
  };

  const handlePaymentSend = async () => {
    const invoiceIds = selectedPaymentContacts.flatMap((contact) => contact.invoiceIds);
    if (invoiceIds.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Select at least one contact with an email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendPaymentAcknowledgementEmails({ invoiceIds, templateKey });
      toast({
        title: "Payment acknowledgement sent",
        description: result.message,
        variant: result.data?.failedCount ? "destructive" : undefined,
      });
      onSent?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Could not send acknowledgement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !isSending && onOpenChange(nextOpen)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isInvoiceTemplate ? "Send invoice email" : "Send payment acknowledgement"}</DialogTitle>
            <DialogDescription>
              {isInvoiceTemplate
                ? "Each contact gets one email. Invoices for the same person are combined."
                : "Choose a payment acknowledgement template, then pick the contacts who should receive it. Unpaid invoices are left out."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className={isInvoiceTemplate ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
              <EmailTemplateSelect
                id="bulk-invoice-template"
                value={templateKey}
                onChange={setTemplateKey}
                disabled={isSending}
              />
              {isInvoiceTemplate ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-invoice-year">Tax year</Label>
                  <Select value={year} onValueChange={setYear} disabled={isSending}>
                    <SelectTrigger id="bulk-invoice-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {PROPERTY_INVOICE_YEARS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {isInvoiceTemplate ? (
              <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">
                  {loadingRecipients
                    ? "Grouping invoices…"
                    : `${selectedRecipients.length} email${selectedRecipients.length === 1 ? "" : "s"}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {loadingRecipients
                    ? "Invoices for the same contact are combined into one email."
                    : selectedInvoiceIds.length > 0
                      ? omittedInvoiceCount > 0 && year !== "all"
                        ? `${selectedInvoiceIds.length} invoices selected. ${matchedInvoiceCount} are for ${year} and go out as ${recipients.length} ${recipients.length === 1 ? "email" : "emails"}. ${omittedInvoiceCount} ${omittedInvoiceCount === 1 ? "is" : "are"} a different year, so ${omittedInvoiceCount === 1 ? "it is" : "they are"} left out.`
                        : `${selectedInvoiceIds.length} invoices${year === "all" ? "" : ` for ${year}`}, combined into ${recipients.length} ${recipients.length === 1 ? "email" : "emails"}. Same contact, one email.`
                      : `One email per contact${year === "all" ? "" : ` for ${year}`}. Invoices for the same contact go together.`}
                  {!loadingRecipients && truncated ? " List truncated at the API limit." : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bulk-send-sms"
                  checked={sendSms}
                  onCheckedChange={(checked) => setSendSms(checked === true)}
                />
                <label htmlFor="bulk-send-sms" className="cursor-pointer text-sm">
                  Send SMS notifications when phone numbers exist
                </label>
              </div>
            </div>

            <div className="max-h-[360px] overflow-auto rounded-lg border">
              {loadingRecipients ? (
                <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading recipients...
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No clients with invoice email addresses matched these filters.
                </div>
              ) : (
                recipients.map((recipient) => (
                  <div
                    key={recipient.clientId}
                    className="flex items-start gap-3 border-b p-3 last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedClientIds.has(recipient.clientId)}
                      disabled={!recipient.canSend || isSending}
                      onCheckedChange={(checked) => toggleRecipient(recipient.clientId, checked === true)}
                      aria-label={`Select ${recipient.clientName}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{recipient.clientName}</p>
                        {recipient.clientNumber && (
                          <Badge variant="outline">{recipient.clientNumber}</Badge>
                        )}
                        {recipient.lastDelivery && (
                          <InvoiceEmailStatusBadge lastDelivery={recipient.lastDelivery} />
                        )}
                        {!recipient.canSend && (
                          <Badge variant="destructive">{recipient.skipReason || "Cannot send"}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {recipient.recipientEmail} · {recipient.invoiceCount} invoice
                        {recipient.invoiceCount === 1 ? "" : "s"} in this email · {formatUSD(recipient.totalInvoiceAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Years: {recipient.years.join(", ") || "Any"} · Properties:{" "}
                        {(recipient.propertyNumbers?.length ? recipient.propertyNumbers : recipient.propertyIds).join(", ")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">{selectedPaymentContacts.length} selected</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentContacts.length} contact{paymentContacts.length === 1 ? "" : "s"}
                    {unpaidSkippedCount > 0
                      ? ` · ${unpaidSkippedCount} unpaid invoice${unpaidSkippedCount === 1 ? "" : "s"} skipped`
                      : ""}
                  </p>
                </div>
                <div className="max-h-[360px] overflow-auto rounded-lg border">
                  {loadingPaymentContacts ? (
                    <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading contacts...
                    </div>
                  ) : selectedInvoiceIds.length === 0 && singleClientId == null ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      Select invoices in the table before sending a payment acknowledgement.
                    </div>
                  ) : paymentContacts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      {unpaidSkippedCount > 0
                        ? "None of the selected invoices are marked paid, so there is nobody to email."
                        : "No contacts matched these invoices."}
                    </div>
                  ) : (
                    paymentContacts.map((contact) => (
                      <div
                        key={contact.clientId}
                        className="flex items-start gap-3 border-b p-3 last:border-b-0"
                      >
                        <Checkbox
                          checked={selectedPaymentClientIds.has(contact.clientId)}
                          disabled={!contact.canSend || isSending}
                          onCheckedChange={(checked) =>
                            togglePaymentContact(contact.clientId, checked === true)
                          }
                          aria-label={`Select ${contact.clientName}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{contact.clientName}</p>
                            {contact.clientNumber ? (
                              <Badge variant="outline">{contact.clientNumber}</Badge>
                            ) : null}
                            {!contact.canSend ? (
                              <Badge variant="destructive">{contact.skipReason || "Cannot send"}</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contact.recipientEmail || "No email"} · {contact.invoiceCount} paid invoice
                            {contact.invoiceCount === 1 ? "" : "s"} · {formatUSD(contact.totalPaymentAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.propertyAddresses.join(", ") || "No property address"}
                            {contact.years.length > 0 ? ` · ${contact.years.join(", ")}` : ""}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSending || (!isInvoiceTemplate && loadingPaymentContacts)}
              onClick={() => void (isInvoiceTemplate ? loadRecipients() : loadPaymentContacts())}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" disabled={isSending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                isSending ||
                (isInvoiceTemplate
                  ? loadingRecipients || selectedRecipients.length === 0
                  : loadingPaymentContacts || selectedPaymentContacts.length === 0)
              }
              onClick={() => void (isInvoiceTemplate ? handleSend() : handlePaymentSend())}
            >
              {isSending ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSending ? "Sending..." : isInvoiceTemplate ? "Send selected" : "Send acknowledgement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoicePdfRenderSheets jobs={renderJobs} sheetRefs={sheetRefs} />
    </>
  );
}
