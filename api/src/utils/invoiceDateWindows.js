import { calendarDateInTz, BUSINESS_TZ } from "./weekRange.js";
import { normalizeInvoiceDateString } from "./invoiceYearlyData.js";

const PADDED_US_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function pad2(value) {
  return String(Number(value)).padStart(2, "0");
}

function toIso(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseIsoDate(yyyyMmDd) {
  const [y, m, d] = String(yyyyMmDd).split("-").map(Number);
  return { y, m, d };
}

/**
 * Parse an invoice TEXT date to a calendar day, or null if empty/unparseable.
 * Accepts MM/DD/YYYY, M/D/YYYY, and YYYY-MM-DD via normalizeInvoiceDateString.
 */
export function parseInvoiceCalendarDate(value) {
  const normalized = normalizeInvoiceDateString(value);
  if (!normalized) return null;
  const match = PADDED_US_DATE_RE.exec(normalized);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return { y: year, m: month, d: day, iso: toIso(year, month, day) };
}

export function dateInInclusiveRange(parsed, startIso, endIso) {
  if (!parsed?.iso || !startIso || !endIso) return false;
  return parsed.iso >= startIso && parsed.iso <= endIso;
}

export function parsedDateBefore(parsed, isoDate) {
  if (!parsed?.iso || !isoDate) return false;
  return parsed.iso < isoDate;
}

/**
 * Billing/collection windows in America/Chicago.
 * This month / last month / calendar year are full calendar months/years.
 * YTD is Jan 1 through today.
 */
export function getOwnerDateWindows(referenceDate = new Date(), timeZone = BUSINESS_TZ) {
  const todayIso = calendarDateInTz(referenceDate, timeZone);
  const { y, m } = parseIsoDate(todayIso);
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };

  return {
    asOf: todayIso,
    timeZone,
    thisMonth: {
      start: toIso(y, m, 1),
      end: toIso(y, m, lastDayOfMonth(y, m)),
    },
    lastMonth: {
      start: toIso(prev.y, prev.m, 1),
      end: toIso(prev.y, prev.m, lastDayOfMonth(prev.y, prev.m)),
    },
    ytd: {
      start: toIso(y, 1, 1),
      end: todayIso,
    },
    calendarYear: {
      start: toIso(y, 1, 1),
      end: toIso(y, 12, 31),
    },
  };
}
