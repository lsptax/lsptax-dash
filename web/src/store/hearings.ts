import { authFetch, getApiBaseUrl } from "@/api/client";
import type { Hearing } from "@/types/hearings";
import { DEFAULT_PAGE_SIZE, type PaginatedResponse } from "./common";

const base = getApiBaseUrl;

export const getHearings = async (
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  from?: string,
  to?: string,
  status?: string,
): Promise<PaginatedResponse<Hearing>> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (from?.trim()) params.set("from", from.trim());
  if (to?.trim()) params.set("to", to.trim());
  if (status?.trim()) params.set("status", status.trim());
  const response = await authFetch(`${base()}/api/hearings?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch hearings");
  const json = await response.json();
  return {
    data: json.data ?? [],
    total: json.total ?? 0,
    limit: json.limit ?? limit,
    offset: json.offset ?? offset,
    hasMore: json.hasMore ?? false,
  };
};
