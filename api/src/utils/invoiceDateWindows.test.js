import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dateInInclusiveRange,
  getOwnerDateWindows,
  parseInvoiceCalendarDate,
  parsedDateBefore,
} from "./invoiceDateWindows.js";

describe("parseInvoiceCalendarDate", () => {
  it("parses zero-padded MM/DD/YYYY", () => {
    assert.deepEqual(parseInvoiceCalendarDate("08/15/2026"), {
      y: 2026,
      m: 8,
      d: 15,
      iso: "2026-08-15",
    });
  });

  it("parses unpadded M/D/YYYY via normalizeInvoiceDateString", () => {
    assert.equal(parseInvoiceCalendarDate("8/15/2026")?.iso, "2026-08-15");
  });

  it("parses ISO YYYY-MM-DD", () => {
    assert.equal(parseInvoiceCalendarDate("2026-08-15")?.iso, "2026-08-15");
  });

  it("returns null for empty, unparseable, and invalid calendar dates", () => {
    assert.equal(parseInvoiceCalendarDate(""), null);
    assert.equal(parseInvoiceCalendarDate(null), null);
    assert.equal(parseInvoiceCalendarDate("not-a-date"), null);
    assert.equal(parseInvoiceCalendarDate("02/31/2026"), null);
  });
});

describe("getOwnerDateWindows", () => {
  it("uses America/Chicago calendar dates and full month/year plus YTD through today", () => {
    const windows = getOwnerDateWindows(new Date("2026-09-07T18:00:00.000Z"));
    assert.equal(windows.timeZone, "America/Chicago");
    assert.equal(windows.asOf, "2026-09-07");
    assert.deepEqual(windows.thisMonth, { start: "2026-09-01", end: "2026-09-30" });
    assert.deepEqual(windows.lastMonth, { start: "2026-08-01", end: "2026-08-31" });
    assert.deepEqual(windows.ytd, { start: "2026-01-01", end: "2026-09-07" });
    assert.deepEqual(windows.calendarYear, { start: "2026-01-01", end: "2026-12-31" });
  });
});

describe("date range helpers", () => {
  it("includes start and end dates", () => {
    const parsed = parseInvoiceCalendarDate("08/15/2026");
    assert.equal(dateInInclusiveRange(parsed, "2026-08-01", "2026-08-31"), true);
    assert.equal(dateInInclusiveRange(parsed, "2026-09-01", "2026-09-30"), false);
    assert.equal(dateInInclusiveRange(null, "2026-08-01", "2026-08-31"), false);
  });

  it("treats due dates on asOf as not past due", () => {
    const due = parseInvoiceCalendarDate("09/07/2026");
    assert.equal(parsedDateBefore(due, "2026-09-07"), false);
    assert.equal(parsedDateBefore(due, "2026-09-08"), true);
  });
});
