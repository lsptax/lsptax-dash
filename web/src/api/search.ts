import { authFetch, getApiBaseUrl } from "@/api/client";

export type PortalSearchSectionId = "clients" | "properties" | "prospects";

export type PortalSearchItem = {
  id: number;
  clientId?: number;
  title: string;
  subtitle: string;
  kind: string;
  ownerType: "CLIENT" | "PROSPECT";
};

export type PortalSearchSection = {
  id: PortalSearchSectionId;
  label: string;
  total: number;
  items: PortalSearchItem[];
};

export type PortalSearchResponse = {
  query: string;
  sections: PortalSearchSection[];
};

export async function searchPortal(
  q: string,
  signal?: AbortSignal
): Promise<PortalSearchResponse> {
  const params = new URLSearchParams({ q });
  const response = await authFetch(`${getApiBaseUrl()}/api/search?${params.toString()}`, {
    signal,
  });
  if (!response.ok) throw new Error("Search failed");
  return response.json();
}
