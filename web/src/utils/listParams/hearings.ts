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
  client: string;
  property: string;
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
  client: "",
  property: "",
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
    client: parseSearchParam(searchParams, "client").trim(),
    property: parseSearchParam(searchParams, "property").trim(),
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
  appendSearchParam(usp, params.client, "client");
  appendSearchParam(usp, params.property, "property");
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
