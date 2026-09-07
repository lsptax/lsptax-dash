import { authFetch, getApiBaseUrl } from "@/api/client";
import type { OwnerFilters } from "@/utils/ownerFilters";
import { ownerFiltersToQuery } from "@/utils/ownerFilters";

export type OwnerDashboardStats = {
  asOf: string;
  timeZone: string;
  collectedDefinition: string;
  billedThisMonth: number;
  billedLastMonth: number;
  billedYtd: number;
  billedCalendarYear: number;
  collectedThisMonth: number;
  collectedLastMonth: number;
  collectedYtd: number;
  collectedCalendarYear: number;
  collectionRate: number | null;
  outstandingReceivables: number;
  pastDueReceivables: number;
  activeProperties: number;
  propertiesInvoiced: number;
  propertiesInvoicedThisMonth: number;
  propertiesInvoicedYtd: number;
  paidInvoiceCount: number;
  unpaidInvoiceCount: number;
  pastDueInvoiceCount: number;
  propertiesProtested: number;
  averageReduction: number | null;
  totalValueReductions: number;
  totalTaxSavings: number;
  filters?: Record<string, string | number | null>;
};

export type OwnerDashboardOptions = {
  taxYears: number[];
  counties: string[];
};

export type BilledGroup = {
  billed: number;
  invoiceCount: number;
  taxYear?: number;
  county?: string;
  clientId?: number;
  clientName?: string;
  label?: string;
};

export type UnpaidClientRow = {
  clientId: number;
  clientName: string;
  clientNumber: string;
  unpaidAmount: number;
  unpaidInvoiceCount: number;
};

function withFilters(path: string, filters: OwnerFilters, extra?: Record<string, string>) {
  const url = new URL(path, "http://local.invalid");
  const query = { ...ownerFiltersToQuery(filters), ...extra };
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  return `${getApiBaseUrl()}${url.pathname}${url.search}`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(path);
  if (res.status === 403) {
    throw new Error("You do not have access to the owner dashboard.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.message === "string" ? body.message : `Request failed (${res.status})`
    );
  }
  return res.json() as Promise<T>;
}

export async function getOwnerDashboard(
  filters: OwnerFilters = {}
): Promise<OwnerDashboardStats> {
  return getJson(withFilters("/api/dashboard/owner", filters));
}

export async function getOwnerDashboardOptions(): Promise<OwnerDashboardOptions> {
  return getJson(`${getApiBaseUrl()}/api/dashboard/owner/options`);
}

export async function getBilledReport(
  filters: OwnerFilters = {},
  groupBy?: string
): Promise<{ groups?: BilledGroup[]; billedYtd?: number }> {
  return getJson(withFilters("/report/billed", filters, groupBy ? { groupBy } : {}));
}

export async function getCollectedReport(
  filters: OwnerFilters = {}
): Promise<{ byMonth?: { year: number; month: number; collected: number }[] }> {
  return getJson(withFilters("/report/collected", filters));
}

export async function getUnpaidReport(
  filters: OwnerFilters = {}
): Promise<{
  totalUnpaid: number;
  unpaidInvoiceCount: number;
  unpaidClientCount: number;
  largestOutstandingClients: UnpaidClientRow[];
}> {
  return getJson(withFilters("/report/unpaid", filters, { view: "largest" }));
}

export async function getReductionsReport(
  filters: OwnerFilters = {}
): Promise<{
  totalValueReductions: number;
  byCounty?: {
    county: string;
    totalValueReductions: number;
    totalTaxSavings: number;
    propertiesProtested: number;
  }[];
}> {
  return getJson(withFilters("/report/reductions", filters));
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export async function downloadOwnerReportCsv(
  kind: "billed" | "collected" | "unpaid" | "reductions",
  filters: OwnerFilters = {},
  extra?: Record<string, string>
): Promise<void> {
  const res = await authFetch(withFilters(`/report/${kind}`, filters, { format: "csv", ...extra }));
  if (res.status === 403) throw new Error("You do not have access to owner reports.");
  if (!res.ok) throw new Error(`Failed to download ${kind} report (${res.status})`);
  const blob = await res.blob();
  const filename = filenameFromDisposition(
    res.headers.get("content-disposition"),
    `report-${kind}.csv`
  );
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
