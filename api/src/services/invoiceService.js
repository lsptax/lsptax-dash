import prisma from "../../prisma/prismaClient.js";
import { getHearingStats } from "./hearingService.js";
import { paginateResult } from "../utils/pagination.js";
import { sanitizeSearchTerm } from "../utils/search.js";
import {
  invoiceToApiDto,
  normalizeInvoiceDateString,
  resolveInvoiceDueAmount,
  todayInvoiceDateString,
} from "../utils/invoiceYearlyData.js";
import { buildPropertySearchOrConditions } from "../utils/propertySearch.js";
import {
  getLatestDeliveriesByClientIds,
  getSentInvoiceDeliveriesByClientIds,
  getLatestDeliveryForInvoiceGroup,
  toDeliveryTrackingDto,
  sendPaymentAcknowledgementEmailsForInvoices,
} from "./invoiceDeliveryService.js";

/** propertyId = Property.id (system id). Use this for GET /api/invoice/:id. */
export async function getInvoiceByPropertyId(propertyId) {
  const idNum = parseInt(propertyId, 10);
  if (Number.isNaN(idNum)) return null;

  const property = await prisma.property.findUnique({
    where: { id: idNum },
    include: {
      client: {
        select: {
          id: true,
          clientNumber: true,
          clientName: true,
          email: true,
          billingEmail: true,
          phoneNumber: true,
          contingencyFee: true,
          flatFee: true,
          type: true,
        },
      },
    },
  });
  if (!property) return null;

  const { client, ...propertyOnly } = property;

  const clientContingencyFee =
    client?.contingencyFee != null ? Number(client.contingencyFee) : 25;

  const invoices = await prisma.invoice.findMany({
    where: { propertyId: property.id },
    orderBy: [{ year: "desc" }, { id: "desc" }],
  });

  const {
    lifecyclePhase: _lifecyclePhase,
    lifecycleStep: _lifecycleStep,
    lifecycleHistory: _lifecycleHistory,
    lifecycleCompletedAt: _lifecycleCompletedAt,
    lifecycleNotes: _lifecycleNotes,
    ...propertyDetails
  } = propertyOnly;

  return {
    propertyDetails,
    client: client
      ? {
          ...client,
          contingencyFee:
            client.contingencyFee != null ? Number(client.contingencyFee) : null,
          flatFee: client.flatFee != null ? Number(client.flatFee) : null,
        }
      : null,
    invoices: invoices.map((inv) => invoiceToApiDto(inv, clientContingencyFee)),
  };
}

/** clientId = Client.id (system id). Use this for GET /api/invoice/clientid=:id. */
export async function getInvoicesByClientId(clientId, limit, offset, search) {
  const idNum = parseInt(clientId, 10);
  if (Number.isNaN(idNum)) return null;

  const client = await prisma.client.findUnique({
    where: { id: idNum },
    select: {
      id: true,
      clientNumber: true,
      clientName: true,
      email: true,
      billingEmail: true,
      phoneNumber: true,
      type: true,
      isArchived: true,
    },
  });
  if (!client || client.type !== "CLIENT" || client.isArchived) return null;

  const q = sanitizeSearchTerm(search);
  const parsedYear = q ? parseInt(q, 10) : Number.NaN;
  const isYearSearch = !Number.isNaN(parsedYear) && /^\d{4}$/.test(q);
  const orConditions = [];
  if (q) {
    orConditions.push(
      ...buildPropertySearchOrConditions(q).filter((c) => c.accountNumber)
    );
    if (isYearSearch) {
      orConditions.push({ year: parsedYear });
    }
  }

  const where = {
    isArchived: false,
    property: {
      clientId: idNum,
      isArchived: false,
    },
    ...(orConditions.length > 0 ? { OR: orConditions } : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      property: {
        select: {
          id: true,
          clientId: true,
          accountNumber: true,
          clientNumber: true,
          cadCounty: true,
          propertyAddress: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  const groupedByProperty = [];
  const groupsByPropertyId = new Map();

  for (const invoice of invoices) {
    const key = String(invoice.propertyId);
    const clientContingencyFee =
      invoice.contingencyFee != null ? Number(invoice.contingencyFee) : 25;
    const invoiceRow = invoiceToApiDto(invoice, clientContingencyFee);
    delete invoiceRow.property;

    if (!groupsByPropertyId.has(key)) {
      const group = {
        propertyId: invoice.propertyId,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        id: invoice.id,
        property: invoice.property,
        invoices: [invoiceRow],
      };
      groupsByPropertyId.set(key, group);
      groupedByProperty.push(group);
    } else {
      const group = groupsByPropertyId.get(key);
      group.invoices.push(invoiceRow);
      if (isAfter(invoice.updatedAt, group.updatedAt)) {
        group.updatedAt = invoice.updatedAt;
        group.id = invoice.id;
      }
    }
  }

  groupedByProperty.sort(compareInvoiceGroupsByUpdatedAtDesc);

  const latestDeliveries = await getLatestDeliveriesByClientIds([idNum]);
  const lastDelivery = toDeliveryTrackingDto(latestDeliveries.get(idNum));

  return {
    client,
    lastDelivery,
    ...paginateResult(groupedByProperty, limit, offset),
  };
}

function isAfter(value, comparison) {
  const valueTime = value ? new Date(value).getTime() : 0;
  const comparisonTime = comparison ? new Date(comparison).getTime() : 0;
  return valueTime > comparisonTime;
}

function compareInvoiceGroupsByUpdatedAtDesc(a, b) {
  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return bTime - aTime || (Number(b.id) || 0) - (Number(a.id) || 0);
}

function buildPaidInvoiceDetail(invoice, feeDue) {
  return {
    id: invoice.id,
    year: invoice.year,
    paidDate: invoice.paidDate?.trim() || null,
    invoiceAmount: feeDue,
    paymentNotes: invoice.paymentNotes?.trim() || null,
  };
}

function buildGroupedInvoices(invoices, useSet = true) {
  const grouped = invoices.reduce((acc, invoice) => {
    const groupKey = String(invoice.propertyId ?? invoice.accountNumber ?? invoice.id);
    const clientContingencyFee =
      invoice.contingencyFee != null ? Number(invoice.contingencyFee) : 25;
    const feeDue = resolveInvoiceDueAmount(invoice, clientContingencyFee);
    const id = invoice.id;
    const invoicePaid = Boolean(invoice.isPaid);
    if (!acc[groupKey]) {
      acc[groupKey] = {
        id,
        clientId: invoice.property?.clientId ?? invoice.property?.client?.id ?? null,
        clientName: invoice.property?.client?.clientName ?? null,
        clientNumber:
          invoice.clientNumber ?? invoice.property?.client?.clientNumber ?? null,
        propertyId: invoice.propertyId ?? null,
        propertyNumbers: useSet ? new Set() : [],
        invoiceIds: useSet ? new Set([id]) : [id],
        paidCount: invoicePaid ? 1 : 0,
        paidInvoices: invoicePaid ? [buildPaidInvoiceDetail(invoice, feeDue)] : [],
        invoiceCount: 1,
        totalInvoiceAmount: feeDue,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      };
    } else {
      acc[groupKey].totalInvoiceAmount += feeDue;
      acc[groupKey].invoiceCount += 1;
      if (invoicePaid) {
        acc[groupKey].paidCount += 1;
        acc[groupKey].paidInvoices.push(buildPaidInvoiceDetail(invoice, feeDue));
      }
      if (useSet) acc[groupKey].invoiceIds.add(id);
      else acc[groupKey].invoiceIds.push(id);
      if (isAfter(invoice.updatedAt, acc[groupKey].updatedAt)) {
        acc[groupKey].updatedAt = invoice.updatedAt;
        acc[groupKey].id = invoice.id;
      }
    }
    if (invoice.accountNumber) {
      if (useSet) acc[groupKey].propertyNumbers.add(invoice.accountNumber);
      else acc[groupKey].propertyNumbers.push(invoice.accountNumber);
    }
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => {
      const invoiceIds = useSet ? Array.from(item.invoiceIds) : item.invoiceIds;
      const invoiceCount = item.invoiceCount || invoiceIds.length;
      const paidCount = item.paidCount || 0;
      return {
        ...item,
        propertyNumbers: useSet ? Array.from(item.propertyNumbers) : item.propertyNumbers,
        invoiceIds,
        invoiceCount,
        paidCount,
        paidInvoices: (item.paidInvoices || []).sort(
          (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)
        ),
        isPaid: invoiceCount > 0 && paidCount === invoiceCount,
      };
    })
    .sort(compareInvoiceGroupsByUpdatedAtDesc);
}

function normalizePaymentStatus(paymentStatus) {
  const raw = String(paymentStatus || "any").trim().toLowerCase();
  if (!raw || raw === "any" || raw === "all") return "any";
  if (raw === "paid" || raw === "unpaid") return raw;
  throw new Error("paymentStatus must be one of: any, paid, unpaid");
}

function filterGroupedByPaymentStatus(grouped, paymentStatus) {
  const normalized = normalizePaymentStatus(paymentStatus);
  if (normalized === "any") return grouped;
  if (normalized === "paid") return grouped.filter((item) => item.isPaid);
  return grouped.filter((item) => !item.isPaid);
}

/** Build OR filter for invoice search.
 * - If search starts with "#<number>", treat it as clientNumber (e.g. "#4324" → clientNumber = "4324").
 * - Otherwise, account number (leading-zero tolerant).
 */
function normalizeSendStatus(sendStatus) {
  const raw = String(sendStatus || "all").trim();
  if (!raw) return "all";

  const lower = raw.toLowerCase().replace(/-/g, "_");
  if (lower === "all") return "all";
  if (lower === "not_sent" || lower === "notsent") return "not_sent";
  if (lower === "sent") return "sent";

  const filterToEvent = {
    delivered: "DELIVERED",
    opened: "OPENED",
    bounced: "BOUNCED",
    blocked: "BLOCKED",
    invalid: "INVALID",
    deferred: "DEFERRED",
  };
  if (filterToEvent[lower]) return filterToEvent[lower];

  const upper = raw.toUpperCase();
  const brevoEvents = ["SENT", "DELIVERED", "OPENED", "BOUNCED", "BLOCKED", "INVALID", "DEFERRED"];
  if (brevoEvents.includes(upper)) return upper;

  return "all";
}

function filterGroupedBySendStatus(grouped, sendStatus) {
  const normalized = normalizeSendStatus(sendStatus);
  if (normalized === "all") return grouped;

  return grouped.filter((item) => {
    const isSent = Boolean(item.isSent);
    const lastEvent = (item.lastDelivery?.emailLastEvent ?? "").toUpperCase();

    if (normalized === "not_sent") {
      return !isSent && !item.lastDelivery;
    }
    if (normalized === "sent") {
      return isSent || Boolean(item.lastDelivery);
    }
    return lastEvent === normalized;
  });
}

function enrichGroupedWithSendStatus(grouped, deliveriesByClient = new Map()) {
  return grouped.map((item) => {
    const clientId = Number(item.clientId);
    const deliveries = Number.isFinite(clientId)
      ? deliveriesByClient.get(clientId) || []
      : [];
    const lastDelivery = getLatestDeliveryForInvoiceGroup(deliveries, item);
    return {
      ...item,
      isSent: Boolean(lastDelivery),
      lastDelivery: toDeliveryTrackingDto(lastDelivery),
    };
  });
}

function invoiceSearchWhere(searchTerm) {
  const raw = sanitizeSearchTerm(searchTerm);
  if (!raw) return {};

  if (raw.startsWith("#")) {
    const numPart = raw.slice(1).trim();
    if (/^\d+$/.test(numPart)) {
      const clientNumberFilter = {
        startsWith: numPart,
        mode: "insensitive",
      };
      return {
        OR: [
          { clientNumber: clientNumberFilter },
          { property: { client: { clientNumber: clientNumberFilter } } },
        ],
      };
    }
  }

  const orConditions = buildPropertySearchOrConditions(searchTerm).filter(
    (c) => c.accountNumber
  );
  if (!orConditions.length) return {};
  return { OR: orConditions };
}

export async function getAllInvoices(
  limit,
  offset,
  search,
  sendStatus = "all",
  paymentStatus = "any"
) {
  const baseWhere = { isArchived: false };
  const searchWhere = invoiceSearchWhere(search);
  const where =
    Object.keys(searchWhere).length === 0
      ? baseWhere
      : { ...baseWhere, AND: [searchWhere] };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      property: {
        select: {
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
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  let grouped = buildGroupedInvoices(invoices);
  const clientIds = grouped.map((item) => item.clientId).filter((id) => id != null);
  const deliveriesByClient = await getSentInvoiceDeliveriesByClientIds(clientIds);
  grouped = enrichGroupedWithSendStatus(grouped, deliveriesByClient);
  if (normalizeSendStatus(sendStatus) !== "all") {
    grouped = filterGroupedBySendStatus(grouped, sendStatus);
  }
  grouped = filterGroupedByPaymentStatus(grouped, paymentStatus);
  return paginateResult(grouped, limit, offset);
}

export async function getArchiveInvoices(
  limit,
  offset,
  search,
  sendStatus = "all",
  paymentStatus = "any"
) {
  const baseWhere = { isArchived: true };
  const searchWhere = invoiceSearchWhere(search);
  const where =
    Object.keys(searchWhere).length === 0
      ? baseWhere
      : { ...baseWhere, AND: [searchWhere] };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      property: {
        select: {
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
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  let grouped = buildGroupedInvoices(invoices, false).filter(
    (item) => item.totalInvoiceAmount > -1
  );
  const clientIds = grouped.map((item) => item.clientId).filter((id) => id != null);
  const deliveriesByClient = await getSentInvoiceDeliveriesByClientIds(clientIds);
  grouped = enrichGroupedWithSendStatus(grouped, deliveriesByClient);
  if (normalizeSendStatus(sendStatus) !== "all") {
    grouped = filterGroupedBySendStatus(grouped, sendStatus);
  }
  grouped = filterGroupedByPaymentStatus(grouped, paymentStatus);
  return paginateResult(grouped, limit, offset);
}

/**
 * Mark one or more invoices paid/unpaid.
 * When marking paid, requires paidDate (MM/DD/YYYY) and optionally paymentNotes.
 * When marking unpaid, clears paidDate.
 * When sendAcknowledgementEmail is true and isPaid is true, sends a Brevo acknowledgement email per client.
 */
export async function updateInvoicePaymentStatus({
  invoiceIds,
  isPaid,
  paidDate,
  paymentNotes,
  sendAcknowledgementEmail = false,
  customMessage = null,
}) {
  const ids = [...new Set(
    (Array.isArray(invoiceIds) ? invoiceIds : [invoiceIds])
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id))
  )];

  if (!ids.length) {
    throw new Error("invoiceIds is required");
  }
  if (typeof isPaid !== "boolean") {
    throw new Error("isPaid must be a boolean");
  }

  let data;
  if (isPaid) {
    const rawPaidDate =
      paidDate != null && String(paidDate).trim() !== ""
        ? String(paidDate).trim()
        : todayInvoiceDateString();
    const normalizedPaidDate = normalizeInvoiceDateString(rawPaidDate);
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedPaidDate)) {
      throw new Error("paidDate must be a valid date (MM/DD/YYYY)");
    }

    data = {
      isPaid: true,
      paidDate: normalizedPaidDate,
    };
    if (paymentNotes !== undefined) {
      data.paymentNotes =
        paymentNotes == null ? "" : String(paymentNotes).trim();
    }
  } else {
    data = { isPaid: false, paidDate: "" };
  }

  const result = await prisma.invoice.updateMany({
    where: { id: { in: ids } },
    data,
  });

  if (result.count === 0) {
    throw new Error("No matching invoices found for the provided invoiceIds");
  }

  const response = {
    updatedCount: result.count,
    invoiceIds: ids,
    isPaid,
    paidDate: data.paidDate,
    paymentNotes: data.paymentNotes,
  };

  if (isPaid && sendAcknowledgementEmail) {
    response.acknowledgementEmail =
      await sendPaymentAcknowledgementEmailsForInvoices({
        invoiceIds: ids,
        customMessage,
      });
  }

  return response;
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
