import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePaymentMethod, paymentMethodLabel, requirePaymentMethod } from "./paymentMethod.js";

describe("parsePaymentMethod", () => {
  it("accepts the payment methods used when marking an invoice paid", () => {
    assert.equal(parsePaymentMethod("Zelle"), "ZELLE");
    assert.equal(parsePaymentMethod("cash"), "CASH");
    assert.equal(parsePaymentMethod("Check"), "CHECK");
    assert.equal(parsePaymentMethod("Credit Card"), "CREDIT_CARD");
    assert.equal(parsePaymentMethod("credit_card"), "CREDIT_CARD");
    assert.equal(parsePaymentMethod("Others"), "OTHER");
  });

  it("treats an empty filter as no method", () => {
    assert.equal(parsePaymentMethod(""), null);
    assert.equal(parsePaymentMethod("any"), null);
    assert.equal(parsePaymentMethod("All"), null);
  });

  it("rejects an unknown method", () => {
    assert.equal(parsePaymentMethod("wire"), null);
    assert.throws(
      () => requirePaymentMethod("wire"),
      /paymentMethod must be one of/
    );
  });

  it("labels stored values for display", () => {
    assert.equal(paymentMethodLabel("CREDIT_CARD"), "Credit Card");
    assert.equal(paymentMethodLabel("OTHER"), "Others");
    assert.equal(paymentMethodLabel(null), "");
  });
});
