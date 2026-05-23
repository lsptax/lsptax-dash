/**
 * Canonical portal URLs — kebab-case segments, grouped by area where it helps.
 * Use these helpers everywhere so links and navigates stay consistent.
 */
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

export const routes = {
  dashboard: () => portalPath("dashboard"),

  reports: () => portalPath("reports"),

  properties: {
    list: () => portalPath("properties"),
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
    list: () => portalPath("hearings"),
  },

  invoices: {
    list: () => portalPath("invoices"),
    byClient: (clientId: string | number) =>
      withQuery(portalPath("invoice"), { clientId: String(clientId) }),
  },

  clients: {
    list: () => portalPath("clients", "list-client"),
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
    list: () => portalPath("prospects", "list-prospect"),
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
