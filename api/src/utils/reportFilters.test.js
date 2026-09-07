import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dateConstraintFromFilters,
  intersectDateRange,
  parseReportFilters,
  referenceDateFromFilters,
} from "./reportFilters.js";
import { calendarDateInTz } from "./weekRange.js";
import { getOwnerDateWindows } from "./invoiceDateWindows.js";
import { moneyWindows } from "../services/financialMetrics.js";
import { isOwnerDashboardRole } from "./ownerRoles.js";

describe("owner roles", () => {
  it("allows owner and admin only", () => {
    assert.equal(isOwnerDashboardRole("owner"), true);
    assert.equal(isOwnerDashboardRole("ADMIN"), true);
    assert.equal(isOwnerDashboardRole("client"), false);
    assert.equal(isOwnerDashboardRole(""), false);
  });
});

describe("parseReportFilters", () => {
  it("parses shared dashboard/report query params", () => {
    const filters = parseReportFilters({
      from: "2026-08-01",
      to: "2026-08-31",
      month: "2026-08",
      calendarYear: "2026",
      taxYear: "2025",
      county: "Bexar",
      clientId: "12",
      propertyId: "44",
    });
    assert.equal(filters.from, "2026-08-01");
    assert.equal(filters.to, "2026-08-31");
    assert.equal(filters.month, "2026-08");
    assert.equal(filters.calendarYear, 2026);
    assert.equal(filters.taxYear, 2025);
    assert.equal(filters.county, "Bexar");
    assert.equal(filters.clientId, 12);
    assert.equal(filters.propertyId, 44);
  });

  it("rejects invalid dates and treats county All as empty", () => {
    assert.throws(() => parseReportFilters({ from: "08/01/2026" }), /from must be YYYY-MM-DD/);
    assert.throws(() => parseReportFilters({ from: "2026-09-02", to: "2026-09-01" }), /on or before/);
    assert.equal(parseReportFilters({ county: "All" }).county, "");
  });
});

describe("date filters billed vs collected", () => {
  it("September from/to collects the August invoice paid in September", () => {
    const filters = parseReportFilters({ from: "2026-09-01", to: "2026-09-30" });
    const windows = getOwnerDateWindows(new Date("2026-09-07T18:00:00.000Z"));
    const constraint = dateConstraintFromFilters(filters);
    const invoices = [
      {
        propertyId: 1,
        invoiceDate: "08/15/2026",
        paidDate: "09/03/2026",
        isPaid: true,
        invoiceAmount: 2500,
      },
    ];
    const money = moneyWindows(invoices, windows, constraint);
    assert.equal(money.billedThisMonth, 0);
    assert.equal(money.billedLastMonth, 0);
    assert.equal(money.collectedThisMonth, 2500);
    assert.equal(money.collectedLastMonth, 0);
  });

  it("month filter shifts this-month window to August", () => {
    const filters = parseReportFilters({ month: "2026-08" });
    const ref = referenceDateFromFilters(filters, new Date("2026-09-07T18:00:00.000Z"));
    assert.equal(calendarDateInTz(ref), "2026-08-31");
    const windows = getOwnerDateWindows(ref);
    assert.deepEqual(windows.thisMonth, { start: "2026-08-01", end: "2026-08-31" });
    const invoices = [
      {
        propertyId: 1,
        invoiceDate: "08/15/2026",
        paidDate: "09/03/2026",
        isPaid: true,
        invoiceAmount: 2500,
      },
    ];
    const money = moneyWindows(invoices, windows, dateConstraintFromFilters(filters));
    assert.equal(money.billedThisMonth, 2500);
    assert.equal(money.collectedThisMonth, 0);
  });

  it("intersects ranges without mixing billed and collected fields", () => {
    const intersected = intersectDateRange(
      { start: "2026-09-01", end: "2026-09-30" },
      { start: "2026-09-15", end: "2026-10-15" }
    );
    assert.deepEqual(intersected, { start: "2026-09-15", end: "2026-09-30" });
  });
});
