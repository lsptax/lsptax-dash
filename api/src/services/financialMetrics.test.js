import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getOwnerDateWindows } from "../utils/invoiceDateWindows.js";
import {
  COLLECTED_DEFINITION_V1,
  billedByGroup,
  collectedByPaidMonth,
  largestUnpaidClients,
  moneyWindows,
  pastDueTotals,
  protestTotals,
  unpaidTotals,
} from "./financialMetrics.js";

const windows = getOwnerDateWindows(new Date("2026-09-07T18:00:00.000Z"));

function invoice(overrides) {
  return {
    id: 1,
    propertyId: 10,
    year: 2026,
    invoiceDate: "",
    paidDate: "",
    dueDate: "",
    invoiceAmount: 1000,
    isPaid: false,
    appraisedReduction: 0,
    taxableSavings: 0,
    county: "Bexar",
    clientId: 5,
    clientName: "Acme",
    clientNumber: "100",
    accountNumber: "A1",
    ...overrides,
  };
}

describe("billed vs collected v1", () => {
  it("keeps billed on invoiceDate and collected on paidDate (August billed, September collected)", () => {
    const invoices = [
      invoice({
        invoiceDate: "08/15/2026",
        paidDate: "09/03/2026",
        isPaid: true,
        invoiceAmount: 2500,
      }),
    ];
    const money = moneyWindows(invoices, windows);

    assert.equal(COLLECTED_DEFINITION_V1, "full_pay_on_paid_date");
    assert.equal(money.billedThisMonth, 0);
    assert.equal(money.billedLastMonth, 2500);
    assert.equal(money.billedYtd, 2500);
    assert.equal(money.collectedThisMonth, 2500);
    assert.equal(money.collectedLastMonth, 0);
    assert.equal(money.collectedYtd, 2500);
    assert.equal(money.collectionRate, 1);
    assert.equal(money.propertiesInvoicedThisMonth, 0);
    assert.equal(money.propertiesInvoicedYtd, 1);
  });

  it("does not treat unpaid invoices as collected even if paidDate is set", () => {
    const invoices = [
      invoice({
        invoiceDate: "08/15/2026",
        paidDate: "09/03/2026",
        isPaid: false,
        invoiceAmount: 2500,
      }),
    ];
    const money = moneyWindows(invoices, windows);
    assert.equal(money.collectedThisMonth, 0);
    assert.equal(unpaidTotals(invoices).totalUnpaid, 2500);
  });

  it("excludes unparseable dates from month grouping", () => {
    const invoices = [
      invoice({
        id: 1,
        invoiceDate: "not-a-date",
        paidDate: "09/03/2026",
        isPaid: true,
        invoiceAmount: 100,
      }),
      invoice({
        id: 2,
        propertyId: 11,
        invoiceDate: "08/15/2026",
        paidDate: "bogus",
        isPaid: true,
        invoiceAmount: 200,
      }),
    ];
    const money = moneyWindows(invoices, windows);
    assert.equal(money.billedLastMonth, 200);
    assert.equal(money.billedThisMonth, 0);
    assert.equal(money.collectedThisMonth, 100);
    assert.equal(money.collectedLastMonth, 0);
    assert.deepEqual(collectedByPaidMonth(invoices), [
      { year: 2026, month: 9, collected: 100 },
    ]);
  });
});

describe("AR and protest totals", () => {
  it("counts past due only when unpaid and dueDate is before asOf", () => {
    const invoices = [
      invoice({ id: 1, dueDate: "09/01/2026", invoiceAmount: 100, isPaid: false }),
      invoice({ id: 2, dueDate: "09/07/2026", invoiceAmount: 200, isPaid: false }),
      invoice({
        id: 3,
        dueDate: "08/01/2026",
        invoiceAmount: 50,
        isPaid: true,
      }),
      invoice({ id: 4, dueDate: "not-a-date", invoiceAmount: 75, isPaid: false }),
    ];
    const pastDue = pastDueTotals(invoices, windows.asOf);
    assert.equal(pastDue.pastDueReceivables, 100);
    assert.equal(pastDue.pastDueInvoiceCount, 1);
  });

  it("ranks largest unpaid clients and groups billed by tax year", () => {
    const invoices = [
      invoice({
        id: 1,
        clientId: 1,
        clientName: "Big",
        invoiceDate: "08/01/2026",
        invoiceAmount: 800,
        year: 2025,
      }),
      invoice({
        id: 2,
        propertyId: 11,
        clientId: 1,
        clientName: "Big",
        invoiceDate: "08/02/2026",
        invoiceAmount: 200,
        year: 2026,
      }),
      invoice({
        id: 3,
        propertyId: 12,
        clientId: 2,
        clientName: "Small",
        invoiceDate: "08/03/2026",
        invoiceAmount: 50,
        year: 2026,
      }),
    ];
    const largest = largestUnpaidClients(invoices, 10);
    assert.equal(largest[0].clientId, 1);
    assert.equal(largest[0].unpaidAmount, 1000);
    const byYear = billedByGroup(invoices, "taxYear");
    const y2026 = byYear.find((row) => row.taxYear === 2026);
    const y2025 = byYear.find((row) => row.taxYear === 2025);
    assert.equal(y2026.billed, 250);
    assert.equal(y2025.billed, 800);
  });

  it("averages appraised reductions across year-rows", () => {
    const invoices = [
      invoice({ propertyId: 1, appraisedReduction: 100, taxableSavings: 10 }),
      invoice({ id: 2, propertyId: 1, year: 2025, appraisedReduction: 50, taxableSavings: 5 }),
    ];
    const protest = protestTotals(invoices);
    assert.equal(protest.propertiesProtested, 1);
    assert.equal(protest.totalValueReductions, 150);
    assert.equal(protest.averageReduction, 75);
    assert.equal(protest.totalTaxSavings, 15);
  });
});
