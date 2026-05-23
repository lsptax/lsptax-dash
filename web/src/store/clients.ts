import { authFetch, getApiBaseUrl } from "@/api/client";
import {
  DEFAULT_PAGE_SIZE,
  getFormattedDate,
  type PaginatedResponse,
} from "./common";

const base = getApiBaseUrl;

export const getClients = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string,
  accountType?: string
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
    if (accountType?.trim()) params.set("accountType", accountType.trim());
    const response = await authFetch(`${base()}/api/clients?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch clients");
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

export const getSingleClient = async ({ clientId }: { clientId?: string }) => {
  try {
    const response = await authFetch(`${base()}/api/client?clientId=${clientId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch clients");
    return response.json();
  } catch {
    return null;
  }
};

export const getSingleProspect = async ({ prospectId }: { prospectId?: string }) => {
  try {
    const response = await authFetch(`${base()}/api/prospect?prospectId=${prospectId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch prospect");
    return response.json();
  } catch {
    return null;
  }
};

export const getArchiveClients = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search?: string,
  accountType?: string
): Promise<PaginatedResponse<unknown>> => {
  try {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search?.trim()) params.set("search", search.trim());
    if (accountType?.trim()) params.set("accountType", accountType.trim());
    const response = await authFetch(`${base()}/api/archive_clients?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch clients");
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

async function downloadCsv(endpoint: string, filenameBase: string) {
  const response = await authFetch(`${base()}${endpoint}`);
  if (!response.ok) throw new Error(`Failed to download ${filenameBase} CSV`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}_${getFormattedDate()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const downloadClientsXlsx = async ({
  search,
  accountType,
  archived,
}: {
  search?: string;
  accountType?: "real" | "bpp";
  archived?: boolean;
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (search?.trim()) params.set("search", search.trim());
    if (accountType) params.set("accountType", accountType);
    if (archived) params.set("archived", "true");
    const qs = params.toString();
    const typeLabel = accountType ? accountType : "all";
    const statusLabel = archived ? "archived" : "active";
    await downloadCsv(
      `/api/download-clients-xlsx${qs ? `?${qs}` : ""}`,
      `clients_${statusLabel}_${typeLabel}`
    );
  } catch {
    // Error surfaced via UI (e.g. toast) if needed
  }
};

/** Back-compat name used across the app. */
export const downloadClientsCSV = async () => downloadClientsXlsx();

export const downloadProspectsCSV = async () => {
  try {
    await downloadCsv("/api/download-prospects-csv", "prospects");
  } catch {
    // Error surfaced via UI if needed
  }
};
