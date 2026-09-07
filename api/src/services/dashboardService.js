import prisma from "../../prisma/prismaClient.js";
import { getOwnerDateWindows } from "../utils/invoiceDateWindows.js";
import {
  countiesFromFilters,
  dateConstraintFromFilters,
  invoiceMatchesEntityFilters,
  referenceDateFromFilters,
  taxYearsFromFilters,
} from "../utils/reportFilters.js";
import {
  BILLED_GROUP_BY,
  COLLECTED_DEFINITION_V1,
  averagePropertiesPerClient,
  billedByGroup,
  collectedByPaidMonth,
  invoicesMatchingBilledDate,
  invoicesMatchingCollectedDate,
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

function cadCountyWhere(filters = {}) {
  const counties = countiesFromFilters(filters);
  if (!counties.length) return undefined;
  return { in: counties, mode: "insensitive" };
}

function prismaEntityWhere(filters = {}) {
  const propertyWhere = {
    isArchived: false,
    client: { isArchived: false },
  };
  if (filters.clientId != null) propertyWhere.clientId = filters.clientId;
  const cadCounty = cadCountyWhere(filters);
  if (cadCounty) propertyWhere.cadCounty = cadCounty;

  const where = {
    isArchived: false,
    property: propertyWhere,
  };
  const taxYears = taxYearsFromFilters(filters);
  if (taxYears.length) where.year = { in: taxYears };
  if (filters.propertyId != null) where.propertyId = filters.propertyId;
  return where;
}

function propertyCountWhere(filters = {}) {
  const where = {
    isArchived: false,
    client: { isArchived: false },
  };
  if (filters.clientId != null) where.clientId = filters.clientId;
  if (filters.propertyId != null) where.id = filters.propertyId;
  const cadCounty = cadCountyWhere(filters);
  if (cadCounty) where.cadCounty = cadCounty;
  return where;
}

async function loadInScopeInvoices(filters = {}) {
  const rows = await prisma.invoice.findMany({
    where: prismaEntityWhere(filters),
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
  return rows
    .map(toMetricInvoice)
    .filter((invoice) => invoiceMatchesEntityFilters(invoice, filters));
}

function publicFilters(filters = {}) {
  const months = filters.months?.length ? filters.months : filters.month ? [filters.month] : [];
  const taxYears = taxYearsFromFilters(filters);
  const counties = countiesFromFilters(filters);
  return {
    from: filters.from || null,
    to: filters.to || null,
    month: filters.month || null,
    months: months.length ? months : null,
    calendarYear: filters.calendarYear ?? null,
    taxYears: taxYears.length ? taxYears : null,
    counties: counties.length ? counties : null,
    clientId: filters.clientId ?? null,
    propertyId: filters.propertyId ?? null,
  };
}

function reportMeta(windows, filters) {
  return {
    asOf: windows.asOf,
    timeZone: windows.timeZone,
    collectedDefinition: COLLECTED_DEFINITION_V1,
    filters: publicFilters(filters),
    windows: {
      thisMonth: windows.thisMonth,
      lastMonth: windows.lastMonth,
      ytd: windows.ytd,
      calendarYear: windows.calendarYear,
    },
  };
}

function resolveContext(filters = {}, referenceDate = new Date()) {
  const now = referenceDateFromFilters(filters, referenceDate);
  const windows = getOwnerDateWindows(now);
  const dateConstraint = dateConstraintFromFilters(filters);
  return { windows, dateConstraint };
}

export async function getOwnerDashboard(filters = {}, referenceDate = new Date()) {
  const { windows, dateConstraint } = resolveContext(filters, referenceDate);
  const [invoices, activeProperties] = await Promise.all([
    loadInScopeInvoices(filters),
    prisma.property.count({ where: propertyCountWhere(filters) }),
  ]);

  const money = moneyWindows(invoices, windows, dateConstraint);
  const arInvoices = invoicesMatchingBilledDate(invoices, dateConstraint);
  const unpaid = unpaidTotals(arInvoices);
  const pastDue = pastDueTotals(arInvoices, windows.asOf);
  const counts = paidUnpaidCounts(arInvoices);
  const protest = protestTotals(invoicesMatchingBilledDate(invoices, dateConstraint));

  return {
    ...reportMeta(windows, filters),
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

export async function getOwnerDashboardOptions() {
  const [yearRows, countyRows] = await Promise.all([
    prisma.invoice.findMany({
      where: IN_SCOPE_INVOICE_WHERE,
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    }),
    prisma.property.findMany({
      where: {
        isArchived: false,
        cadCounty: { not: null },
        NOT: { cadCounty: "" },
        client: { isArchived: false },
      },
      distinct: ["cadCounty"],
      select: { cadCounty: true },
    }),
  ]);

  const taxYears = yearRows
    .map((row) => row.year)
    .filter((year) => Number(year) > 0)
    .sort((a, b) => b - a);
  const counties = countyRows
    .map((row) => String(row.cadCounty || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return { taxYears, counties };
}

export async function getBilledReport({ groupBy, ...filters } = {}, referenceDate = new Date()) {
  const normalizedGroupBy = groupBy ? String(groupBy).trim() : "";
  if (normalizedGroupBy && !BILLED_GROUP_BY.has(normalizedGroupBy)) {
    const error = new Error(
      `Invalid groupBy. Use one of: ${[...BILLED_GROUP_BY].join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const { windows, dateConstraint } = resolveContext(filters, referenceDate);
  const invoices = await loadInScopeInvoices(filters);
  const money = moneyWindows(invoices, windows, dateConstraint);
  const billedInvoices = invoicesMatchingBilledDate(invoices, dateConstraint);

  return {
    ...reportMeta(windows, filters),
    billedThisMonth: money.billedThisMonth,
    billedLastMonth: money.billedLastMonth,
    billedYtd: money.billedYtd,
    billedCalendarYear: money.billedCalendarYear,
    ...(normalizedGroupBy
      ? { groupBy: normalizedGroupBy, groups: billedByGroup(billedInvoices, normalizedGroupBy) }
      : {}),
  };
}

export async function getCollectedReport(filters = {}, referenceDate = new Date()) {
  const { windows, dateConstraint } = resolveContext(filters, referenceDate);
  const invoices = await loadInScopeInvoices(filters);
  const money = moneyWindows(invoices, windows, dateConstraint);
  const collectedInvoices = invoicesMatchingCollectedDate(invoices, dateConstraint);

  return {
    ...reportMeta(windows, filters),
    collectedThisMonth: money.collectedThisMonth,
    collectedLastMonth: money.collectedLastMonth,
    collectedYtd: money.collectedYtd,
    collectedCalendarYear: money.collectedCalendarYear,
    byMonth: collectedByPaidMonth(collectedInvoices),
  };
}

export async function getUnpaidReport({ view, limit, ...filters } = {}, referenceDate = new Date()) {
  const { dateConstraint } = resolveContext(filters, referenceDate);
  const invoices = invoicesMatchingBilledDate(await loadInScopeInvoices(filters), dateConstraint);
  const unpaid = unpaidTotals(invoices);
  const largestLimit = view === "largest" ? Math.min(Number(limit) || 25, 100) : 10;

  return {
    collectedDefinition: COLLECTED_DEFINITION_V1,
    filters: publicFilters(filters),
    unpaidInvoiceCount: unpaid.unpaidInvoiceCount,
    unpaidClientCount: unpaid.unpaidClientCount,
    totalUnpaid: unpaid.totalUnpaid,
    largestOutstandingClients: largestUnpaidClients(invoices, largestLimit),
  };
}

export async function getReductionsReport(filters = {}, referenceDate = new Date()) {
  const { dateConstraint } = resolveContext(filters, referenceDate);
  const invoices = invoicesMatchingBilledDate(await loadInScopeInvoices(filters), dateConstraint);
  const protest = protestTotals(invoices);
  return {
    ...protest,
    filters: publicFilters(filters),
    groupBy: "county",
    byCounty: reductionsByCounty(invoices),
  };
}

export async function getAveragePropertiesPerClient(filters = {}) {
  const clientWhere = {
    isArchived: false,
    type: "CLIENT",
  };
  if (filters.clientId != null) clientWhere.id = filters.clientId;

  const propertyWhere = {
    isArchived: false,
    client: clientWhere,
  };
  const cadCounty = cadCountyWhere(filters);
  if (cadCounty) propertyWhere.cadCounty = cadCounty;
  if (filters.propertyId != null) propertyWhere.id = filters.propertyId;

  const [clientCount, propertyCount] = await Promise.all([
    prisma.client.count({ where: clientWhere }),
    prisma.property.count({ where: propertyWhere }),
  ]);

  return {
    filters: publicFilters(filters),
    clientCount,
    propertyCount,
    averagePropertiesPerClient: averagePropertiesPerClient(clientCount, propertyCount),
  };
}

export async function getActiveClientCount(filters = {}) {
  const where = { isArchived: false, type: "CLIENT" };
  if (filters.clientId != null) where.id = filters.clientId;
  const cadCounty = cadCountyWhere(filters);
  if (cadCounty || filters.propertyId != null) {
    where.properties = {
      some: {
        isArchived: false,
        ...(filters.propertyId != null ? { id: filters.propertyId } : {}),
        ...(cadCounty ? { cadCounty: cadCounty } : {}),
      },
    };
  }
  const activeClients = await prisma.client.count({ where });
  return { filters: publicFilters(filters), activeClients };
}

export async function getFilteredRosterExport(filters = {}) {
  const where = propertyCountWhere(filters);
  const taxYears = taxYearsFromFilters(filters);
  if (taxYears.length) {
    where.invoices = {
      some: {
        isArchived: false,
        year: { in: taxYears },
      },
    };
  }

  const properties = await prisma.property.findMany({
    where,
    select: {
      accountNumber: true,
      nameOnCad: true,
      propertyAddress: true,
      cadCounty: true,
      mailingAddress: true,
      mailingAddressCityTxZip: true,
      client: {
        select: {
          id: true,
          clientNumber: true,
          clientName: true,
          email: true,
          billingEmail: true,
          phoneNumber: true,
          mailingAddress: true,
          mailingAddressCityTxZip: true,
        },
      },
    },
    orderBy: [{ cadCounty: "asc" }, { accountNumber: "asc" }],
  });

  const clientById = new Map();
  const propertyRows = properties.map((property) => {
    const client = property.client || {};
    if (client.id != null && !clientById.has(client.id)) {
      clientById.set(client.id, {
        clientNumber: client.clientNumber || "",
        clientName: client.clientName || "",
        email: client.email || "",
        billingEmail: client.billingEmail || "",
        phoneNumber: client.phoneNumber || "",
        mailingAddress: client.mailingAddress || "",
        mailingCityTxZip: client.mailingAddressCityTxZip || "",
      });
    }
    return {
      clientNumber: client.clientNumber || "",
      clientName: client.clientName || "",
      accountNumber: property.accountNumber || "",
      nameOnCad: property.nameOnCad || "",
      propertyAddress: property.propertyAddress || "",
      county: property.cadCounty || "",
      mailingAddress: property.mailingAddress || "",
      mailingCityTxZip: property.mailingAddressCityTxZip || "",
    };
  });

  const clients = [...clientById.values()].sort((a, b) =>
    String(a.clientName).localeCompare(String(b.clientName))
  );

  return { clients, properties: propertyRows };
}
