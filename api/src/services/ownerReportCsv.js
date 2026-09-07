import { convertToCSV } from "./exportService.js";

function summaryRow(payload, extra = {}) {
  return {
    asOf: payload.asOf ?? "",
    billedThisMonth: payload.billedThisMonth ?? "",
    billedLastMonth: payload.billedLastMonth ?? "",
    billedYtd: payload.billedYtd ?? "",
    billedCalendarYear: payload.billedCalendarYear ?? "",
    collectedThisMonth: payload.collectedThisMonth ?? "",
    collectedLastMonth: payload.collectedLastMonth ?? "",
    collectedYtd: payload.collectedYtd ?? "",
    collectedCalendarYear: payload.collectedCalendarYear ?? "",
    collectionRate: payload.collectionRate ?? "",
    totalUnpaid: payload.totalUnpaid ?? "",
    unpaidInvoiceCount: payload.unpaidInvoiceCount ?? "",
    unpaidClientCount: payload.unpaidClientCount ?? "",
    ...extra,
  };
}

export function csvForBilledReport(payload) {
  if (Array.isArray(payload.groups) && payload.groups.length) {
    const groupBy = payload.groupBy;
    const fields = [{ label: "Billed", value: "billed" }, { label: "Invoices", value: "invoiceCount" }];
    if (groupBy === "taxYear") fields.unshift({ label: "Tax year", value: "taxYear" });
    else if (groupBy === "county") fields.unshift({ label: "County", value: "county" });
    else if (groupBy === "client") {
      fields.unshift(
        { label: "Client ID", value: "clientId" },
        { label: "Client", value: "clientName" },
        { label: "Client number", value: "clientNumber" }
      );
    } else if (groupBy === "property") {
      fields.unshift(
        { label: "Property ID", value: "propertyId" },
        { label: "Property", value: "label" },
        { label: "County", value: "county" },
        { label: "Client", value: "clientName" }
      );
    } else {
      fields.unshift({ label: "Group", value: "label" });
    }
    return convertToCSV(payload.groups, fields);
  }

  return convertToCSV([summaryRow(payload)], [
    { label: "As of", value: "asOf" },
    { label: "Billed this month", value: "billedThisMonth" },
    { label: "Billed last month", value: "billedLastMonth" },
    { label: "Billed YTD", value: "billedYtd" },
    { label: "Billed calendar year", value: "billedCalendarYear" },
  ]);
}

export function csvForCollectedReport(payload) {
  if (Array.isArray(payload.byMonth) && payload.byMonth.length) {
    return convertToCSV(payload.byMonth, [
      { label: "Year", value: "year" },
      { label: "Month", value: "month" },
      { label: "Collected", value: "collected" },
    ]);
  }
  return convertToCSV([summaryRow(payload)], [
    { label: "As of", value: "asOf" },
    { label: "Collected this month", value: "collectedThisMonth" },
    { label: "Collected last month", value: "collectedLastMonth" },
    { label: "Collected YTD", value: "collectedYtd" },
    { label: "Collected calendar year", value: "collectedCalendarYear" },
  ]);
}

export function csvForUnpaidReport(payload) {
  const rows = payload.largestOutstandingClients || [];
  if (rows.length) {
    return convertToCSV(rows, [
      { label: "Client ID", value: "clientId" },
      { label: "Client", value: "clientName" },
      { label: "Client number", value: "clientNumber" },
      { label: "Unpaid amount", value: "unpaidAmount" },
      { label: "Unpaid invoices", value: "unpaidInvoiceCount" },
    ]);
  }
  return convertToCSV([summaryRow(payload)], [
    { label: "Unpaid invoices", value: "unpaidInvoiceCount" },
    { label: "Unpaid clients", value: "unpaidClientCount" },
    { label: "Total unpaid", value: "totalUnpaid" },
  ]);
}

export function csvForReductionsReport(payload) {
  const rows = payload.byCounty || [];
  if (rows.length) {
    return convertToCSV(rows, [
      { label: "County", value: "county" },
      { label: "Total reductions", value: "totalValueReductions" },
      { label: "Average reduction", value: "averageReduction" },
      { label: "Tax savings", value: "totalTaxSavings" },
      { label: "Properties protested", value: "propertiesProtested" },
    ]);
  }
  return convertToCSV([payload], [
    { label: "Properties protested", value: "propertiesProtested" },
    { label: "Total reductions", value: "totalValueReductions" },
    { label: "Average reduction", value: "averageReduction" },
    { label: "Tax savings", value: "totalTaxSavings" },
  ]);
}

export function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.status(200).send(csv);
}
