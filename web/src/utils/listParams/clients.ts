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

export type AccountTypeFilter = "all" | "real" | "bpp";

export type ClientListParams = {
  search: string;
  accountType: AccountTypeFilter;
  offset: number;
  limit: number;
  archived: boolean;
};

const ACCOUNT_TYPE_VALUES = new Set<string>(["all", "real", "bpp"]);

export const DEFAULT_CLIENT_LIST_PARAMS: ClientListParams = {
  search: "",
  accountType: "all",
  offset: 0,
  limit: 10,
  archived: false,
};

export function parseClientListParams(
  searchParams: URLSearchParams
): ClientListParams {
  return {
    search: parseSearchParam(searchParams),
    accountType: parseEnumParam(
      searchParams,
      "accountType",
      ACCOUNT_TYPE_VALUES,
      DEFAULT_CLIENT_LIST_PARAMS.accountType
    ),
    offset: parseOffsetParam(searchParams),
    limit: parseLimitParam(searchParams),
    archived: parseArchivedParam(searchParams),
  };
}

export function clientListParamsToSearchParams(
  params: ClientListParams
): URLSearchParams {
  const usp = new URLSearchParams();
  appendSearchParam(usp, params.search);
  if (params.accountType !== DEFAULT_CLIENT_LIST_PARAMS.accountType) {
    usp.set("accountType", params.accountType);
  }
  appendPaginationParams(usp, params.offset, params.limit);
  appendArchivedParam(usp, params.archived);
  return usp;
}

export function mergeClientListParams(
  current: URLSearchParams,
  updates: Partial<ClientListParams>
): URLSearchParams {
  return clientListParamsToSearchParams({
    ...parseClientListParams(current),
    ...updates,
  });
}
