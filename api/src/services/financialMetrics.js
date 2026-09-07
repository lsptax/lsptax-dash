import { roundMoney } from "../utils/invoiceYearlyData.js";
import {
  dateInInclusiveRange,
  parseInvoiceCalendarDate,
  parsedDateBefore,
} from "../utils/invoiceDateWindows.js";

/** v1: collected = full invoiceAmount on paidDate when isPaid. */
export const COLLECTED_DEFINITION_V1 = "full_pay_on_paid_date";

export const BILLED_GROUP_BY = new Set(["taxYear", "county", "client", "property"]);

function money(value) {
  return roundMoney(Number(value) || 0);
}

function monthKey(parsed) {
  return `${parsed.y}-${String(parsed.m).padStart(2, "0")}`;
}

function emptyCounty(county) {
  const trimmed = String(county ?? "").trim();
  return trimmed || null;
}

export function sumBilledInRange(invoices, range) {
  let amount = 0;
  const propertyIds = new Set();
  for (const invoice of invoices) {
    const parsed = parseInvoiceCalendarDate(invoice.invoiceDate);
    if (!dateInInclusiveRange(parsed, range.start, range.end)) continue;
    amount = roundMoney(amount + money(invoice.invoiceAmount));
    propertyIds.add(invoice.propertyId);
  }
  return { amount, propertyCount: propertyIds.size };
}

export function sumCollectedInRange(invoices, range) {
  let amount = 0;
  for (const invoice of invoices) {
    if (!invoice.isPaid) continue;
    const parsed = parseInvoiceCalendarDate(invoice.paidDate);
    if (!dateInInclusiveRange(parsed, range.start, range.end)) continue;
    amount = roundMoney(amount + money(invoice.invoiceAmount));
  }
  return amount;
}

export function collectionRate(collected, billed) {
  if (!billed) return null;
  return Math.round((collected / billed) * 10000) / 10000;
}

export function unpaidTotals(invoices) {
  let amount = 0;
  let invoiceCount = 0;
  const clientIds = new Set();
  for (const invoice of invoices) {
    if (invoice.isPaid) continue;
    amount = roundMoney(amount + money(invoice.invoiceAmount));
    invoiceCount += 1;
    if (invoice.clientId != null) clientIds.add(invoice.clientId);
  }
  return {
    unpaidInvoiceCount: invoiceCount,
    unpaidClientCount: clientIds.size,
    totalUnpaid: amount,
  };
}

export function pastDueTotals(invoices, asOfIso) {
  let amount = 0;
  let invoiceCount = 0;
  for (const invoice of invoices) {
    if (invoice.isPaid) continue;
    const due = parseInvoiceCalendarDate(invoice.dueDate);
    if (!parsedDateBefore(due, asOfIso)) continue;
    amount = roundMoney(amount + money(invoice.invoiceAmount));
    invoiceCount += 1;
  }
  return { pastDueReceivables: amount, pastDueInvoiceCount: invoiceCount };
}

export function paidUnpaidCounts(invoices) {
  let paidInvoiceCount = 0;
  let unpaidInvoiceCount = 0;
  for (const invoice of invoices) {
    if (invoice.isPaid) paidInvoiceCount += 1;
    else unpaidInvoiceCount += 1;
  }
  return { paidInvoiceCount, unpaidInvoiceCount };
}

export function protestTotals(invoices) {
  const propertyIds = new Set();
  let totalValueReductions = 0;
  let totalTaxSavings = 0;
  for (const invoice of invoices) {
    propertyIds.add(invoice.propertyId);
    totalValueReductions = roundMoney(
      totalValueReductions + money(invoice.appraisedReduction)
    );
    totalTaxSavings = roundMoney(totalTaxSavings + money(invoice.taxableSavings));
  }
  const invoiceCount = invoices.length;
  return {
    propertiesProtested: propertyIds.size,
    totalValueReductions,
    averageReduction: invoiceCount
      ? roundMoney(totalValueReductions / invoiceCount)
      : null,
    totalTaxSavings,
  };
}

export function moneyWindows(invoices, windows) {
  const billedThisMonth = sumBilledInRange(invoices, windows.thisMonth);
  const billedLastMonth = sumBilledInRange(invoices, windows.lastMonth);
  const billedYtd = sumBilledInRange(invoices, windows.ytd);
  const billedCalendarYear = sumBilledInRange(invoices, windows.calendarYear);
  const collectedThisMonth = sumCollectedInRange(invoices, windows.thisMonth);
  const collectedLastMonth = sumCollectedInRange(invoices, windows.lastMonth);
  const collectedYtd = sumCollectedInRange(invoices, windows.ytd);
  const collectedCalendarYear = sumCollectedInRange(invoices, windows.calendarYear);

  return {
    billedThisMonth: billedThisMonth.amount,
    billedLastMonth: billedLastMonth.amount,
    billedYtd: billedYtd.amount,
    billedCalendarYear: billedCalendarYear.amount,
    collectedThisMonth,
    collectedLastMonth,
    collectedYtd,
    collectedCalendarYear,
    collectionRate: collectionRate(collectedYtd, billedYtd.amount),
    propertiesInvoicedThisMonth: billedThisMonth.propertyCount,
    propertiesInvoicedYtd: billedYtd.propertyCount,
  };
}

export function collectedByPaidMonth(invoices) {
  const byMonth = new Map();
  for (const invoice of invoices) {
    if (!invoice.isPaid) continue;
    const parsed = parseInvoiceCalendarDate(invoice.paidDate);
    if (!parsed) continue;
    const key = monthKey(parsed);
    const current = byMonth.get(key) || { year: parsed.y, month: parsed.m, collected: 0 };
    current.collected = roundMoney(current.collected + money(invoice.invoiceAmount));
    byMonth.set(key, current);
  }
  return [...byMonth.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
}

function billedGroupKey(invoice, groupBy) {
  switch (groupBy) {
    case "taxYear":
      return {
        key: String(invoice.year ?? 0),
        taxYear: invoice.year ?? 0,
        label: String(invoice.year ?? 0),
      };
    case "county": {
      const county = emptyCounty(invoice.county);
      return {
        key: county ?? "",
        county: county ?? "",
        label: county || "(none)",
      };
    }
    case "client":
      return {
        key: String(invoice.clientId ?? ""),
        clientId: invoice.clientId ?? null,
        clientName: invoice.clientName || "",
        clientNumber: invoice.clientNumber || "",
        label: invoice.clientName || `Client ${invoice.clientId ?? ""}`,
      };
    case "property":
      return {
        key: String(invoice.propertyId ?? ""),
        propertyId: invoice.propertyId ?? null,
        county: emptyCounty(invoice.county) ?? "",
        clientId: invoice.clientId ?? null,
        clientName: invoice.clientName || "",
        label: invoice.accountNumber || `Property ${invoice.propertyId ?? ""}`,
      };
    default:
      return null;
  }
}

export function billedByGroup(invoices, groupBy) {
  if (!BILLED_GROUP_BY.has(groupBy)) return [];
  const groups = new Map();
  for (const invoice of invoices) {
    const parsed = parseInvoiceCalendarDate(invoice.invoiceDate);
    if (!parsed) continue;
    const identity = billedGroupKey(invoice, groupBy);
    if (!identity) continue;
    const current = groups.get(identity.key) || { ...identity, billed: 0, invoiceCount: 0 };
    current.billed = roundMoney(current.billed + money(invoice.invoiceAmount));
    current.invoiceCount += 1;
    groups.set(identity.key, current);
  }
  return [...groups.values()]
    .map(({ key: _key, ...rest }) => rest)
    .sort((a, b) => b.billed - a.billed);
}

export function largestUnpaidClients(invoices, limit = 10) {
  const byClient = new Map();
  for (const invoice of invoices) {
    if (invoice.isPaid || invoice.clientId == null) continue;
    const current = byClient.get(invoice.clientId) || {
      clientId: invoice.clientId,
      clientName: invoice.clientName || "",
      clientNumber: invoice.clientNumber || "",
      unpaidAmount: 0,
      unpaidInvoiceCount: 0,
    };
    current.unpaidAmount = roundMoney(current.unpaidAmount + money(invoice.invoiceAmount));
    current.unpaidInvoiceCount += 1;
    byClient.set(invoice.clientId, current);
  }
  return [...byClient.values()]
    .sort((a, b) => b.unpaidAmount - a.unpaidAmount)
    .slice(0, limit);
}

export function reductionsByCounty(invoices) {
  const byCounty = new Map();
  for (const invoice of invoices) {
    const county = emptyCounty(invoice.county) ?? "";
    const current = byCounty.get(county) || {
      county: county || "(none)",
      totalValueReductions: 0,
      totalTaxSavings: 0,
      invoiceCount: 0,
      propertyIds: new Set(),
    };
    current.totalValueReductions = roundMoney(
      current.totalValueReductions + money(invoice.appraisedReduction)
    );
    current.totalTaxSavings = roundMoney(current.totalTaxSavings + money(invoice.taxableSavings));
    current.invoiceCount += 1;
    current.propertyIds.add(invoice.propertyId);
    byCounty.set(county, current);
  }
  return [...byCounty.values()]
    .map(({ propertyIds, invoiceCount, ...rest }) => ({
      ...rest,
      propertiesProtested: propertyIds.size,
      averageReduction: invoiceCount
        ? roundMoney(rest.totalValueReductions / invoiceCount)
        : null,
    }))
    .sort((a, b) => b.totalValueReductions - a.totalValueReductions);
}

export function averagePropertiesPerClient(clientCount, propertyCount) {
  if (!clientCount) return null;
  return roundMoney(propertyCount / clientCount);
}
