import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getOwnerDateWindows } from "../utils/invoiceDateWindows.js";
import {
  COLLECTED_DEFINITION_V1,
  billedByGroup,
  cashflowByMonth,
  cashflowForMonths,
  collectedByPaidMonth,
  collectedThroughDate,
  collectionPeriod,
  largestUnpaidClients,
  moneyWindows,
  pastDueTotals,
  protestTotals,
  sentInvoiceTotals,
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

describe("expected and collected so far", () => {
  const asOf = "2026-09-07";

  it("sums sent invoices to the cent and leaves unsent invoices out", () => {
    const invoices = [
      invoice({
        id: 1,
        invoiceDate: "08/15/2026",
        invoiceAmount: 1245.67,
        isPaid: false,
      }),
      invoice({
        id: 2,
        propertyId: 11,
        invoiceDate: "09/02/2026",
        invoiceAmount: 10.1,
        isPaid: true,
        paidDate: "09/04/2026",
      }),
      invoice({
        id: 3,
        propertyId: 12,
        invoiceDate: "",
        invoiceAmount: 999,
        isPaid: false,
      }),
    ];
    const sent = sentInvoiceTotals(invoices, { asOfIso: asOf });
    assert.equal(sent.totalExpected, 1255.77);
    assert.equal(sent.stillToCollect, 1245.67);
    assert.equal(sent.sentInvoiceCount, 2);
    assert.equal(sent.unpaidSentCount, 1);
    assert.equal(collectedThroughDate(invoices, { asOfIso: asOf }), 10.1);
  });

  it("puts expected on the invoice month and collected on the paid month", () => {
    const invoices = [
      invoice({
        invoiceDate: "08/15/2026",
        paidDate: "09/03/2026",
        isPaid: true,
        invoiceAmount: 1245.67,
      }),
      invoice({
        id: 2,
        propertyId: 11,
        invoiceDate: "09/01/2026",
        isPaid: false,
        invoiceAmount: 20.33,
      }),
      invoice({
        id: 3,
        propertyId: 12,
        invoiceDate: "10/01/2026",
        isPaid: false,
        invoiceAmount: 50,
      }),
    ];
    assert.deepEqual(cashflowByMonth(invoices, { asOfIso: asOf }), [
      { year: 2026, month: 8, billed: 1245.67, collected: 0, outstanding: 0 },
      { year: 2026, month: 9, billed: 20.33, collected: 1245.67, outstanding: 20.33 },
    ]);
  });

  it("sums every selected month and skips months that were not selected", () => {
    const invoices = [
      invoice({
        invoiceDate: "09/04/2026",
        paidDate: "09/20/2026",
        isPaid: true,
        invoiceAmount: 29646.34,
      }),
      invoice({
        id: 2,
        propertyId: 11,
        invoiceDate: "10/01/2026",
        isPaid: false,
        invoiceAmount: 1017.78,
      }),
      invoice({
        id: 3,
        propertyId: 12,
        invoiceDate: "08/15/2026",
        paidDate: "08/20/2026",
        isPaid: true,
        invoiceAmount: 5000,
      }),
    ];
    const result = cashflowForMonths(invoices, ["2026-09", "2026-10"], "2026-10-02");
    assert.equal(result.billed, 30664.12);
    assert.equal(result.collected, 29646.34);
    assert.deepEqual(
      result.byMonth.map((row) => row.month),
      [9, 10]
    );
    assert.equal(result.byMonth[1].billed, 1017.78);
    assert.equal(result.byMonth[1].collected, 0);
  });

  it("labels collected-so-far as year to date unless a date range is selected", () => {
    const ytd = collectionPeriod({}, windows, null, windows.asOf);
    assert.equal(ytd.label, "YTD · 2026");
    assert.deepEqual(ytd.range, windows.ytd);

    const selected = collectionPeriod(
      { from: "2026-08-01", to: "2026-08-31" },
      windows,
      { start: "2026-08-01", end: "2026-08-31" },
      windows.asOf
    );
    assert.equal(selected.label, "Selected dates");
    assert.deepEqual(selected.range, { start: "2026-08-01", end: "2026-08-31" });
  });

  it("marks a client past due when any unpaid invoice is past its due date", () => {
    const rows = largestUnpaidClients(
      [
        invoice({
          clientId: 1,
          clientName: "Late",
          dueDate: "08/01/2026",
          invoiceAmount: 40,
          isPaid: false,
        }),
        invoice({
          id: 2,
          clientId: 2,
          clientName: "Current",
          dueDate: "12/01/2026",
          invoiceAmount: 10,
          isPaid: false,
        }),
      ],
      10,
      asOf
    );
    assert.equal(rows[0].status, "Past due");
    assert.equal(rows[1].status, "Not due");
  });
});
