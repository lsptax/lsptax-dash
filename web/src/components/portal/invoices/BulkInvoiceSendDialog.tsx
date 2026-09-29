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
import { ZERO_SAVINGS_INVOICE_TEMPLATE_KEY } from "@/utils/zeroSavingsInvoice";
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

function recipientGroupKey(recipient: BulkInvoiceRecipient) {
  return recipient.groupKey || `${recipient.clientId}:${recipient.savingsKind || "savings"}`;
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
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(new Set());
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
  const [zeroSavingsTemplateKey, setZeroSavingsTemplateKey] = useState(
    ZERO_SAVINGS_INVOICE_TEMPLATE_KEY
  );
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
    () =>
      recipients.filter(
        (recipient) => selectedGroupKeys.has(recipientGroupKey(recipient)) && recipient.canSend
      ),
    [recipients, selectedGroupKeys]
  );
  const selectionMix = useMemo<"zero" | "savings" | "mixed" | "none">(() => {
    const hasZero = selectedRecipients.some((recipient) => recipient.savingsKind === "zero_savings");
    const hasSavings = selectedRecipients.some((recipient) => recipient.savingsKind !== "zero_savings");
    if (hasZero && hasSavings) return "mixed";
    if (hasZero) return "zero";
    if (hasSavings) return "savings";
    return "none";
  }, [selectedRecipients]);
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
  const appliedMixRef = useRef<string | null>(null);

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    setRecipients([]);
    setRenderJobs([]);
    try {
      const result = await getBulkInvoiceRecipients({
        ...effectiveFilters,
        hasEmail: true,
        limit: effectiveFilters.limit ?? 500,
      });
      const selectable = result.recipients.filter((recipient) => recipient.canSend);
      const hasZero = selectable.some((recipient) => recipient.savingsKind === "zero_savings");
      const hasSavings = selectable.some((recipient) => recipient.savingsKind !== "zero_savings");
      const mix = hasZero && hasSavings ? "mixed" : hasZero ? "zero" : hasSavings ? "savings" : "none";
      const savingsDefault =
        initialTemplateKey && initialTemplateKey !== ZERO_SAVINGS_INVOICE_TEMPLATE_KEY
          ? initialTemplateKey
          : "invoice_delivery";
      if (mix === "zero") {
        setTemplateKey(ZERO_SAVINGS_INVOICE_TEMPLATE_KEY);
      } else if (mix === "savings" || mix === "mixed") {
        setTemplateKey(savingsDefault);
        if (mix === "mixed") setZeroSavingsTemplateKey(ZERO_SAVINGS_INVOICE_TEMPLATE_KEY);
      }
      appliedMixRef.current = mix === "none" ? null : mix;
      setRecipients(result.recipients);
      setSelectedGroupKeys(
        new Set(selectable.map((recipient) => recipientGroupKey(recipient)))
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
    if (purpose === "invoice" || purpose === "invoice_zero_savings") {
      setSendMode("invoice");
    } else if (purpose === "payment_acknowledgement") {
      setSendMode("payment_acknowledgement");
    }
  }, [selectedTemplate?.purpose]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setYear(initialSendYear(filters.years));
      if (initialTemplateKey) setTemplateKey(initialTemplateKey);
      setZeroSavingsTemplateKey(ZERO_SAVINGS_INVOICE_TEMPLATE_KEY);
      appliedMixRef.current = null;
    }
    if (!open) appliedMixRef.current = null;
    wasOpenRef.current = open;
  }, [open, filters.years, initialTemplateKey]);

  useEffect(() => {
    if (!open || !isInvoiceTemplate || loadingRecipients || selectionMix === "none") return;
    if (appliedMixRef.current === selectionMix) return;
    appliedMixRef.current = selectionMix;
    const savingsDefault =
      initialTemplateKey && initialTemplateKey !== ZERO_SAVINGS_INVOICE_TEMPLATE_KEY
        ? initialTemplateKey
        : "invoice_delivery";
    if (selectionMix === "zero") {
      setTemplateKey(ZERO_SAVINGS_INVOICE_TEMPLATE_KEY);
      return;
    }
    setTemplateKey(savingsDefault);
    if (selectionMix === "mixed") {
      setZeroSavingsTemplateKey(ZERO_SAVINGS_INVOICE_TEMPLATE_KEY);
    }
  }, [open, isInvoiceTemplate, loadingRecipients, selectionMix, initialTemplateKey]);

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

  const toggleRecipient = (groupKey: string, checked: boolean) => {
    setSelectedGroupKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(groupKey);
      else next.delete(groupKey);
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
        const invoiceIds = new Set(recipient.invoiceIds.map(Number));
        const clientJobs = jobs.filter(
          (job) =>
            job.clientId === recipient.clientId &&
            (invoiceIds.size === 0 || invoiceIds.has(Number(job.yearInvoice.id)))
        );
        const captureElements = clientJobs.map((job) => {
          const element = sheetRefs.current.get(job.key);
          if (!element) {
            throw new Error(`Could not prepare invoice PDF for ${recipient.clientName}.`);
          }
          return { element, filename: job.filename };
        });

        attachmentsByClient.push({
          clientId: recipient.clientId,
          groupKey: recipientGroupKey(recipient),
          year: recipient.years.length === 1 ? recipient.years[0] : undefined,
          templateKey:
            recipient.savingsKind === "zero_savings"
              ? selectionMix === "mixed"
                ? zeroSavingsTemplateKey
                : templateKey
              : templateKey,
          attachments: await elementsToPdfAttachments(captureElements),
        });
      }

      const result = await bulkSendInvoices({
        filters: {
          ...effectiveFilters,
          invoiceIds: selectedRecipients.flatMap((recipient) => recipient.invoiceIds),
          clientIds: [...new Set(selectedRecipients.map((recipient) => recipient.clientId))],
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
                ? selectionMix === "zero"
                  ? "All selected invoices have $0 tax savings. Each contact gets one email using the 0 Savings template."
                  : selectionMix === "mixed"
                    ? "This selection has tax savings and $0 savings. Each contact gets one email for each, and you choose both templates."
                    : selectionMix === "savings"
                      ? "These invoices have tax savings. Each contact gets one email using the invoice template."
                      : "Each contact gets one email. Invoices for the same person are combined."
                : "Choose a payment acknowledgement template, then pick the contacts who should receive it. Unpaid invoices are left out."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className={isInvoiceTemplate ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
              {isInvoiceTemplate && loadingRecipients ? (
                <p className="text-sm text-muted-foreground sm:col-span-2">Checking savings on the selected invoices…</p>
              ) : null}
              {isInvoiceTemplate && !loadingRecipients && selectionMix === "mixed" ? (
                <>
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Some invoices have tax savings and some have $0 savings. Pick a template for each email.
                  </p>
                  <EmailTemplateSelect
                    id="bulk-savings-template"
                    label="Tax savings template"
                    purpose="invoice"
                    value={templateKey}
                    onChange={setTemplateKey}
                    disabled={isSending}
                  />
                  <EmailTemplateSelect
                    id="bulk-zero-template"
                    label="0 savings template"
                    purpose="invoice_zero_savings"
                    value={zeroSavingsTemplateKey}
                    onChange={setZeroSavingsTemplateKey}
                    disabled={isSending}
                  />
                </>
              ) : null}
              {isInvoiceTemplate && !loadingRecipients && selectionMix !== "mixed" ? (
                <div className="space-y-1.5">
                  {selectionMix === "zero" ? (
                    <p className="text-sm text-muted-foreground">
                      All selected invoices have $0 tax savings, so the 0 Savings template is selected.
                    </p>
                  ) : null}
                  {selectionMix === "savings" ? (
                    <p className="text-sm text-muted-foreground">
                      These invoices have tax savings, so the invoice email template is selected.
                    </p>
                  ) : null}
                  <EmailTemplateSelect
                    id="bulk-invoice-template"
                    purpose={selectionMix === "zero" ? "invoice_zero_savings" : "invoice"}
                    extraPurposes={["payment_acknowledgement"]}
                    value={templateKey}
                    onChange={setTemplateKey}
                    disabled={isSending}
                  />
                </div>
              ) : null}
              {!isInvoiceTemplate ? (
                <EmailTemplateSelect
                  id="bulk-invoice-template"
                  value={templateKey}
                  onChange={setTemplateKey}
                  disabled={isSending}
                />
              ) : null}
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
                    ? "Invoices for the same contact are combined. $0 savings invoices are split into their own email."
                    : selectedInvoiceIds.length > 0
                      ? omittedInvoiceCount > 0 && year !== "all"
                        ? `${selectedInvoiceIds.length} invoices selected. ${matchedInvoiceCount} are for ${year} and go out as ${recipients.length} ${recipients.length === 1 ? "email" : "emails"}. ${omittedInvoiceCount} ${omittedInvoiceCount === 1 ? "is" : "are"} a different year, so ${omittedInvoiceCount === 1 ? "it is" : "they are"} left out.`
                        : `${selectedInvoiceIds.length} invoices${year === "all" ? "" : ` for ${year}`}, combined into ${recipients.length} ${recipients.length === 1 ? "email" : "emails"}. ${
                            selectionMix === "zero"
                              ? "Same contact, one email, using the 0 Savings template."
                              : selectionMix === "savings"
                                ? "Same contact, one email."
                                : "Same contact, one email for savings and a separate email for $0 savings."
                          }`
                      : selectionMix === "zero"
                        ? `One email per contact${year === "all" ? "" : ` for ${year}`}, using the 0 Savings template.`
                        : selectionMix === "savings"
                          ? `One email per contact${year === "all" ? "" : ` for ${year}`}. Invoices for the same contact go together.`
                          : `One savings email per contact${year === "all" ? "" : ` for ${year}`}, plus a separate email when that contact has $0 savings invoices.`}
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
                    key={recipientGroupKey(recipient)}
                    className="flex items-start gap-3 border-b p-3 last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedGroupKeys.has(recipientGroupKey(recipient))}
                      disabled={!recipient.canSend || isSending}
                      onCheckedChange={(checked) =>
                        toggleRecipient(recipientGroupKey(recipient), checked === true)
                      }
                      aria-label={`Select ${recipient.clientName}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{recipient.clientName}</p>
                        {recipient.savingsKind === "zero_savings" ? (
                          <Badge variant="secondary">$0 savings</Badge>
                        ) : (
                          <Badge variant="outline">Tax savings</Badge>
                        )}
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
