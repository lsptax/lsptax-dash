/**
 * Canonical portal URLs — kebab-case segments, grouped by area where it helps.
 * Use these helpers everywhere so links and navigates stay consistent.
 */
import {
  DEFAULT_INVOICE_LIST_PARAMS,
  invoiceListParamsToSearchParams,
  type InvoiceListParams,
} from "@/components/portal/invoices/invoiceListSearchParams";
import {
  clientListParamsToSearchParams,
  DEFAULT_CLIENT_LIST_PARAMS,
  type ClientListParams,
} from "@/utils/listParams/clients";
import {
  DEFAULT_PROPERTY_LIST_PARAMS,
  propertyListParamsToSearchParams,
  type PropertyListParams,
} from "@/utils/listParams/properties";
import {
  DEFAULT_HEARING_LIST_PARAMS,
  hearingListParamsToSearchParams,
  type HearingListParams,
} from "@/utils/listParams/hearings";
import {
  DEFAULT_PROSPECT_LIST_PARAMS,
  prospectListParamsToSearchParams,
  type ProspectListParams,
} from "@/utils/listParams/prospects";

export const PORTAL_BASE = "/portal";

export function portalPath(...segments: string[]): string {
  const path = segments.filter(Boolean).join("/");
  return path ? `${PORTAL_BASE}/${path}` : PORTAL_BASE;
}

export function withQuery(
  path: string,
  params: Record<string, string | number | undefined | null>
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && String(v) !== "") usp.set(k, String(v));
  }
  const q = usp.toString();
  return q ? `${path}?${q}` : path;
}

export function withReturnTo(path: string, returnTo?: string | null): string {
  if (!returnTo || !returnTo.startsWith("/portal/") || returnTo.includes("//")) {
    return path;
  }
  const [basePath, existingQuery] = path.split("?");
  const usp = new URLSearchParams(existingQuery ?? "");
  usp.set("returnTo", returnTo);
  const q = usp.toString();
  return q ? `${basePath}?${q}` : basePath;
}

function listPathWithParams<T extends Record<string, unknown>>(
  path: string,
  defaults: T,
  toSearchParams: (params: T) => URLSearchParams,
  params?: Partial<T>
): string {
  if (!params) return path;
  const q = toSearchParams({ ...defaults, ...params } as T).toString();
  return q ? `${path}?${q}` : path;
}

export const routes = {
  dashboard: () => portalPath("dashboard"),
  owner: () => portalPath("owner"),

  reports: () => portalPath("reports"),

  properties: {
    list: (params?: Partial<PropertyListParams>) =>
      listPathWithParams(
        portalPath("properties"),
        DEFAULT_PROPERTY_LIST_PARAMS,
        propertyListParamsToSearchParams,
        params
      ),
    add: () => portalPath("add-property"),
    view: (propertyId?: string | number | null) =>
      propertyId != null && String(propertyId) !== ""
        ? withQuery(portalPath("property"), { propertyId: String(propertyId) })
        : portalPath("property"),
    edit: (propertyId?: string | number | null) =>
      propertyId != null && String(propertyId) !== ""
        ? withQuery(portalPath("edit-properties"), {
            propertyId: String(propertyId),
          })
        : portalPath("edit-properties"),
    aoa: (propertyId?: string | number | null) =>
      propertyId != null && String(propertyId) !== ""
        ? withQuery(portalPath("aoa"), { propertyId: String(propertyId) })
        : portalPath("aoa"),
  },

  hearings: {
    list: (params?: Partial<HearingListParams>) =>
      listPathWithParams(
        portalPath("hearings"),
        DEFAULT_HEARING_LIST_PARAMS,
        hearingListParamsToSearchParams,
        params
      ),
  },

  invoices: {
    list: (params?: Partial<InvoiceListParams>) =>
      listPathWithParams(
        portalPath("invoices"),
        DEFAULT_INVOICE_LIST_PARAMS,
        invoiceListParamsToSearchParams,
        params
      ),
    byClient: (clientId: string | number) =>
      withQuery(portalPath("invoice"), { clientId: String(clientId) }),
    byProperty: (propertyId: string | number) =>
      withQuery(portalPath("invoice"), { propertyId: String(propertyId) }),
  },

  clients: {
    list: (params?: Partial<ClientListParams>) =>
      listPathWithParams(
        portalPath("clients", "list-client"),
        DEFAULT_CLIENT_LIST_PARAMS,
        clientListParamsToSearchParams,
        params
      ),
    add: () => portalPath("clients", "add-client"),
    /** Move / convert prospect → client form */
    moveFromProspect: () => portalPath("clients", "move-from-prospect"),
  },

  client: {
    detail: (clientId: string | number) =>
      withQuery(portalPath("client"), { clientId: String(clientId) }),
    edit: (clientId: string | number) =>
      withQuery(portalPath("edit-client"), { clientId: String(clientId) }),
    contract: (clientId: string | number) =>
      withQuery(portalPath("contract"), { clientId: String(clientId) }),
    addProperty: (clientId: string | number) =>
      withQuery(portalPath("add-property"), { clientId: String(clientId) }),
  },

  prospects: {
    list: (params?: Partial<ProspectListParams>) =>
      listPathWithParams(
        portalPath("prospects", "list-prospect"),
        DEFAULT_PROSPECT_LIST_PARAMS,
        prospectListParamsToSearchParams,
        params
      ),
    add: () => portalPath("prospects", "add-prospect"),
  },

  prospect: {
    detail: (id: string | number) =>
      withQuery(portalPath("prospect"), { id: String(id) }),
    contract: (id: string | number) =>
      withQuery(portalPath("prospect", "contract"), { id: String(id) }),
    previewDocs: (id: string | number) =>
      withQuery(portalPath("prospect", "preview-docs"), { id: String(id) }),
    add: () => portalPath("prospect", "add-prospect"),
    addProperty: (id: string | number) =>
      withQuery(portalPath("prospect", "add-property"), { id: String(id) }),
    property: (id: string | number) =>
      withQuery(portalPath("prospect", "property"), { id: String(id) }),
    aoa: (propertyId: string | number) =>
      withQuery(portalPath("prospect", "aoa"), {
        propertyId: String(propertyId),
      }),
  },

  editProspect: (prospectId: string | number) =>
    withQuery(portalPath("edit-prospect"), { prospectId: String(prospectId) }),

  editProspectProperties: (id: string | number) =>
    withQuery(portalPath("edit-prospect-properties"), { id: String(id) }),

  agentAppointment: () => portalPath("agent"),

  csvUploads: () => portalPath("csv-uploads"),
} as const;

/** TanStack Query meta: skip global QueryCache error toast (page shows its own UI). */
export const QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST = {
  suppressGlobalErrorToast: true,
} as const;
