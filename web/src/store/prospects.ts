import { authFetch, getAuthHeaders, getApiBaseUrl } from "@/api/client";
import {
  DEFAULT_PAGE_SIZE,
  type PaginatedResponse,
} from "./common";

const base = getApiBaseUrl;

/** List payloads sometimes omit `status` or send it under another key; keep table filters and cells aligned. */
export function normalizeProspectStatus(raw: Record<string, unknown>): string {
  for (const key of ["status", "prospectStatus", "prospect_status"] as const) {
    const v = raw[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "NOT_CONTACTED";
}

function normalizeProspectListItem(item: unknown): unknown {
  if (item === null || typeof item !== "object") return item;
  const r = item as Record<string, unknown>;
  return { ...r, status: normalizeProspectStatus(r) };
}

export const getProspects = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<PaginatedResponse<unknown>> => {
  try {
    const response = await authFetch(
      `${base()}/api/prospects?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error("Failed to fetch prospects");
    const json = await response.json();
    return {
      data: (json.data ?? []).map(normalizeProspectListItem),
      total: json.total ?? 0,
      limit: json.limit ?? limit,
      offset: json.offset ?? offset,
      hasMore: json.hasMore ?? false,
    };
  } catch (error) {
    throw error;
  }
};

export const getArchiveProspects = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<PaginatedResponse<unknown>> => {
  try {
    const response = await authFetch(
      `${base()}/api/archive-prospects?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error("Failed to fetch prospects");
    const json = await response.json();
    return {
      data: (json.data ?? []).map(normalizeProspectListItem),
      total: json.total ?? 0,
      limit: json.limit ?? limit,
      offset: json.offset ?? offset,
      hasMore: json.hasMore ?? false,
    };
  } catch (error) {
    throw error;
  }
};

export const getPreviewDocuments = async ({ prospectId }: { prospectId: Number }) => {
  const response = await authFetch(`${base()}/action/preview-signed-pdf`, {
    method: "POST",
    headers: {
      ...(getAuthHeaders() as Record<string, string>),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prospectId }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to preview documents");
  }
  return response.json();
};
