import JSZip from "jszip";

import {
  getArchiveInvoices,
  getInvoice,
  getInvoiceByPropertyId,
  getAllInvoices,
  type BulkInvoiceRecipient,
} from "@/store/invoices";
import { getFormattedDate } from "@/store/common";
import { Invoice, InvoiceData, InvoiceProperty, InvoiceSummary } from "@/types/types";
import { elementToPdfBase64 } from "@/utils/elementToPdfBase64";
import { normalizeInvoiceData } from "@/utils/invoiceDataNormalization";
import { toSafeFilenamePart } from "@/components/portal/clients/invoice/InvoiceSheet2025";
import { getInvoiceSheetDates } from "@/utils/invoiceDates";

export const MAX_BULK_INVOICE_DOWNLOAD = 400;

export type InvoicePdfRenderJob = {
  key: string;
  clientId: number;
  filename: string;
  client: InvoiceData["client"];
  property: InvoiceProperty;
  yearInvoice: Invoice;
  selectedYear: number;
  invoiceDate: string;
  dueDate: string;
};

export const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

export function buildInvoicePdfFilename({
  clientNumber,
  clientName,
  accountNumber,
  year,
  propertyId,
  clientId,
}: {
  clientNumber?: string | null;
  clientName?: string | null;
  accountNumber?: string | null;
  year: number | string;
  propertyId?: number | string;
  clientId?: number | string;
}): string {
  const numberPart = toSafeFilenamePart(
    clientNumber?.trim() || String(clientId ?? propertyId ?? "client")
  );
  const namePart = toSafeFilenamePart(clientName?.trim() || "client");
  const accountPart = toSafeFilenamePart(
    accountNumber?.trim() || String(propertyId ?? "account")
  );
  return `${numberPart}-invoice-${namePart}-${accountPart}-${year}.pdf`;
}

/** Zip name for a batch series, e.g. `invoices_1-50_6thJul2026.zip`. */
export function buildInvoiceZipFilename(rangeStart: number, rangeEnd: number): string {
  return `invoices_${rangeStart}-${rangeEnd}_${getFormattedDate()}.zip`;
}

/** 1-based positions of selected rows in the filtered invoice list (for zip naming). */
export async function resolveInvoiceListRange(
  selectedInvoiceIds: number[],
  options?: {
    archived?: boolean;
    search?: string;
    sendStatus?: import("@/utils/invoiceEmailStatus").InvoiceEmailStatusFilter;
    paymentStatus?: import("@/store/invoices").InvoicePaymentStatusFilter;
  }
): Promise<{ start: number; end: number }> {
  if (selectedInvoiceIds.length === 0) {
    return { start: 1, end: 1 };
  }

  const selectedSet = new Set(selectedInvoiceIds.map(Number));
  const positions: number[] = [];
  let offset = 0;
  const pageSize = 100;
  const search = options?.search?.trim() || undefined;
  const sendStatus = options?.sendStatus ?? "all";
  const paymentStatus = options?.paymentStatus ?? "any";
  const fetchPage = options?.archived ? getArchiveInvoices : getAllInvoices;
  const targetCount = selectedSet.size;

  while (true) {
    const page = await fetchPage(pageSize, offset, search, sendStatus, paymentStatus);
    (page.data as InvoiceSummary[]).forEach((row, index) => {
      const id = Number(row.id);
      if (selectedSet.has(id)) {
        positions.push(offset + index + 1);
      }
    });
    if (positions.length >= targetCount || !page.hasMore) break;
    offset += pageSize;
  }

  if (positions.length === 0) {
    return { start: 1, end: selectedInvoiceIds.length };
  }

  return {
    start: Math.min(...positions),
    end: Math.max(...positions),
  };
}

const buildJobsFromInvoiceData = (
  invoiceData: InvoiceData,
  recipient: BulkInvoiceRecipient,
  options?: { restrictPropertyId?: number }
): InvoicePdfRenderJob[] => {
  const propertyIds = new Set(recipient.propertyIds.map(Number));
  const invoiceIds = new Set(recipient.invoiceIds.map(Number));
  const years = new Set(recipient.years.map(Number));

  return invoiceData.properties.flatMap((property) => {
    const propertyId = Number(property.propertyDetails.id);
    if (options?.restrictPropertyId && propertyId !== options.restrictPropertyId) return [];
    if (propertyIds.size > 0 && !propertyIds.has(propertyId)) return [];

    return property.invoice
      .filter((invoice) => invoiceIds.size === 0 || invoiceIds.has(Number(invoice.id)))
      .filter((invoice) => years.size === 0 || years.has(Number(invoice.year)))
      .map((yearInvoice) => {
        const selectedYear = Number(yearInvoice.year);
        const { invoiceDate, dueDate } = getInvoiceSheetDates(yearInvoice);
        const account = property.propertyDetails.accountNumber || String(propertyId);

        return {
          key: `${recipient.clientId}-${propertyId}-${selectedYear}`,
          clientId: recipient.clientId,
          filename: buildInvoicePdfFilename({
            clientNumber: recipient.clientNumber || invoiceData.client.clientNumber,
            clientName: recipient.clientName || invoiceData.client.clientName,
            accountNumber: account,
            year: selectedYear,
            propertyId,
            clientId: recipient.clientId,
          }),
          client: invoiceData.client,
          property,
          yearInvoice,
          selectedYear,
          invoiceDate,
          dueDate: dueDate,
        };
      });
  });
};

export const buildRenderJobsForRecipient = async (
  recipient: BulkInvoiceRecipient
): Promise<InvoicePdfRenderJob[]> => {
  const propertyIds = [...new Set(recipient.propertyIds.map(Number).filter(Number.isFinite))];
  const jobs: InvoicePdfRenderJob[] = [];

  for (const propertyId of propertyIds) {
    const raw = await getInvoiceByPropertyId({ propertyId: String(propertyId) });
    const { invoiceData } = normalizeInvoiceData(raw);
    if (!invoiceData) continue;
    jobs.push(
      ...buildJobsFromInvoiceData(invoiceData, recipient, { restrictPropertyId: propertyId })
    );
  }

  if (jobs.length === 0) {
    const raw = await getInvoice({ clientId: String(recipient.clientId) });
    const { invoiceData } = normalizeInvoiceData(raw);
    if (!invoiceData) {
      throw new Error(`Could not load invoice details for ${recipient.clientName}.`);
    }
    jobs.push(...buildJobsFromInvoiceData(invoiceData, recipient));
  }

  const uniqueJobs = Array.from(new Map(jobs.map((job) => [job.key, job])).values());

  if (uniqueJobs.length === 0) {
    throw new Error(`No matching invoice PDFs for ${recipient.clientName}.`);
  }

  return uniqueJobs;
};

export const buildRenderJobsForRecipients = async (
  recipients: BulkInvoiceRecipient[]
): Promise<{ jobs: InvoicePdfRenderJob[]; warnings: string[] }> => {
  const results = await Promise.allSettled(recipients.map(buildRenderJobsForRecipient));
  const jobs: InvoicePdfRenderJob[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    } else {
      warnings.push(
        result.reason instanceof Error ? result.reason.message : "Failed to prepare some invoices."
      );
    }
  }

  const uniqueJobs = Array.from(new Map(jobs.map((job) => [job.key, job])).values());

  if (uniqueJobs.length === 0 && warnings.length > 0) {
    throw new Error(warnings[0]);
  }

  return { jobs: uniqueJobs, warnings };
};

export async function downloadInvoicePdfsAsZip(
  jobs: InvoicePdfRenderJob[],
  sheetRefs: Map<string, HTMLDivElement>,
  onProgress?: (completed: number, total: number) => void,
  options?: { rangeStart?: number; rangeEnd?: number; zipFilename?: string }
): Promise<void> {
  const zip = new JSZip();

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const element = sheetRefs.get(job.key);
    if (!element) {
      throw new Error(`Could not prepare PDF for ${job.filename}.`);
    }

    const contentBase64 = await elementToPdfBase64(element);
    zip.file(job.filename, contentBase64, { base64: true });
    onProgress?.(index + 1, jobs.length);
  }

  const zipFilename =
    options?.zipFilename ??
    (options?.rangeStart != null && options?.rangeEnd != null
      ? buildInvoiceZipFilename(options.rangeStart, options.rangeEnd)
      : `invoices_1-${jobs.length}_${getFormattedDate()}.zip`);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = zipFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
