import { authFetch, getAuthHeaders, getApiBaseUrl } from "@/api/client";
import {
  DEFAULT_PAGE_SIZE,
  getFormattedDate,
  type PaginatedResponse,
} from "./common";

const base = getApiBaseUrl;

export const getInvoice = async ({ clientId }: { clientId: string }) => {
  try {
    const response = await authFetch(`${base()}/api/invoice/${clientId}`);
    if (!response.ok) throw new Error("Failed to fetch Invoices");
    return response.json();
  } catch {
    return [];
  }
};

export const getInvoiceByPropertyId = async ({ propertyId }: { propertyId: string }) => {
  try {
    const response = await authFetch(`${base()}/api/invoice_prop?propertyId=${propertyId}`);
    if (!response.ok) throw new Error("Failed to fetch Invoices");
    return response.json();
  } catch {
    return [];
  }
};

export const getAllInvoices = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
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
  search?: string
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
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

export const getClientsForInvoiceGeneration = async () => {
  const response = await authFetch(`${base()}/invoice/clients`);
  if (!response.ok) throw new Error("Failed to fetch clients for invoice generation");
  const data = await response.json();
  return data.data;
};

export const getPropertiesForInvoiceGeneration = async (clientNumbers: string[]) => {
  const clientNumbersParam = clientNumbers.join(",");
  const response = await authFetch(
    `${base()}/invoice/properties?clientNumbers=${clientNumbersParam}`
  );
  if (!response.ok) throw new Error("Failed to fetch properties for invoice generation");
  const data = await response.json();
  return data.data;
};

export const generateInvoices = async (options: {
  clientNumbers: string[];
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
  clientNumbers?: string[],
  years?: number[]
) => {
  const params = new URLSearchParams();
  if (clientNumbers?.length) params.append("clientNumbers", clientNumbers.join(","));
  if (years?.length) params.append("years", years.map((y) => y.toString()).join(","));
  const response = await authFetch(`${base()}/invoice/stats?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch invoice generation statistics");
  const data = await response.json();
  return data.data;
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
