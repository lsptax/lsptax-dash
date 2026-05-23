import { authFetch, getApiBaseUrl } from "@/api/client";
import {
  DEFAULT_PAGE_SIZE,
  getFormattedDate,
  type PaginatedResponse,
} from "./common";

const base = getApiBaseUrl;

export const getProperties = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string,
  accountType?: string
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
    if (accountType?.trim()) params.set("accountType", accountType.trim());
    const response = await authFetch(`${base()}/api/properties?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch properties");
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

export const getArchiveProperties = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string,
  accountType?: string
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
    if (accountType?.trim()) params.set("accountType", accountType.trim());
    const response = await authFetch(`${base()}/api/archive_properties?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch properties");
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

export const getSingleProperty = async ({ propertyId }: { propertyId: string }) => {
  try {
    const response = await authFetch(`${base()}/api/property?propertyId=${propertyId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) throw new Error("Failed to fetch properties");
    return response.json();
  } catch {
    return null;
  }
};

export const getProspectProperty = async ({ propertyId }: { propertyId: string }) => {
  try {
    const response = await authFetch(`${base()}/api/prospect-property?id=${propertyId}`);
    if (!response.ok) throw new Error("Failed to fetch properties");
    return response.json();
  } catch {
    return [];
  }
};

export const downloadPropertiesCSV = async ({
  accountType,
}: {
  accountType?: string;
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (accountType?.trim()) params.set("accountType", accountType.trim());
    const qs = params.toString();
    const response = await authFetch(
      `${base()}/api/download-properties-csv${qs ? `?${qs}` : ""}`
    );
    if (!response.ok) throw new Error("Failed to download properties CSV");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `properties_${getFormattedDate()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    // Error surfaced via UI if needed
  }
};

export const getProtests = async () => {
  try {
    const response = await authFetch(`${base()}/api/contracts`);
    if (!response.ok) throw new Error("Failed to fetch properties");
    return response.json();
  } catch {
    return [];
  }
};
