import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { invoiceToApiDto } from "./invoiceYearlyData.js";
import {
  SAVINGS_KIND,
  ZERO_SAVINGS_KIND,
  bulkRecipientGroupKey,
  isZeroSavingsAmount,
  savingsKindForInvoice,
} from "./zeroSavingsInvoice.js";

describe("isZeroSavingsAmount", () => {
  it("treats zero, blank, and missing savings as $0", () => {
    assert.equal(isZeroSavingsAmount(0), true);
    assert.equal(isZeroSavingsAmount("0"), true);
    assert.equal(isZeroSavingsAmount("0.00"), true);
    assert.equal(isZeroSavingsAmount(null), true);
    assert.equal(isZeroSavingsAmount(undefined), true);
    assert.equal(isZeroSavingsAmount(""), true);
  });

  it("keeps a positive or negative savings amount on the regular invoice email", () => {
    assert.equal(isZeroSavingsAmount(0.01), false);
    assert.equal(isZeroSavingsAmount("1250.50"), false);
    assert.equal(isZeroSavingsAmount(-10), false);
  });
});

describe("savingsKindForInvoice", () => {
  it("splits a client into savings and zero-savings groups", () => {
    assert.equal(savingsKindForInvoice({ taxableSavings: 0 }), ZERO_SAVINGS_KIND);
    assert.equal(savingsKindForInvoice({ taxableSavings: 40 }), SAVINGS_KIND);
    assert.equal(bulkRecipientGroupKey(12, ZERO_SAVINGS_KIND), "12:zero_savings");
    assert.equal(bulkRecipientGroupKey(12, SAVINGS_KIND), "12:savings");
  });

  it("uses recalculated savings when the stored amount is stale", () => {
    const stored = {
      year: 2026,
      taxableSavings: 0,
      noticeAppraisedValue: 100000,
      finalAppraisedValue: 90000,
      taxRate: 2,
      contingencyFee: 25,
    };
    assert.equal(savingsKindForInvoice(stored), ZERO_SAVINGS_KIND);
    assert.equal(savingsKindForInvoice(invoiceToApiDto(stored, 25)), SAVINGS_KIND);
  });
});
