import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toInvoiceExportRow } from "./ownerInvoiceExport.js";

const billingYear = new Date().getFullYear();

describe("toInvoiceExportRow", () => {
  const row = {
    id: 42,
    year: billingYear,
    accountNumber: "ACC-1",
    clientNumber: "C-1",
    bppInvoice: "$25",
    noticeLandValue: 40000,
    noticeImprovementValue: 60000,
    noticeAppraisedValue: 100000,
    finalLandValue: 35000,
    finalImprovementValue: 49669.93,
    finalAppraisedValue: 84669.93,
    taxRate: 2.3864,
    contingencyFee: null,
    invoiceDate: "2026-09-01",
    dueDate: "2026-10-01",
    isPaid: false,
    paidDate: "",
    paymentNotes: "Mail check",
    underLitigation: false,
    underArbitration: true,
    property: {
      accountNumber: "ACC-1",
      nameOnCad: "Sharma",
      propertyAddress: "1 Main",
      cadCounty: "Fort Bend",
      flatFee: "150",
      client: {
        clientNumber: "C-1",
        clientName: "Lavanya Sharma",
        contingencyFee: 25,
      },
    },
  };

  it("exports the values used to calculate the amount and paid status", () => {
    const exported = toInvoiceExportRow(row);
    assert.equal(exported.invoiceNumber, 42);
    assert.equal(exported.taxYear, billingYear);
    assert.equal(exported.clientName, "Lavanya Sharma");
    assert.equal(exported.noticeMarketValue, 100000);
    assert.equal(exported.finalMarketValue, 84669.93);
    assert.equal(exported.marketReduction, 15330.07);
    assert.equal(exported.appraisedReduction, 15330.07);
    assert.equal(exported.taxableSavings, 365.84);
    assert.equal(exported.contingencyFee, 25);
    assert.equal(exported.bppAmount, 25);
    assert.equal(exported.flatFee, 150);
    assert.equal(exported.invoiceAmount, 266.46);
    assert.equal(exported.paid, "No");
    assert.equal(exported.underArbitration, "Yes");
  });

  it("leaves the property flat fee off invoices from other years", () => {
    const exported = toInvoiceExportRow({
      ...row,
      year: billingYear - 1,
      contingencyFee: 0,
      bppInvoice: "0",
    });
    assert.equal(exported.flatFee, 0);
    assert.equal(exported.invoiceAmount, 0);
    assert.equal(exported.paid, "No");
  });

  it("marks a paid invoice", () => {
    const exported = toInvoiceExportRow({
      ...row,
      isPaid: true,
      paidDate: "2026-09-15",
    });
    assert.equal(exported.paid, "Yes");
    assert.equal(exported.paidDate, "2026-09-15");
  });
});
