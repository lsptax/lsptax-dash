export function parseSearchParam(
  searchParams: URLSearchParams,
  key = "search"
): string {
  return searchParams.get(key) ?? "";
}

export function parseOffsetParam(searchParams: URLSearchParams): number {
  const offset = Number(searchParams.get("offset") ?? "0");
  return Number.isFinite(offset) && offset >= 0 ? offset : 0;
}

export function parseLimitParam(
  searchParams: URLSearchParams,
  defaultLimit = 10
): number {
  const limit = Number(searchParams.get("limit") ?? String(defaultLimit));
  return Number.isFinite(limit) && limit > 0 ? limit : defaultLimit;
}

export function parseArchivedParam(searchParams: URLSearchParams): boolean {
  return searchParams.get("archived") === "true";
}

export function parseEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: Set<string>,
  defaultValue: T
): T {
  const value = searchParams.get(key);
  return allowed.has(value ?? "") ? (value as T) : defaultValue;
}

export function appendSearchParam(
  usp: URLSearchParams,
  search: string,
  key = "search"
): void {
  if (search) usp.set(key, search);
}

export function appendPaginationParams(
  usp: URLSearchParams,
  offset: number,
  limit: number,
  defaultLimit = 10
): void {
  if (offset > 0) usp.set("offset", String(offset));
  if (limit !== defaultLimit) usp.set("limit", String(limit));
}

export function appendArchivedParam(
  usp: URLSearchParams,
  archived: boolean
): void {
  if (archived) usp.set("archived", "true");
}
