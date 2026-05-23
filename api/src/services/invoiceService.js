import prisma from "../../prisma/prismaClient.js";
import { getHearingStats } from "./hearingService.js";
import { paginateResult } from "../utils/pagination.js";
import { sanitizeSearchTerm } from "../utils/search.js";

/** clientId = Client.id (system id). Use this for GET /api/invoice/:clientId. */
export async function getInvoiceByClientId(clientId) {
  const idNum = parseInt(clientId, 10);
  if (Number.isNaN(idNum)) return null;
  const client = await prisma.client.findUnique({
    where: { id: idNum },
  });
  if (!client) return null;

  const properties = await prisma.property.findMany({
    where: { clientId: client.id },
  });
  if (properties.length === 0) return null;

  const propertyIds = properties.map((p) => p.id);
  const invoices = await prisma.invoice.findMany({
    where: { propertyId: { in: propertyIds } },
  });

  const invoicesByPropertyId = new Map();
  for (const inv of invoices) {
    if (!invoicesByPropertyId.has(inv.propertyId)) invoicesByPropertyId.set(inv.propertyId, []);
    invoicesByPropertyId.get(inv.propertyId).push(inv);
  }

  return {
    client,
    properties: properties.map((property) => {
      const relatedInvoices = invoicesByPropertyId.get(property.id) || [];
      return {
        propertyDetails: property,
        invoice: relatedInvoices.length ? relatedInvoices : null,
      };
    }),
  };
}

function buildGroupedInvoices(invoices, useSet = true) {
  const grouped = invoices.reduce((acc, invoice) => {
    const clientId = invoice.clientNumber;
    const feeDue = invoice.invoiceAmount;
    const id = invoice.id;
    if (!acc[clientId]) {
      acc[clientId] = {
        id,
        clientId,
        propertyNumbers: useSet ? new Set() : [],
        totalInvoiceAmount: feeDue,
        createdAt: invoice.createdAt,
      };
    } else {
      acc[clientId].totalInvoiceAmount += feeDue;
    }
    if (invoice.accountNumber) {
      if (useSet) acc[clientId].propertyNumbers.add(invoice.accountNumber);
      else acc[clientId].propertyNumbers.push(invoice.accountNumber);
    }
    return acc;
  }, {});

  return Object.values(grouped).map((item) => ({
    ...item,
    propertyNumbers: useSet ? Array.from(item.propertyNumbers) : item.propertyNumbers,
  }));
}

/** Build OR filter for invoice search: client number, property/account number (case-insensitive). */
function invoiceSearchWhere(searchTerm) {
  const q = sanitizeSearchTerm(searchTerm);
  if (!q) return {};
  const contains = { contains: q, mode: "insensitive" };
  return {
    OR: [{ accountNumber: contains }],
  };
}

export async function getAllInvoices(limit, offset, search) {
  const baseWhere = { isArchived: false };
  const searchWhere = invoiceSearchWhere(search);
  const where =
    Object.keys(searchWhere).length === 0
      ? baseWhere
      : { ...baseWhere, AND: [searchWhere] };

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      clientNumber: true,
      propertyId: true,
      accountNumber: true,
      invoiceAmount: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });

  const grouped = buildGroupedInvoices(invoices);
  return paginateResult(grouped, limit, offset);
}

export async function getArchiveInvoices(limit, offset, search) {
  const baseWhere = { isArchived: true };
  const searchWhere = invoiceSearchWhere(search);
  const where =
    Object.keys(searchWhere).length === 0
      ? baseWhere
      : { ...baseWhere, AND: [searchWhere] };

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      clientNumber: true,
      accountNumber: true,
      invoiceAmount: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
  });

  const grouped = buildGroupedInvoices(invoices, false).filter(
    (item) => item.totalInvoiceAmount > -1
  );
  return paginateResult(grouped, limit, offset);
}

/** Dashboard stats: client/prospect counts + hearing schedule summary. */
export async function getCounts() {
  const [rows, hearings] = await Promise.all([
    prisma.client.groupBy({
      by: ["type"],
      where: { type: { in: ["CLIENT", "PROSPECT"] } },
      _count: { id: true },
    }),
    getHearingStats(),
  ]);
  const byType = Object.fromEntries(rows.map((r) => [r.type, r._count.id]));
  return {
    numOfClients: byType.CLIENT ?? 0,
    numOfProspects: byType.PROSPECT ?? 0,
    hearings,
  };
}

export async function getInvoicesForExport() {
  return prisma.invoice.findMany();
}
