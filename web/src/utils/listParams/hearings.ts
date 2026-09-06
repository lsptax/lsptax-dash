import {
  appendPaginationParams,
  appendSearchParam,
  parseLimitParam,
  parseOffsetParam,
  parseSearchParam,
} from "./common";
import { HEARING_STATUS_OPTIONS } from "@/constants/hearings";

export type HearingListParams = {
  from: string;
  to: string;
  status: string;
  offset: number;
  limit: number;
};

const HEARING_STATUS_VALUES = new Set<string>([
  "",
  ...HEARING_STATUS_OPTIONS.map((option) => option.value),
]);

export const DEFAULT_HEARING_LIST_PARAMS: HearingListParams = {
  from: "",
  to: "",
  status: "",
  offset: 0,
  limit: 10,
};

export function parseHearingListParams(
  searchParams: URLSearchParams
): HearingListParams {
  const status = searchParams.get("status") ?? "";
  return {
    from: parseSearchParam(searchParams, "from"),
    to: parseSearchParam(searchParams, "to"),
    status: HEARING_STATUS_VALUES.has(status) ? status : "",
    offset: parseOffsetParam(searchParams),
    limit: parseLimitParam(searchParams),
  };
}

export function hearingListParamsToSearchParams(
  params: HearingListParams
): URLSearchParams {
  const usp = new URLSearchParams();
  appendSearchParam(usp, params.from, "from");
  appendSearchParam(usp, params.to, "to");
  if (params.status) usp.set("status", params.status);
  appendPaginationParams(usp, params.offset, params.limit);
  return usp;
}

export function mergeHearingListParams(
  current: URLSearchParams,
  updates: Partial<HearingListParams>
): URLSearchParams {
  return hearingListParamsToSearchParams({
    ...parseHearingListParams(current),
    ...updates,
  });
}
