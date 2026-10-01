import { invoiceToApiDto } from "../utils/invoiceYearlyData.js";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Client header plus one row per property for the client-level invoice summary PDF. */
export function buildInvoiceSummary(client, invoices, year, clientContingencyFee) {
  const sorted = [...invoices].sort(
    (a, b) => (a.property?.id ?? 0) - (b.property?.id ?? 0) || a.id - b.id
  );
  const mailingSource =
    text(client.mailingAddress) || text(client.mailingAddressCityTxZip)
      ? client
      : sorted.find((inv) => text(inv.property?.mailingAddress))?.property || {};

  const rows = sorted.map((invoice) => {
    const property = invoice.property || {};
    const dto = invoiceToApiDto(invoice, clientContingencyFee, property.flatFee);
    return {
      invoiceId: invoice.id,
      propertyId: property.id ?? invoice.propertyId,
      propertyAddress: text(property.propertyAddress),
      county: text(property.cadCounty),
      accountNumber: text(property.accountNumber || invoice.accountNumber),
      invoiceTemplate: invoice.invoiceTemplate ?? null,
      underArbitration: Boolean(invoice.underArbitration),
      noticeMarketValue: toNumber(dto.noticeMarketValue),
      finalMarketValue: toNumber(dto.finalMarketValue),
      marketReduction: toNumber(dto.marketReduction),
      noticeAppraisedValue: toNumber(dto.noticeAppraisedValue),
      finalAppraisedValue: toNumber(dto.finalAppraisedValue),
      appraisedReduction: toNumber(dto.appraisedReduction),
      taxRate: toNumber(dto.taxRate),
      taxableSavings: toNumber(dto.taxableSavings),
      contingencyFee: toNumber(dto.contingencyFeePercent),
      invoiceAmount: toNumber(dto.invoiceAmount),
      paid: Boolean(invoice.isPaid),
    };
  });

  const total = Math.round(rows.reduce((sum, row) => sum + row.invoiceAmount, 0) * 100) / 100;

  return {
    year,
    client: {
      id: client.id,
      clientNumber: text(client.clientNumber),
      clientName: text(client.clientName),
      typeOfAcct: text(client.typeOfAcct),
      mailingAddress: text(mailingSource.mailingAddress),
      mailingAddressCityTxZip: text(mailingSource.mailingAddressCityTxZip),
    },
    rows,
    total,
  };
}
