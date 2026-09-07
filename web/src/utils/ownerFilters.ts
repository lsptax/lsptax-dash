export type OwnerFilters = {
  from?: string;
  to?: string;
  month?: string[];
  calendarYear?: string;
  taxYear?: string[];
  county?: string[];
  clientId?: string;
  propertyId?: string;
};

const SCALAR_KEYS = ["from", "to", "calendarYear", "clientId", "propertyId"] as const;
const LIST_KEYS = ["month", "taxYear", "county"] as const;
const OWNER_FILTER_TZ = "America/Chicago";

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function chicagoCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: OWNER_FILTER_TZ }).format(now);
}

export function currentOwnerMonth(now = new Date()): string {
  return chicagoCalendarDate(now).slice(0, 7);
}

export function currentOwnerTaxYear(now = new Date()): string {
  return chicagoCalendarDate(now).slice(0, 4);
}

export function defaultOwnerFilters(now = new Date()): OwnerFilters {
  return {
    month: [currentOwnerMonth(now)],
    taxYear: [currentOwnerTaxYear(now)],
  };
}

export function emptyOwnerFilters(): OwnerFilters {
  return defaultOwnerFilters();
}

export function allTimeOwnerFilters(): OwnerFilters {
  return {};
}

function hasOwnerFilterParams(params: URLSearchParams): boolean {
  return [...SCALAR_KEYS, ...LIST_KEYS].some((key) => params.has(key));
}

export function shouldApplyOwnerFilterDefaults(params: URLSearchParams): boolean {
  if (params.get("allTime") === "1") return false;
  return !hasOwnerFilterParams(params);
}

export function ownerFiltersFromSearchParams(params: URLSearchParams): OwnerFilters {
  if (params.get("allTime") === "1") return allTimeOwnerFilters();
  if (!hasOwnerFilterParams(params)) return defaultOwnerFilters();

  const filters: OwnerFilters = {};
  for (const key of SCALAR_KEYS) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }
  for (const key of LIST_KEYS) {
    const values = uniqueTrimmed(params.getAll(key).flatMap((value) => value.split(",")));
    if (values.length) filters[key] = values;
  }
  return filters;
}

export function ownerFiltersToSearchParams(filters: OwnerFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of SCALAR_KEYS) {
    const value = filters[key]?.trim();
    if (value) params.set(key, value);
  }
  for (const key of LIST_KEYS) {
    for (const value of uniqueTrimmed(filters[key] ?? [])) {
      params.append(key, value);
    }
  }
  if (![...params.keys()].length) params.set("allTime", "1");
  return params;
}

export function hasActiveOwnerFilters(filters: OwnerFilters): boolean {
  return (
    SCALAR_KEYS.some((key) => Boolean(filters[key]?.trim())) ||
    LIST_KEYS.some((key) => (filters[key] ?? []).length > 0)
  );
}
