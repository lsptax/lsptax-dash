import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveClientContingencyDefault,
  resolveInvoiceDueAmount,
} from "./invoiceYearlyData.js";

describe("resolveClientContingencyDefault", () => {
  it("treats 0 as an explicit 0% instead of falling back to 25", () => {
    assert.equal(resolveClientContingencyDefault(0), 0);
    assert.equal(resolveClientContingencyDefault({ contingencyFee: 0 }), 0);
  });

  it("falls back to 25 when client contingency is unset", () => {
    assert.equal(resolveClientContingencyDefault(null), 25);
    assert.equal(resolveClientContingencyDefault(undefined), 25);
    assert.equal(resolveClientContingencyDefault({}), 25);
    assert.equal(resolveClientContingencyDefault({ contingencyFee: null }), 25);
  });
});

describe("resolveInvoiceDueAmount", () => {
  const savingsInvoice = {
    year: 2026,
    noticeAppraisedValue: 100000,
    finalAppraisedValue: 84669.93,
    taxRate: 2.3864,
    contingencyFee: null,
    bppInvoice: "$0",
  };

  it("uses the client 0% default plus the property flat fee on the billing year", () => {
    assert.equal(resolveInvoiceDueAmount(savingsInvoice, 0, "150"), 150);
  });

  it("adds 25% contingency on top of the property flat fee when that is the client default", () => {
    assert.equal(resolveInvoiceDueAmount(savingsInvoice, 25, "150"), 241.46);
  });

  it("uses the property flat fee even when an invoice flat fee is still present", () => {
    assert.equal(
      resolveInvoiceDueAmount(
        { ...savingsInvoice, flatFee: 999, contingencyFee: 0, taxableSavings: 0 },
        0,
        "150.00"
      ),
      150
    );
  });

  it("does not add the property flat fee to older year invoices", () => {
    assert.equal(
      resolveInvoiceDueAmount(
        { year: 2025, flatFee: 999, contingencyFee: 0, taxableSavings: 0 },
        0,
        "150.00"
      ),
      0
    );
  });
});
