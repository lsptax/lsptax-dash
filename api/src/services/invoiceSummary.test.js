import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInvoiceSummary } from "./invoiceSummary.js";

const year = 2024;

const client = {
  id: 7,
  clientNumber: "1501",
  clientName: "Anif Momin",
  typeOfAcct: "Real",
  mailingAddress: null,
  mailingAddressCityTxZip: null,
};

function invoice(id, propertyId, overrides = {}) {
  return {
    id,
    year,
    propertyId,
    noticeLandValue: 40000,
    noticeImprovementValue: 60000,
    noticeAppraisedValue: 100000,
    finalLandValue: 35000,
    finalImprovementValue: 49669.93,
    finalAppraisedValue: 84669.93,
    taxRate: 2.3864,
    contingencyFee: null,
    bppInvoice: "0",
    underArbitration: false,
    property: {
      id: propertyId,
      accountNumber: `R${propertyId}`,
      propertyAddress: `${propertyId} Main St, Sugar Land, TX 77479`,
      cadCounty: "Fort Bend",
      flatFee: null,
      mailingAddress: "4803 Knights Branch DR",
      mailingAddressCityTxZip: "Sugar Land, TX 77479-5337",
    },
    ...overrides,
  };
}

describe("buildInvoiceSummary", () => {
  it("builds one calculated row per property ordered by property and totals the fees", () => {
    const summary = buildInvoiceSummary(
      client,
      [invoice(11, 2, { isPaid: true }), invoice(10, 1)],
      year,
      25
    );

    assert.deepEqual(
      summary.rows.map((row) => row.accountNumber),
      ["R1", "R2"]
    );
    const [row] = summary.rows;
    assert.equal(row.county, "Fort Bend");
    assert.equal(row.noticeMarketValue, 100000);
    assert.equal(row.finalMarketValue, 84669.93);
    assert.equal(row.marketReduction, 15330.07);
    assert.equal(row.taxableSavings, 365.84);
    assert.equal(row.contingencyFee, 25);
    assert.equal(row.invoiceAmount, 91.46);
    assert.equal(row.paid, false);
    assert.equal(summary.rows[1].paid, true);
    assert.equal(summary.total, 182.92);
  });

  it("falls back to a property mailing address when the client has none", () => {
    const summary = buildInvoiceSummary(client, [invoice(10, 1)], year, 25);
    assert.equal(summary.client.clientNumber, "1501");
    assert.equal(summary.client.typeOfAcct, "Real");
    assert.equal(summary.client.mailingAddress, "4803 Knights Branch DR");
    assert.equal(summary.client.mailingAddressCityTxZip, "Sugar Land, TX 77479-5337");
  });

  it("prefers the client mailing address", () => {
    const summary = buildInvoiceSummary(
      { ...client, mailingAddress: "PO Box 1", mailingAddressCityTxZip: "Houston, TX 77001" },
      [invoice(10, 1)],
      year,
      25
    );
    assert.equal(summary.client.mailingAddress, "PO Box 1");
  });

  it("returns an empty summary when there are no invoices for the year", () => {
    const summary = buildInvoiceSummary(client, [], year, 25);
    assert.deepEqual(summary.rows, []);
    assert.equal(summary.total, 0);
  });
});
