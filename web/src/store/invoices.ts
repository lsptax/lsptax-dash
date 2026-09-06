import { authFetch, getAuthHeaders, getApiBaseUrl } from "@/api/client";
import {
  DEFAULT_PAGE_SIZE,
  getFormattedDate,
  type PaginatedResponse,
} from "./common";

const base = getApiBaseUrl;

export const getInvoice = async ({ clientId }: { clientId: string }) => {
  try {
    const response = await authFetch(`${base()}/api/invoice/clientid=${clientId}`);
    if (!response.ok) throw new Error("Failed to fetch Invoices");
    return response.json();
  } catch {
    return [];
  }
};

export const getInvoiceByPropertyId = async ({ propertyId }: { propertyId: string }) => {
  try {
    const response = await authFetch(`${base()}/api/invoice/${propertyId}`);
    if (!response.ok) throw new Error("Failed to fetch Invoices");
    return response.json();
  } catch {
    return [];
  }
};

export type InvoiceSendStatusFilter = import("@/utils/invoiceEmailStatus").InvoiceEmailStatusFilter;
export type InvoicePaymentStatusFilter = "any" | "paid" | "unpaid";

export const getAllInvoices = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string,
  sendStatus: InvoiceSendStatusFilter = "all",
  paymentStatus: InvoicePaymentStatusFilter = "any"
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
    if (sendStatus && sendStatus !== "all") params.set("sendStatus", sendStatus);
    if (paymentStatus && paymentStatus !== "any") params.set("paymentStatus", paymentStatus);
    const response = await authFetch(`${base()}/api/invoices?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch Invoices");
    const json = await response.json();
    return {
      data: json.data ?? [],
      total: json.total ?? 0,
      limit: json.limit ?? limit,
      offset: json.offset ?? offset,
      hasMore: json.hasMore ?? false,
    };
  } catch (error) {
    throw error;
  }
};

export const getArchiveInvoices = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string,
  sendStatus: InvoiceSendStatusFilter = "all",
  paymentStatus: InvoicePaymentStatusFilter = "any"
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
    if (sendStatus && sendStatus !== "all") params.set("sendStatus", sendStatus);
    if (paymentStatus && paymentStatus !== "any") params.set("paymentStatus", paymentStatus);
    const response = await authFetch(`${base()}/api/archive-invoices?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch Invoices");
    const json = await response.json();
    return {
      data: json.data ?? [],
      total: json.total ?? 0,
      limit: json.limit ?? limit,
      offset: json.offset ?? offset,
      hasMore: json.hasMore ?? false,
    };
  } catch (error) {
    throw error;
  }
};

export type PaymentAcknowledgementEmailClientResult = {
  clientId?: number;
  clientName?: string;
  recipientEmail?: string;
  deliveryId?: number;
  brevoEmailMessageId?: string;
  invoiceIds?: number[];
  reason?: string;
  error?: string;
  message?: string;
};

export type PaymentAcknowledgementEmailResult = {
  attempted: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  sent: PaymentAcknowledgementEmailClientResult[];
  skipped: PaymentAcknowledgementEmailClientResult[];
  failed: PaymentAcknowledgementEmailClientResult[];
};

export type UpdateInvoicePaymentStatusData = {
  updatedCount: number;
  invoiceIds: number[];
  isPaid: boolean;
  paidDate: string;
  paymentNotes?: string;
  acknowledgementEmail?: PaymentAcknowledgementEmailResult;
};

export type UpdateInvoicePaymentStatusResponse = {
  message: string;
  data: UpdateInvoicePaymentStatusData;
};

export const updateInvoicePaymentStatus = async (options: {
  invoiceIds: number | number[];
  isPaid: boolean;
  paidDate?: string;
  paymentNotes?: string;
  sendAcknowledgementEmail?: boolean;
}): Promise<UpdateInvoicePaymentStatusResponse> => {
  const response = await authFetch(`${base()}/invoice/payment`, {
    method: "PATCH",
    headers: {
      ...(getAuthHeaders() as Record<string, string>),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to update invoice payment status");
  }
  return {
    message: json.message || "Invoice payment status updated",
    data: json.data,
  };
};

export const getClientsForInvoiceGeneration = async () => {
  const response = await authFetch(`${base()}/invoice/clients`);
  if (!response.ok) throw new Error("Failed to fetch clients for invoice generation");
  const data = await response.json();
  return data.data;
};

export const getPropertiesForInvoiceGeneration = async (clientIds: number[]) => {
  const clientIdsParam = clientIds.join(",");
  const response = await authFetch(
    `${base()}/invoice/properties?clientIds=${clientIdsParam}`
  );
  if (!response.ok) throw new Error("Failed to fetch properties for invoice generation");
  const data = await response.json();
  return data.data;
};

export const generateInvoices = async (options: {
  clientIds: number[];
  propertyAccountNumbers?: string[] | null;
  years?: number[];
  invoiceDefaults?: Record<string, unknown>;
}) => {
  const response = await authFetch(`${base()}/invoice/generate`, {
    method: "POST",
    headers: {
      ...(getAuthHeaders() as Record<string, string>),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to generate invoices");
  }
  return response.json();
};

export const getInvoiceGenerationStats = async (
  clientIds?: number[],
  years?: number[]
) => {
  const params = new URLSearchParams();
  if (clientIds?.length) params.append("clientIds", clientIds.join(","));
  if (years?.length) params.append("years", years.map((y) => y.toString()).join(","));
  const response = await authFetch(`${base()}/invoice/stats?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch invoice generation statistics");
  const data = await response.json();
  return data.data;
};

export type InvoiceSendAttachment = {
  filename: string;
  contentBase64: string;
};

export type InvoiceSendResult = {
  success: boolean;
  clientId: number;
  recipientEmail: string;
  recipientPhone?: string | null;
  emailStatus: string;
  smsStatus: string;
  emailLastEvent?: string;
  brevoEmailMessageId?: string;
  deliveryId?: number;
  warning?: string;
};

export type BulkInvoiceSendFilters = {
  invoiceIds?: number[];
  clientIds?: number[];
  propertyIds?: number[];
  years?: number[];
  accountNumbers?: string[];
  cadCounties?: string[];
  counties?: string[];
  search?: string;
  paymentStatus?: "any" | "paid" | "unpaid";
  minInvoiceAmount?: number;
  maxInvoiceAmount?: number;
  hasEmail?: boolean;
  limit?: number;
};

import type { InvoiceEmailTracking } from "@/utils/invoiceEmailStatus";

export type BulkInvoiceRecipient = {
  clientId: number;
  clientNumber?: string | null;
  clientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  invoiceCount: number;
  totalInvoiceAmount: number;
  invoiceIds: number[];
  years: number[];
  propertyIds: number[];
  propertyNumbers?: string[];
  cadCounties?: string[];
  canSend: boolean;
  skipReason?: string | null;
  lastDelivery?: InvoiceEmailTracking | null;
};

export type BulkInvoiceRecipientsResponse = {
  totalMatchedClients: number;
  totalReturned: number;
  truncated: boolean;
  recipients: BulkInvoiceRecipient[];
};

export type BulkInvoiceAttachmentGroup = {
  clientId: number;
  year?: number;
  attachments: InvoiceSendAttachment[];
  customMessage?: string;
};

export type BulkInvoiceSendResult = {
  clientId: number;
  clientName?: string;
  success: boolean;
  status: "SENT" | "FAILED" | "SKIPPED" | string;
  data?: Pick<
    InvoiceSendResult,
    "deliveryId" | "recipientEmail" | "emailStatus" | "smsStatus"
  >;
  error?: string;
};

export type BulkInvoiceSendResponse = {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    summary: {
      matchedClients: number;
      attempted: number;
      sent: number;
      failed: number;
      skipped: number;
    };
    truncated: boolean;
    results: BulkInvoiceSendResult[];
  };
};

export type InvoiceStoredFile = {
  filename: string;
  storagePath: string;
};

export type InvoiceDelivery = {
  id: number;
  clientId: number;
  year: number;
  recipientEmail: string;
  recipientPhone?: string | null;
  emailStatus: string;
  smsStatus: string;
  emailLastEvent?: string | null;
  emailDeliveredAt?: string | null;
  emailOpenedAt?: string | null;
  emailBounceReason?: string | null;
  emailSentAt?: string | null;
  smsSentAt?: string | null;
  brevoEmailMessageId?: string | null;
  attachmentNames?: string[];
  storedFiles?: InvoiceStoredFile[];
  errorMessage?: string | null;
  createdAt: string;
  emailTracking?: InvoiceEmailTracking | null;
};

export const sendInvoice = async (options: {
  clientId: number;
  attachments: InvoiceSendAttachment[];
  year?: number;
  sendSms?: boolean;
  customMessage?: string;
  /** Addresses for invoices being sent — scopes email subject/body */
  propertyAddresses?: string[];
  invoiceIds?: number[];
  propertyIds?: number[];
}): Promise<{ message: string; data: InvoiceSendResult }> => {
  const response = await authFetch(`${base()}/invoice/send`, {
    method: "POST",
    headers: {
      ...(getAuthHeaders() as Record<string, string>),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || "Failed to send invoice");
  }
  return json;
};

const appendBulkInvoiceFilter = (
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | Array<string | number> | undefined
) => {
  if (value === undefined) return;
  if (Array.isArray(value)) {
    if (value.length > 0) params.set(key, value.join(","));
    return;
  }
  if (typeof value === "string" && value.trim() === "") return;
  params.set(key, String(value));
};

export const getBulkInvoiceRecipients = async (
  filters: BulkInvoiceSendFilters = {}
): Promise<BulkInvoiceRecipientsResponse> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    appendBulkInvoiceFilter(
      params,
      key,
      value as string | number | boolean | Array<string | number> | undefined
    );
  });

  const queryString = params.toString();
  const response = await authFetch(
    `${base()}/invoice/bulk-send/recipients${queryString ? `?${queryString}` : ""}`
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Failed to preview bulk invoice recipients");
  }
  return {
    totalMatchedClients: json.data?.totalMatchedClients ?? 0,
    totalReturned: json.data?.totalReturned ?? 0,
    truncated: json.data?.truncated ?? false,
    recipients: json.data?.recipients ?? [],
  };
};

export const bulkSendInvoices = async (options: {
  filters?: BulkInvoiceSendFilters;
  attachmentsByClient: BulkInvoiceAttachmentGroup[];
  year?: number;
  sendSms?: boolean;
  customMessage?: string;
  limit?: number;
}): Promise<BulkInvoiceSendResponse> => {
  const response = await authFetch(`${base()}/invoice/bulk-send`, {
    method: "POST",
    headers: {
      ...(getAuthHeaders() as Record<string, string>),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Failed to send invoices in bulk");
  }
  return json;
};

export const getInvoiceDeliveries = async (
  clientId: number,
  limit = 20
): Promise<InvoiceDelivery[]> => {
  const params = new URLSearchParams({
    clientId: String(clientId),
    limit: String(limit),
  });
  const response = await authFetch(`${base()}/invoice/deliveries?${params.toString()}`);
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.message || "Failed to fetch invoice delivery history");
  }
  const json = await response.json();
  return json.data?.deliveries ?? [];
};

export const syncInvoiceDeliveryTracking = async (
  deliveryId: number
): Promise<InvoiceEmailTracking> => {
  const response = await authFetch(`${base()}/invoice/deliveries/${deliveryId}/sync-tracking`, {
    method: "POST",
    headers: getAuthHeaders() as Record<string, string>,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Failed to sync delivery tracking");
  }
  return json.data?.emailTracking ?? json.data ?? json;
};

export type SyncDeliveriesFromBrevoResult = {
  totalEligible: number;
  offset: number;
  limit: number;
  attempted: number;
  synced: number;
  failed: number;
  remaining: number;
  hasMore: boolean;
  nextOffset: number | null;
  durationMs: number;
  onlyStale: boolean;
  errors: Array<{ deliveryId: number; clientId?: number; message: string }>;
  results?: Array<{
    deliveryId: number;
    clientId: number;
    success: boolean;
    emailLastEvent?: string;
    error?: string;
  }>;
};

export type SyncDeliveriesFromBrevoOptions = {
  limit?: number;
  offset?: number;
  onlyStale?: boolean;
  includeResults?: boolean;
};

export const syncInvoiceDeliveriesFromBrevo = async (
  options: SyncDeliveriesFromBrevoOptions = {}
): Promise<{ message: string; data: SyncDeliveriesFromBrevoResult }> => {
  const params = new URLSearchParams();
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.offset != null) params.set("offset", String(options.offset));
  if (options.onlyStale) params.set("onlyStale", "true");
  if (options.includeResults) params.set("includeResults", "true");

  const query = params.toString();
  const response = await authFetch(
    `${base()}/invoice/deliveries/sync-tracking${query ? `?${query}` : ""}`,
    {
      method: "POST",
      headers: getAuthHeaders() as Record<string, string>,
    }
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Failed to sync deliveries from Brevo");
  }
  return {
    message: json.message || "Deliveries synced from Brevo",
    data: json.data ?? {
      totalEligible: 0,
      offset: 0,
      limit: options.limit ?? 50,
      attempted: 0,
      synced: 0,
      failed: 0,
      remaining: 0,
      hasMore: false,
      nextOffset: null,
      durationMs: 0,
      onlyStale: Boolean(options.onlyStale),
      errors: [],
    },
  };
};

export const syncAllInvoiceDeliveriesFromBrevo = async (options?: {
  onlyStale?: boolean;
  limit?: number;
  onProgress?: (data: SyncDeliveriesFromBrevoResult) => void;
}): Promise<{
  message: string;
  totals: { synced: number; failed: number; attempted: number; batches: number };
}> => {
  const limit = options?.limit ?? 100;
  const onlyStale = options?.onlyStale ?? false;
  let offset = 0;
  let synced = 0;
  let failed = 0;
  let attempted = 0;
  let batches = 0;
  let lastMessage = "All eligible deliveries synced.";

  while (true) {
    const result = await syncInvoiceDeliveriesFromBrevo({
      limit,
      offset: onlyStale ? 0 : offset,
      onlyStale,
    });
    const data = result.data;
    synced += data.synced;
    failed += data.failed;
    attempted += data.attempted;
    batches += 1;
    lastMessage = result.message;
    options?.onProgress?.(data);

    if (!data.hasMore || data.attempted === 0) break;
    if (onlyStale) continue;
    offset = data.nextOffset ?? offset + limit;
  }

  return {
    message: lastMessage,
    totals: { synced, failed, attempted, batches },
  };
};

export const getInvoiceDeliveryDownloadUrl = async (
  deliveryId: number,
  fileIndex = 0,
  expiresIn = 3600
): Promise<{ url: string; filename: string }> => {
  const params = new URLSearchParams({
    fileIndex: String(fileIndex),
    expiresIn: String(expiresIn),
  });
  const response = await authFetch(
    `${base()}/invoice/deliveries/${deliveryId}/download-url?${params.toString()}`
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || "Could not get download link for this attachment");
  }
  return {
    url: json.url,
    filename: json.filename ?? "invoice.pdf",
  };
};

export const downloadInvoicesCSV = async () => {
  try {
    const response = await authFetch(`${base()}/api/download-invoices-csv`);
    if (!response.ok) throw new Error("Failed to download invoices CSV");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${getFormattedDate()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    // Error surfaced via UI if needed
  }
};
