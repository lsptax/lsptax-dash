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
  const flatFeeInvoice = {
    noticeAppraisedValue: 100000,
    finalAppraisedValue: 84669.93,
    taxRate: 2.3864,
    contingencyFee: null,
    flatFee: 150,
    bppInvoice: "$0",
  };

  it("uses the client 0% default plus flat fee when invoice contingency is unset", () => {
    assert.equal(resolveInvoiceDueAmount(flatFeeInvoice, 0), 150);
  });

  it("does not treat unset invoice contingency as 25% when the client default is 0", () => {
    assert.equal(resolveInvoiceDueAmount(flatFeeInvoice, 25), 241.46);
  });
});
