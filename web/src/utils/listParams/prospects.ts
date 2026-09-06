import {
  appendArchivedParam,
  appendPaginationParams,
  appendSearchParam,
  parseArchivedParam,
  parseLimitParam,
  parseOffsetParam,
  parseSearchParam,
} from "./common";

export type ProspectListParams = {
  search: string;
  status: string;
  offset: number;
  limit: number;
  archived: boolean;
};

const PROSPECT_STATUS_VALUES = new Set<string>([
  "",
  "NOT_CONTACTED",
  "CONTACTED",
  "IN_PROGRESS",
  "SIGNED",
]);

export const DEFAULT_PROSPECT_LIST_PARAMS: ProspectListParams = {
  search: "",
  status: "",
  offset: 0,
  limit: 10,
  archived: false,
};

export function parseProspectListParams(
  searchParams: URLSearchParams
): ProspectListParams {
  const status = searchParams.get("status") ?? "";
  return {
    search: parseSearchParam(searchParams),
    status: PROSPECT_STATUS_VALUES.has(status) ? status : "",
    offset: parseOffsetParam(searchParams),
    limit: parseLimitParam(searchParams),
    archived: parseArchivedParam(searchParams),
  };
}

export function prospectListParamsToSearchParams(
  params: ProspectListParams
): URLSearchParams {
  const usp = new URLSearchParams();
  appendSearchParam(usp, params.search);
  if (params.status) usp.set("status", params.status);
  appendPaginationParams(usp, params.offset, params.limit);
  appendArchivedParam(usp, params.archived);
  return usp;
}

export function mergeProspectListParams(
  current: URLSearchParams,
  updates: Partial<ProspectListParams>
): URLSearchParams {
  return prospectListParamsToSearchParams({
    ...parseProspectListParams(current),
    ...updates,
  });
}
