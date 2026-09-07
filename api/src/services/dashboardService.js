import prisma from "../../prisma/prismaClient.js";
import { getOwnerDateWindows } from "../utils/invoiceDateWindows.js";
import {
  BILLED_GROUP_BY,
  COLLECTED_DEFINITION_V1,
  averagePropertiesPerClient,
  billedByGroup,
  collectedByPaidMonth,
  largestUnpaidClients,
  moneyWindows,
  paidUnpaidCounts,
  pastDueTotals,
  protestTotals,
  reductionsByCounty,
  unpaidTotals,
} from "./financialMetrics.js";

const IN_SCOPE_INVOICE_WHERE = {
  isArchived: false,
  property: {
    isArchived: false,
    client: { isArchived: false },
  },
};

function toMetricInvoice(row) {
  const property = row.property || {};
  const client = property.client || {};
  return {
    id: row.id,
    propertyId: row.propertyId,
    year: row.year,
    invoiceDate: row.invoiceDate,
    paidDate: row.paidDate,
    dueDate: row.dueDate,
    invoiceAmount: row.invoiceAmount,
    isPaid: row.isPaid,
    appraisedReduction: row.appraisedReduction,
    taxableSavings: row.taxableSavings,
    accountNumber: property.accountNumber || row.accountNumber || "",
    county: property.cadCounty || "",
    clientId: client.id ?? property.clientId ?? null,
    clientName: client.clientName || "",
    clientNumber: client.clientNumber || "",
  };
}

async function loadInScopeInvoices() {
  const rows = await prisma.invoice.findMany({
    where: IN_SCOPE_INVOICE_WHERE,
    select: {
      id: true,
      propertyId: true,
      year: true,
      invoiceDate: true,
      paidDate: true,
      dueDate: true,
      invoiceAmount: true,
      isPaid: true,
      appraisedReduction: true,
      taxableSavings: true,
      accountNumber: true,
      property: {
        select: {
          accountNumber: true,
          cadCounty: true,
          clientId: true,
          client: {
            select: {
              id: true,
              clientName: true,
              clientNumber: true,
            },
          },
        },
      },
    },
  });
  return rows.map(toMetricInvoice);
}

function reportMeta(windows) {
  return {
    asOf: windows.asOf,
    timeZone: windows.timeZone,
    collectedDefinition: COLLECTED_DEFINITION_V1,
    windows: {
      thisMonth: windows.thisMonth,
      lastMonth: windows.lastMonth,
      ytd: windows.ytd,
      calendarYear: windows.calendarYear,
    },
  };
}

export async function getOwnerDashboard(referenceDate = new Date()) {
  const windows = getOwnerDateWindows(referenceDate);
  const [invoices, activeProperties] = await Promise.all([
    loadInScopeInvoices(),
    prisma.property.count({
      where: {
        isArchived: false,
        client: { isArchived: false },
      },
    }),
  ]);

  const money = moneyWindows(invoices, windows);
  const unpaid = unpaidTotals(invoices);
  const pastDue = pastDueTotals(invoices, windows.asOf);
  const counts = paidUnpaidCounts(invoices);
  const protest = protestTotals(invoices);

  return {
    asOf: windows.asOf,
    timeZone: windows.timeZone,
    collectedDefinition: COLLECTED_DEFINITION_V1,
    billedThisMonth: money.billedThisMonth,
    billedLastMonth: money.billedLastMonth,
    billedYtd: money.billedYtd,
    billedCalendarYear: money.billedCalendarYear,
    collectedThisMonth: money.collectedThisMonth,
    collectedLastMonth: money.collectedLastMonth,
    collectedYtd: money.collectedYtd,
    collectedCalendarYear: money.collectedCalendarYear,
    collectionRate: money.collectionRate,
    outstandingReceivables: unpaid.totalUnpaid,
    pastDueReceivables: pastDue.pastDueReceivables,
    activeProperties,
    propertiesInvoiced: money.propertiesInvoicedYtd,
    propertiesInvoicedThisMonth: money.propertiesInvoicedThisMonth,
    propertiesInvoicedYtd: money.propertiesInvoicedYtd,
    paidInvoiceCount: counts.paidInvoiceCount,
    unpaidInvoiceCount: counts.unpaidInvoiceCount,
    pastDueInvoiceCount: pastDue.pastDueInvoiceCount,
    propertiesProtested: protest.propertiesProtested,
    averageReduction: protest.averageReduction,
    totalValueReductions: protest.totalValueReductions,
    totalTaxSavings: protest.totalTaxSavings,
  };
}

export async function getBilledReport({ groupBy } = {}, referenceDate = new Date()) {
  const normalizedGroupBy = groupBy ? String(groupBy).trim() : "";
  if (normalizedGroupBy && !BILLED_GROUP_BY.has(normalizedGroupBy)) {
    const error = new Error(
      `Invalid groupBy. Use one of: ${[...BILLED_GROUP_BY].join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const windows = getOwnerDateWindows(referenceDate);
  const invoices = await loadInScopeInvoices();
  const money = moneyWindows(invoices, windows);

  return {
    ...reportMeta(windows),
    billedThisMonth: money.billedThisMonth,
    billedLastMonth: money.billedLastMonth,
    billedYtd: money.billedYtd,
    billedCalendarYear: money.billedCalendarYear,
    ...(normalizedGroupBy
      ? { groupBy: normalizedGroupBy, groups: billedByGroup(invoices, normalizedGroupBy) }
      : {}),
  };
}

export async function getCollectedReport(referenceDate = new Date()) {
  const windows = getOwnerDateWindows(referenceDate);
  const invoices = await loadInScopeInvoices();
  const money = moneyWindows(invoices, windows);

  return {
    ...reportMeta(windows),
    collectedThisMonth: money.collectedThisMonth,
    collectedLastMonth: money.collectedLastMonth,
    collectedYtd: money.collectedYtd,
    collectedCalendarYear: money.collectedCalendarYear,
    byMonth: collectedByPaidMonth(invoices),
  };
}

export async function getUnpaidReport({ view, limit } = {}) {
  const invoices = await loadInScopeInvoices();
  const unpaid = unpaidTotals(invoices);
  const largestLimit = view === "largest" ? Math.min(Number(limit) || 25, 100) : 10;

  return {
    collectedDefinition: COLLECTED_DEFINITION_V1,
    unpaidInvoiceCount: unpaid.unpaidInvoiceCount,
    unpaidClientCount: unpaid.unpaidClientCount,
    totalUnpaid: unpaid.totalUnpaid,
    largestOutstandingClients: largestUnpaidClients(invoices, largestLimit),
  };
}

export async function getReductionsReport() {
  const invoices = await loadInScopeInvoices();
  const protest = protestTotals(invoices);
  return {
    ...protest,
    groupBy: "county",
    byCounty: reductionsByCounty(invoices),
  };
}

export async function getAveragePropertiesPerClient() {
  const [clientCount, propertyCount] = await Promise.all([
    prisma.client.count({
      where: { isArchived: false, type: "CLIENT" },
    }),
    prisma.property.count({
      where: {
        isArchived: false,
        client: { isArchived: false, type: "CLIENT" },
      },
    }),
  ]);

  return {
    clientCount,
    propertyCount,
    averagePropertiesPerClient: averagePropertiesPerClient(clientCount, propertyCount),
  };
}

export async function getActiveClientCount() {
  const activeClients = await prisma.client.count({
    where: { isArchived: false, type: "CLIENT" },
  });
  return { activeClients };
}
