import { calendarDateInTz, BUSINESS_TZ, zonedDateTimeToUtc } from "./weekRange.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;

function firstQuery(value) {
  if (value == null) return "";
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").trim();
}

function listQuery(value) {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const out = [];
  for (const part of raw.flatMap((item) => String(item).split(","))) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function iso(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseIsoParts(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return { y, m, d };
}

function isValidIsoDate(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const { y, m, d } = parseIsoParts(value);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

function isValidMonth(value) {
  if (!MONTH_RE.test(value)) return false;
  const [y, m] = value.split("-").map(Number);
  return m >= 1 && m <= 12 && y >= 1990 && y <= 2100;
}

/**
 * Shared owner report/dashboard query parser (F-16, F-01–F-07).
 * Date filters apply to invoiceDate (billed) or paidDate (collected).
 */
export function parseReportFilters(query = {}) {
  const from = firstQuery(query.from);
  const to = firstQuery(query.to);
  const monthsRaw = listQuery(query.month);
  const calendarYearRaw = firstQuery(query.calendarYear);
  const taxYearRaw = listQuery(query.taxYear);
  const countiesRaw = listQuery(query.county);
  const clientIdRaw = firstQuery(query.clientId);
  const propertyIdRaw = firstQuery(query.propertyId);
  const format = firstQuery(query.format).toLowerCase();

  const errors = [];

  if (from && !isValidIsoDate(from)) errors.push("from must be YYYY-MM-DD");
  if (to && !isValidIsoDate(to)) errors.push("to must be YYYY-MM-DD");
  if (from && to && from > to) errors.push("from must be on or before to");

  const months = [];
  for (const month of monthsRaw) {
    if (!isValidMonth(month)) errors.push("month must be YYYY-MM");
    else months.push(month);
  }
  months.sort();

  let calendarYear = null;
  if (calendarYearRaw) {
    if (!YEAR_RE.test(calendarYearRaw)) errors.push("calendarYear must be YYYY");
    else calendarYear = Number(calendarYearRaw);
  }

  const taxYears = [];
  for (const raw of taxYearRaw) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1990 || n > 2100) {
      errors.push("taxYear must be a 4-digit protest year");
    } else {
      taxYears.push(n);
    }
  }

  let clientId = null;
  if (clientIdRaw) {
    const n = Number(clientIdRaw);
    if (!Number.isInteger(n) || n < 1) errors.push("clientId must be a positive integer");
    else clientId = n;
  }

  let propertyId = null;
  if (propertyIdRaw) {
    const n = Number(propertyIdRaw);
    if (!Number.isInteger(n) || n < 1) errors.push("propertyId must be a positive integer");
    else propertyId = n;
  }

  const counties = countiesRaw.filter((county) => county.toLowerCase() !== "all");

  if (format && format !== "csv" && format !== "json") {
    errors.push("format must be json or csv");
  }

  if (errors.length) {
    const error = new Error(errors.join("; "));
    error.statusCode = 400;
    throw error;
  }

  const month = months.length ? months[months.length - 1] : "";

  return {
    from: from || "",
    to: to || "",
    months,
    month,
    calendarYear,
    taxYears,
    taxYear: taxYears.length === 1 ? taxYears[0] : null,
    counties,
    county: counties.length === 1 ? counties[0] : "",
    clientId,
    propertyId,
    format: format || "json",
  };
}

/** Explicit from/to range. Multiple months span earliest start through latest end. */
export function dateConstraintFromFilters(filters) {
  if (filters?.from || filters?.to) {
    return {
      start: filters.from || "0000-01-01",
      end: filters.to || "9999-12-31",
    };
  }
  const months = filters?.months?.length
    ? [...filters.months].sort()
    : filters?.month
      ? [filters.month]
      : [];
  if (months.length > 1) {
    const [y1, m1] = months[0].split("-").map(Number);
    const [y2, m2] = months[months.length - 1].split("-").map(Number);
    return { start: iso(y1, m1, 1), end: iso(y2, m2, lastDayOfMonth(y2, m2)) };
  }
  return null;
}

/** Selected months (including a single month) bound the property/client roster export. */
export function rosterDateConstraintFromFilters(filters) {
  if (filters?.from || filters?.to) return dateConstraintFromFilters(filters);
  const months = filters?.months?.length
    ? [...filters.months].sort()
    : filters?.month
      ? [filters.month]
      : [];
  if (!months.length) return null;
  const [y1, m1] = months[0].split("-").map(Number);
  const [y2, m2] = months[months.length - 1].split("-").map(Number);
  return { start: iso(y1, m1, 1), end: iso(y2, m2, lastDayOfMonth(y2, m2)) };
}

export function intersectDateRange(windowRange, constraint) {
  if (!windowRange) return null;
  if (!constraint) return windowRange;
  const start = windowRange.start >= constraint.start ? windowRange.start : constraint.start;
  const end = windowRange.end <= constraint.end ? windowRange.end : constraint.end;
  if (start > end) return null;
  return { start, end };
}

/**
 * Month / calendarYear change which "today" the default windows are relative to.
 * from/to do not shift windows; they intersect billed/collected dates.
 */
export function referenceDateFromFilters(filters, now = new Date(), timeZone = BUSINESS_TZ) {
  const todayIso = calendarDateInTz(now, timeZone);
  const today = parseIsoParts(todayIso);

  if (filters?.month && !filters.from && !filters.to) {
    const [y, m] = filters.month.split("-").map(Number);
    const last = iso(y, m, lastDayOfMonth(y, m));
    const asOf = today.y === y && today.m === m && todayIso < last ? todayIso : last;
    return zonedDateTimeToUtc(asOf, 12, 0, 0, 0, timeZone);
  }

  if (filters?.calendarYear != null && !filters.from && !filters.to && !filters.month) {
    const y = filters.calendarYear;
    const last = iso(y, 12, 31);
    const asOf = today.y === y && todayIso < last ? todayIso : last;
    return zonedDateTimeToUtc(asOf, 12, 0, 0, 0, timeZone);
  }

  return now;
}

export function taxYearsFromFilters(filters) {
  if (filters?.taxYears?.length) return filters.taxYears;
  if (filters?.taxYear != null) return [filters.taxYear];
  return [];
}

export function countiesFromFilters(filters) {
  if (filters?.counties?.length) return filters.counties;
  if (filters?.county) return [filters.county];
  return [];
}

export function invoiceMatchesEntityFilters(invoice, filters) {
  if (!filters) return true;
  const taxYears = taxYearsFromFilters(filters);
  if (taxYears.length && !taxYears.includes(Number(invoice.year))) return false;
  if (filters.clientId != null && Number(invoice.clientId) !== filters.clientId) return false;
  if (filters.propertyId != null && Number(invoice.propertyId) !== filters.propertyId) return false;
  const counties = countiesFromFilters(filters);
  if (counties.length) {
    const county = String(invoice.county || "").trim().toLowerCase();
    if (!counties.some((item) => item.toLowerCase() === county)) return false;
  }
  return true;
}
