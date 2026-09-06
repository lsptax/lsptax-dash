import {
  appendArchivedParam,
  appendPaginationParams,
  appendSearchParam,
  parseArchivedParam,
  parseEnumParam,
  parseLimitParam,
  parseOffsetParam,
  parseSearchParam,
} from "./common";
import type { AccountTypeFilter } from "./clients";
export type { AccountTypeFilter } from "./clients";

export type PropertyListParams = {
  search: string;
  accountType: AccountTypeFilter;
  offset: number;
  limit: number;
  archived: boolean;
};

const ACCOUNT_TYPE_VALUES = new Set<string>(["all", "real", "bpp"]);

export const DEFAULT_PROPERTY_LIST_PARAMS: PropertyListParams = {
  search: "",
  accountType: "all",
  offset: 0,
  limit: 10,
  archived: false,
};

export function parsePropertyListParams(
  searchParams: URLSearchParams
): PropertyListParams {
  return {
    search: parseSearchParam(searchParams),
    accountType: parseEnumParam(
      searchParams,
      "accountType",
      ACCOUNT_TYPE_VALUES,
      DEFAULT_PROPERTY_LIST_PARAMS.accountType
    ),
    offset: parseOffsetParam(searchParams),
    limit: parseLimitParam(searchParams),
    archived: parseArchivedParam(searchParams),
  };
}

export function propertyListParamsToSearchParams(
  params: PropertyListParams
): URLSearchParams {
  const usp = new URLSearchParams();
  appendSearchParam(usp, params.search);
  if (params.accountType !== DEFAULT_PROPERTY_LIST_PARAMS.accountType) {
    usp.set("accountType", params.accountType);
  }
  appendPaginationParams(usp, params.offset, params.limit);
  appendArchivedParam(usp, params.archived);
  return usp;
}

export function mergePropertyListParams(
  current: URLSearchParams,
  updates: Partial<PropertyListParams>
): URLSearchParams {
  return propertyListParamsToSearchParams({
    ...parsePropertyListParams(current),
    ...updates,
  });
}
