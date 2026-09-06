import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import { LoaderCircle, Mail, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Invoice, InvoiceData, InvoiceProperty } from "@/types/types";
import {
  getInvoiceDeliveries,
  sendInvoice,
  type InvoiceDelivery,
} from "@/store/invoices";
import { elementsToPdfAttachments } from "@/utils/elementToPdfBase64";
import { buildInvoicePdfFilename } from "@/utils/bulkInvoicePdf";
import { getInvoiceSheetDates } from "@/utils/invoiceDates";
import InvoiceSheet2025, {
  getYearInvoice,
  toSafeFilenamePart,
} from "./InvoiceSheet2025";
import { getClientPhoneNumber, getClientRecipientEmail } from "@/utils/clientContact";
import InvoiceSendHistory from "./InvoiceSendHistory";
import { InvoiceEmailStatusBadge } from "@/components/portal/invoices/InvoiceEmailStatusBadge";
import { getInvoiceEmailStatusDisplay, latestDeliveryTrackingForYear } from "@/utils/invoiceEmailStatus";
import { routes } from "@/routes/ROUTES";

type InvoiceDetails2025Props = {
  invoice: InvoiceData;
  selectedYear: number;
  propertyIdFilter?: string | null;
};

type PropertyWithInvoice = {
  property: InvoiceProperty;
  yearInvoice: Invoice;
};

const InvoiceDetails2025: React.FC<InvoiceDetails2025Props> = ({
  invoice,
  selectedYear,
  propertyIdFilter,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const captureContainerRef = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { toast } = useToast();

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendSms, setSendSms] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deliveries, setDeliveries] = useState<InvoiceDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const propertiesWithInvoice = useMemo((): PropertyWithInvoice[] => {
    return invoice.properties
      .filter((property) => {
        if (propertyIdFilter && String(property.propertyDetails.id) !== propertyIdFilter) {
          return false;
        }
        const yearInvoice = getYearInvoice(property, selectedYear);
        return !!yearInvoice;
      })
      .map((property) => ({
        property,
        yearInvoice: getYearInvoice(property, selectedYear)!,
      }));
  }, [invoice.properties, propertyIdFilter, selectedYear]);

  const displayMatch = propertiesWithInvoice[0];

  const recipientEmail = getClientRecipientEmail(invoice.client);
  const recipientPhone = getClientPhoneNumber(invoice.client);

  const refreshDeliveries = useCallback(async () => {
    const clientId = invoice.client.id;
    if (!clientId) return;
    setLoadingDeliveries(true);
    try {
      const rows = await getInvoiceDeliveries(clientId, 10);
      setDeliveries(rows);
    } catch {
      // Non-blocking; history is optional
    } finally {
      setLoadingDeliveries(false);
    }
  }, [invoice.client.id]);

  useEffect(() => {
    void refreshDeliveries();
  }, [refreshDeliveries]);

  const headerLastDelivery = useMemo(() => {
    const fromHistory = latestDeliveryTrackingForYear(deliveries, selectedYear);
    if (fromHistory) return fromHistory;

    if (
      loadingDeliveries &&
      invoice.lastDelivery?.year === selectedYear
    ) {
      return invoice.lastDelivery;
    }

    return null;
  }, [deliveries, selectedYear, invoice.lastDelivery, loadingDeliveries]);

  const yearInvoice = displayMatch?.yearInvoice;
  const { invoiceDate, dueDate } = getInvoiceSheetDates(yearInvoice);
  const cadOwnerNameRaw =
    displayMatch?.property.propertyDetails.nameOnCad ||
    displayMatch?.property.propertyDetails.contactOwner ||
    invoice.client.clientName ||
    "CAD_OWNER_NAME";
  const printFileName = `LSPTax_${toSafeFilenamePart(cadOwnerNameRaw)}_INVOICE_${selectedYear}`;

  const reactToPrintFn = useReactToPrint({
    contentRef,
    documentTitle: printFileName,
    pageStyle: `
      @page {
        size: letter;
        margin: 8mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #invoice-2025-sheet {
          box-shadow: none !important;
          width: 100% !important;
          min-height: 255mm !important;
          margin: 0 auto !important;
          border: 1px solid #111 !important;
          border-radius: 0 !important;
          padding: 18px !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          font-family: "Nunito", sans-serif !important;
        }
      }
    `,
  });

  const handleSendInvoice = async () => {
    const clientId = invoice.client.id;
    if (!clientId) {
      toast({
        title: "Cannot send invoice",
        description: "Client ID is missing.",
        variant: "destructive",
      });
      return;
    }
    if (!recipientEmail) {
      toast({
        title: "Cannot send invoice",
        description: "This client has no billing email or email address on file.",
        variant: "destructive",
      });
      return;
    }
    if (propertiesWithInvoice.length === 0) {
      toast({
        title: "Cannot send invoice",
        description: `No invoice data found for ${selectedYear}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const captureElements = propertiesWithInvoice
        .map(({ property }) => {
          const el = sheetRefs.current.get(property.propertyDetails.id);
          if (!el) return null;
          const account = property.propertyDetails.accountNumber || String(property.propertyDetails.id);
          return {
            element: el,
            filename: buildInvoicePdfFilename({
              clientNumber: invoice.client.clientNumber,
              clientName: invoice.client.clientName,
              accountNumber: account,
              year: selectedYear,
              propertyId: property.propertyDetails.id,
              clientId: invoice.client.id,
            }),
          };
        })
        .filter(Boolean) as Array<{ element: HTMLElement; filename: string }>;

      if (captureElements.length === 0) {
        throw new Error("Could not prepare invoice PDFs for sending.");
      }

      const attachments = await elementsToPdfAttachments(captureElements);
      const propertyAddresses = [
        ...new Set(
          propertiesWithInvoice
            .map(({ property }) => property.propertyDetails.propertyAddress?.trim())
            .filter((address): address is string => Boolean(address))
        ),
      ];
      const propertyIds = propertiesWithInvoice.map(
        ({ property }) => property.propertyDetails.id
      );
      const invoiceIds = propertiesWithInvoice
        .map(({ yearInvoice }) => yearInvoice.id)
        .filter((id): id is number => typeof id === "number" && !Number.isNaN(id));

      const result = await sendInvoice({
        clientId,
        year: selectedYear,
        sendSms,
        attachments,
        propertyAddresses,
        propertyIds,
        invoiceIds: invoiceIds.length ? invoiceIds : undefined,
      });

      toast({
        title: "Invoice sent",
        description:
          result.data.emailLastEvent != null
            ? `${result.message || `Emailed to ${result.data.recipientEmail}`} (status: ${getInvoiceEmailStatusDisplay({ emailLastEvent: result.data.emailLastEvent }).displayLabel})`
            : result.message || `Emailed to ${result.data.recipientEmail}`,
      });

      if (result.data.warning) {
        toast({
          title: "SMS not delivered",
          description: result.data.warning,
        });
      }

      setSendDialogOpen(false);
      await refreshDeliveries();
      window.setTimeout(() => {
        void refreshDeliveries();
      }, 45000);
    } catch (error) {
      toast({
        title: "Failed to send invoice",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!displayMatch) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] px-4 text-center text-gray-700">
        No invoice data for {selectedYear}.
      </div>
    );
  }

  return (
    <div className="bg-gray-100 py-4">
      <div className="mx-auto max-w-[1100px] px-3">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>Email status:</span>
            <InvoiceEmailStatusBadge lastDelivery={headerLastDelivery} />
          </div>
          <Button asChild variant="outline">
            <Link to={routes.properties.view(displayMatch.property.propertyDetails.id)}>
              View Property
            </Link>
          </Button>
          <Button variant="blue" className="bg-brand-blue text-white" onClick={() => reactToPrintFn()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="blue"
            className="bg-brand-blue text-white"
            disabled={!recipientEmail || isSending}
            onClick={() => setSendDialogOpen(true)}
          >
            {isSending ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send by email
              </>
            )}
          </Button>
        </div>

        {!recipientEmail && (
          <p className="mb-3 text-sm text-amber-700">
            Add a billing email or email address on the client record to send this invoice.
          </p>
        )}

        <div className="flex flex-col items-start gap-3 lg:flex-row lg:gap-4">
          <div ref={contentRef} className="min-w-0 flex-1">
            <InvoiceSheet2025
              client={invoice.client}
              property={displayMatch.property}
              yearInvoice={yearInvoice}
              selectedYear={selectedYear}
              invoiceDate={invoiceDate}
              dueDate={dueDate}
            />
          </div>

          <InvoiceSendHistory
            deliveries={deliveries}
            loading={loadingDeliveries}
            selectedYear={selectedYear}
            onRefresh={refreshDeliveries}
          />
        </div>
      </div>

      {/* Off-screen sheets for multi-property PDF capture */}
      <div
        ref={captureContainerRef}
        className="fixed left-[-10000px] top-0 w-[950px] pointer-events-none"
        aria-hidden
      >
        {propertiesWithInvoice.map(({ property, yearInvoice: inv }) => {
          const { invoiceDate: sheetDate, dueDate: sheetDueDate } = getInvoiceSheetDates(inv);
          return (
            <InvoiceSheet2025
              key={property.propertyDetails.id}
              ref={(node) => {
                if (node) {
                  sheetRefs.current.set(property.propertyDetails.id, node);
                } else {
                  sheetRefs.current.delete(property.propertyDetails.id);
                }
              }}
              client={invoice.client}
              property={property}
              yearInvoice={inv}
              selectedYear={selectedYear}
              invoiceDate={sheetDate}
              dueDate={sheetDueDate}
            />
          );
        })}
      </div>

      <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send invoice by email</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  Email <span className="font-medium text-foreground">{recipientEmail}</span> with{" "}
                  {propertiesWithInvoice.length} PDF
                  {propertiesWithInvoice.length === 1 ? "" : "s"} for tax year {selectedYear}.
                </p>
                {recipientPhone && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="send-invoice-sms"
                      checked={sendSms}
                      onCheckedChange={(checked) => setSendSms(checked === true)}
                    />
                    <label htmlFor="send-invoice-sms" className="cursor-pointer">
                      Also send SMS to {recipientPhone}
                    </label>
                  </div>
                )}
                {!recipientPhone && sendSms && (
                  <p className="text-xs">No phone number on file — SMS will be skipped.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSending}
              onClick={(event) => {
                event.preventDefault();
                void handleSendInvoice();
              }}
            >
              {isSending ? "Sending..." : "Send invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvoiceDetails2025;
