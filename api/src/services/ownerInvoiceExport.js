import {
  applyFullInvoiceCalculations,
  parseBppInvoiceAmount,
} from "../utils/invoiceYearlyData.js";

export const INVOICE_EXPORT_FIELDS = [
  { label: "Invoice number", value: "invoiceNumber" },
  { label: "Tax year", value: "taxYear" },
  { label: "Client number", value: "clientNumber" },
  { label: "Client name", value: "clientName" },
  { label: "Account", value: "accountNumber" },
  { label: "Name on CAD", value: "nameOnCad" },
  { label: "Property address", value: "propertyAddress" },
  { label: "County", value: "county" },
  { label: "Invoice date", value: "invoiceDate" },
  { label: "Due date", value: "dueDate" },
  { label: "Generated date", value: "generatedDate" },
  { label: "Notice land value", value: "noticeLandValue" },
  { label: "Notice improvement value", value: "noticeImprovementValue" },
  { label: "Beginning market value", value: "noticeMarketValue" },
  { label: "Final land value", value: "finalLandValue" },
  { label: "Final improvement value", value: "finalImprovementValue" },
  { label: "Ending market value", value: "finalMarketValue" },
  { label: "Market reduction", value: "marketReduction" },
  { label: "Beginning appraised value", value: "noticeAppraisedValue" },
  { label: "Ending appraised value", value: "finalAppraisedValue" },
  { label: "Appraised reduction", value: "appraisedReduction" },
  { label: "Tax rate %", value: "taxRate" },
  { label: "Taxable savings", value: "taxableSavings" },
  { label: "Contingency fee %", value: "contingencyFee" },
  { label: "BPP", value: "bppAmount" },
  { label: "Flat fee", value: "flatFee" },
  { label: "Invoice amount", value: "invoiceAmount" },
  { label: "Paid", value: "paid" },
  { label: "Paid date", value: "paidDate" },
  { label: "Payment notes", value: "paymentNotes" },
  { label: "Under litigation", value: "underLitigation" },
  { label: "Under arbitration", value: "underArbitration" },
];

function yesNo(value) {
  return value ? "Yes" : "No";
}

function text(value) {
  return value == null ? "" : String(value);
}

/** One spreadsheet row with the inputs used to calculate the invoice amount. */
export function toInvoiceExportRow(row) {
  const property = row?.property || {};
  const client = property.client || {};
  const calculated = applyFullInvoiceCalculations(row, client.contingencyFee, {
    propertyFlatFee: property.flatFee,
  });

  return {
    invoiceNumber: row.id ?? "",
    taxYear: row.year ?? "",
    clientNumber: text(client.clientNumber || row.clientNumber),
    clientName: text(client.clientName),
    accountNumber: text(property.accountNumber || row.accountNumber),
    nameOnCad: text(property.nameOnCad),
    propertyAddress: text(property.propertyAddress),
    county: text(property.cadCounty),
    invoiceDate: text(row.invoiceDate),
    dueDate: text(row.dueDate),
    generatedDate: text(row.generatedDate),
    noticeLandValue: calculated.noticeLandValue,
    noticeImprovementValue: calculated.noticeImprovementValue,
    noticeMarketValue: calculated.noticeMarketValue,
    finalLandValue: calculated.finalLandValue,
    finalImprovementValue: calculated.finalImprovementValue,
    finalMarketValue: calculated.finalMarketValue,
    marketReduction: calculated.marketReduction,
    noticeAppraisedValue: calculated.noticeAppraisedValue,
    finalAppraisedValue: calculated.finalAppraisedValue,
    appraisedReduction: calculated.appraisedReduction,
    taxRate: calculated.taxRate,
    taxableSavings: calculated.taxableSavings,
    contingencyFee: calculated.contingencyFee,
    bppAmount: parseBppInvoiceAmount(row.bppInvoice),
    flatFee: calculated.flatFee,
    invoiceAmount: calculated.invoiceAmount,
    paid: yesNo(row.isPaid),
    paidDate: text(row.paidDate),
    paymentNotes: text(row.paymentNotes),
    underLitigation: yesNo(row.underLitigation),
    underArbitration: yesNo(row.underArbitration),
  };
}
