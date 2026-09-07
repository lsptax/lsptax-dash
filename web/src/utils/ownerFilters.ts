export type OwnerFilters = {
  from?: string;
  to?: string;
  month?: string;
  calendarYear?: string;
  taxYear?: string;
  county?: string;
  clientId?: string;
  propertyId?: string;
};

const KEYS: (keyof OwnerFilters)[] = [
  "from",
  "to",
  "month",
  "calendarYear",
  "taxYear",
  "county",
  "clientId",
  "propertyId",
];

export function emptyOwnerFilters(): OwnerFilters {
  return {};
}

export function ownerFiltersFromSearchParams(params: URLSearchParams): OwnerFilters {
  const filters: OwnerFilters = {};
  for (const key of KEYS) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }
  return filters;
}

export function ownerFiltersToSearchParams(filters: OwnerFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key]?.trim();
    if (value) params.set(key, value);
  }
  return params;
}

export function ownerFiltersToQuery(filters: OwnerFilters): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const value = filters[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

export function hasActiveOwnerFilters(filters: OwnerFilters): boolean {
  return KEYS.some((key) => Boolean(filters[key]?.trim()));
}
