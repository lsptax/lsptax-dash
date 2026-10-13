import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveInvoiceStatus,
  parseInvoiceStatus,
  paymentWriteData,
  statusAfterIssue,
} from "./invoiceStatus.js";
import { parseProtestStatus, protestCaseBuckets, summarizeProtestCases } from "./protestTracking.js";
import { parsePropertyType } from "./propertyClassification.js";
import { buildInvoicePatchFromYearlyData } from "./invoiceYearlyData.js";

describe("invoice status", () => {
  it("parses the six reporting statuses", () => {
    assert.equal(parseInvoiceStatus("Past Due").value, "PAST_DUE");
    assert.equal(parseInvoiceStatus("written off").value, "WRITTEN_OFF");
    assert.equal(parseInvoiceStatus("nope").ok, false);
  });

  it("keeps a paid invoice paid when status is still the draft default", () => {
    assert.equal(
      effectiveInvoiceStatus({ status: "DRAFT", isPaid: true, paidDate: "09/01/2026" }),
      "PAID"
    );
    assert.equal(effectiveInvoiceStatus({ isPaid: true }), "PAID");
  });

  it("treats a sent invoice as past due after the due date", () => {
    const status = effectiveInvoiceStatus(
      { status: "SENT", dueDate: "10/01/2026" },
      new Date(2026, 9, 13)
    );
    assert.equal(status, "PAST_DUE");
    assert.equal(
      effectiveInvoiceStatus({ status: "VOIDED", dueDate: "10/01/2026" }, new Date(2026, 9, 13)),
      "VOIDED"
    );
  });

  it("keeps paid and closed rows aligned when payment is toggled", () => {
    assert.deepEqual(paymentWriteData(true, { status: "SENT" }, "10/13/2026"), {
      isPaid: true,
      status: "PAID",
      paidDate: "10/13/2026",
    });
    assert.equal(
      paymentWriteData(false, { status: "PAID", invoiceDate: "09/01/2026" }, "").status,
      "SENT"
    );
    assert.equal(paymentWriteData(false, { status: "VOIDED" }, "").status, "VOIDED");
  });

  it("moves a draft to sent when the invoice is issued", () => {
    assert.equal(statusAfterIssue("DRAFT"), "SENT");
    assert.equal(statusAfterIssue("WRITTEN_OFF"), "WRITTEN_OFF");
    assert.equal(statusAfterIssue("DRAFT", { isPaid: true }), "PAID");
  });
});

describe("protest tracking", () => {
  it("counts completed drafts as awaiting invoice", () => {
    const summary = summarizeProtestCases([
      { protestStatus: "PENDING", protestDate: "05/01/2026" },
      { protestStatus: "RESULTS_PENDING" },
      { protestStatus: "COMPLETED", status: "DRAFT", isPaid: false },
      { protestStatus: "COMPLETED", status: "SENT", isPaid: false },
      { protestDate: "04/01/2026" },
    ]);
    assert.equal(summary.protested, 5);
    assert.equal(summary.pending, 2);
    assert.equal(summary.resultsPending, 1);
    assert.equal(summary.completed, 2);
    assert.equal(summary.awaitingInvoice, 1);
  });

  it("clears protest status when the year was not protested", () => {
    assert.equal(parseProtestStatus("").value, null);
    assert.equal(parseProtestStatus("results pending").value, "RESULTS_PENDING");
    assert.equal(protestCaseBuckets({}).protested, false);
  });
});

describe("property classification", () => {
  it("accepts the four property types", () => {
    assert.equal(parsePropertyType("commercial").value, "COMMERCIAL");
    assert.equal(parsePropertyType("").value, null);
    assert.equal(parsePropertyType("industrial").ok, false);
  });
});

describe("yearly invoice patch", () => {
  it("stores protest outcome and voided status on the tax year", () => {
    const patch = buildInvoicePatchFromYearlyData(
      {
        protestStatus: "COMPLETED",
        protestCompletedDate: "8/1/2026",
        protestResultDate: "2026-08-15",
        status: "Voided",
        noticeLandValue: 0,
        noticeImprovementValue: 0,
        noticeAppraisedValue: 0,
        finalLandValue: 0,
        finalImprovementValue: 0,
        finalAppraisedValue: 0,
        taxRate: 0,
      },
      { status: "SENT", isPaid: false, year: 2026 },
      25
    );
    assert.equal(patch.protestStatus, "COMPLETED");
    assert.equal(patch.protestCompletedDate, "08/01/2026");
    assert.equal(patch.protestResultDate, "08/15/2026");
    assert.equal(patch.status, "VOIDED");
    assert.equal(patch.isPaid, false);
    assert.equal(patch.paidDate, "");
  });
});
