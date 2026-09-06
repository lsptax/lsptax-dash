import prisma from "../../prisma/prismaClient.js";
import { parseBppInvoiceAmount, resolveInvoiceDueAmount } from "../utils/invoiceYearlyData.js";
import { sendTransactionalEmail, sendTransactionalSms, getTransactionalEmailEvents } from "./brevoService.js";
import {
  getInvoiceEmailHtml,
  getInvoiceEmailSubject,
  getInvoiceSmsText,
} from "../utils/invoiceEmailTemplate.js";
import {
  getPaymentAcknowledgementHtml,
  getPaymentAcknowledgementSubject,
} from "../utils/paymentAcknowledgementEmailTemplate.js";
import { toE164 } from "../utils/phoneNumber.js";
import { sanitizeSearchTerm } from "../utils/search.js";
import { buildPropertySearchOrConditions } from "../utils/propertySearch.js";
import {
  uploadInvoiceToSupabase,
  invoiceDeliveryStoragePath,
  getInvoiceSignedDownloadUrl,
} from "../utils/supabaseStorage.js";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_BULK_RECIPIENTS = 500;
const MAX_BULK_INVOICES = 5000;
const PDF_MAGIC = Buffer.from("%PDF");
const EMAIL_TRACKING_SYNC_MIN_AGE_MS = 2 * 60 * 1000;
const EMAIL_TRACKING_SYNC_LIMIT = 3;
const MAX_BULK_SYNC_LIMIT = 100;
const BULK_SYNC_LOG_PREFIX = "[InvoiceDelivery bulk sync]";
const BULK_SYNC_PROGRESS_INTERVAL = 10;

const EMAIL_LAST_EVENT_RANK = {
  SENT: 1,
  DEFERRED: 2,
  DELIVERED: 3,
  OPENED: 4,
  BOUNCED: 10,
  BLOCKED: 10,
  INVALID: 10,
};

const OPENED_BREVO_EVENTS = new Set([
  "open",
  "opened",
  "unique_opened",
  "first_opening",
  "proxy_open",
  "unique_proxy_open",
]);

const BOUNCE_BREVO_EVENTS = new Set(["soft_bounce", "hard_bounce", "bounce"]);

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIntegerList(value, fieldName) {
  const parsed = toList(value).map((item) => parseInt(item, 10));
  const invalid = parsed.some((item) => Number.isNaN(item));
  if (invalid) {
    throw new Error(`${fieldName} must contain only valid numbers`);
  }
  return [...new Set(parsed)];
}

function parseStringList(value) {
  return [...new Set(toList(value).map((item) => String(item).trim()).filter(Boolean))];
}

function parseOptionalNumber(value, fieldName) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return parsed;
}

function parseBoolean(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
}

function hasUsableEmail(client) {
  return Boolean((client?.billingEmail || client?.email || "").trim());
}

function normalizeBulkInvoiceFilters(filters = {}) {
  const paymentStatus = String(filters.paymentStatus || "any").toLowerCase();
  if (!["any", "paid", "unpaid"].includes(paymentStatus)) {
    throw new Error("paymentStatus must be one of: any, paid, unpaid");
  }

  return {
    invoiceIds: parseIntegerList(filters.invoiceIds, "invoiceIds"),
    clientIds: parseIntegerList(filters.clientIds, "clientIds"),
    propertyIds: parseIntegerList(filters.propertyIds, "propertyIds"),
    years: parseIntegerList(filters.years, "years"),
    accountNumbers: parseStringList(filters.accountNumbers),
    cadCounties: parseStringList(filters.cadCounties || filters.counties),
    search: sanitizeSearchTerm(filters.search),
    paymentStatus,
    minInvoiceAmount: parseOptionalNumber(filters.minInvoiceAmount, "minInvoiceAmount"),
    maxInvoiceAmount: parseOptionalNumber(filters.maxInvoiceAmount, "maxInvoiceAmount"),
    includeArchivedInvoices: parseBoolean(filters.includeArchivedInvoices, false),
    includeArchivedClients: parseBoolean(filters.includeArchivedClients, false),
    includeArchivedProperties: parseBoolean(filters.includeArchivedProperties, false),
    hasEmail: parseBoolean(filters.hasEmail, true),
  };
}

function bulkInvoiceWhere(filters) {
  const where = {};
  const propertyWhere = {};
  const clientWhere = { type: "CLIENT" };

  if (!filters.includeArchivedInvoices) where.isArchived = false;
  if (filters.invoiceIds.length) where.id = { in: filters.invoiceIds };
  if (filters.years.length) where.year = { in: filters.years };
  if (filters.accountNumbers.length) where.accountNumber = { in: filters.accountNumbers };
  if (filters.propertyIds.length) propertyWhere.id = { in: filters.propertyIds };
  if (!filters.includeArchivedProperties) propertyWhere.isArchived = false;
  if (!filters.includeArchivedClients) clientWhere.isArchived = false;
  if (filters.clientIds.length) clientWhere.id = { in: filters.clientIds };

  if (filters.cadCounties.length) {
    propertyWhere.OR = filters.cadCounties.map((county) => ({
      cadCounty: { equals: county, mode: "insensitive" },
    }));
  }

  const invoiceAmount = {};
  if (filters.minInvoiceAmount != null) invoiceAmount.gte = filters.minInvoiceAmount;
  if (filters.maxInvoiceAmount != null) invoiceAmount.lte = filters.maxInvoiceAmount;
  if (Object.keys(invoiceAmount).length) where.invoiceAmount = invoiceAmount;

  if (filters.paymentStatus === "paid") {
    where.AND = [...(where.AND || []), { isPaid: true }];
  } else if (filters.paymentStatus === "unpaid") {
    where.AND = [...(where.AND || []), { isPaid: false }];
  }

  if (filters.hasEmail) {
    clientWhere.AND = [
      ...(clientWhere.AND || []),
      {
        OR: [
          { AND: [{ billingEmail: { not: null } }, { billingEmail: { not: "" } }] },
          { AND: [{ email: { not: null } }, { email: { not: "" } }] },
        ],
      },
    ];
  }

  if (filters.search) {
    const accountSearch = buildPropertySearchOrConditions(filters.search).filter(
      (condition) => condition.accountNumber
    );
    where.OR = [
      ...(where.OR || []),
      ...accountSearch,
      { property: { propertyAddress: { contains: filters.search, mode: "insensitive" } } },
      { property: { cadCounty: { contains: filters.search, mode: "insensitive" } } },
      { property: { client: { clientName: { contains: filters.search, mode: "insensitive" } } } },
      { property: { client: { clientNumber: { contains: filters.search, mode: "insensitive" } } } },
      { property: { client: { email: { contains: filters.search, mode: "insensitive" } } } },
      { property: { client: { billingEmail: { contains: filters.search, mode: "insensitive" } } } },
    ];
  }

  propertyWhere.client = clientWhere;
  where.property = propertyWhere;
  return where;
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    throw new Error("At least one PDF attachment is required");
  }

  return attachments.map((item, index) => {
    const filename = String(item?.filename || item?.name || "").trim();
    const contentBase64 = String(item?.contentBase64 || item?.content || "").trim();

    if (!filename) {
      throw new Error(`Attachment ${index + 1} is missing filename`);
    }
    if (!contentBase64) {
      throw new Error(`Attachment ${index + 1} is missing contentBase64`);
    }

    let buffer;
    try {
      buffer = Buffer.from(contentBase64, "base64");
    } catch {
      throw new Error(`Attachment ${index + 1} has invalid base64 content`);
    }

    if (buffer.length === 0) {
      throw new Error(`Attachment ${index + 1} is empty`);
    }
    if (buffer.length > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Attachment ${index + 1} exceeds 10 MB limit`);
    }
    if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
      throw new Error(`Attachment ${index + 1} must be a PDF file`);
    }

    return { filename, contentBase64, buffer };
  });
}

async function uploadInvoiceAttachments(clientId, year, attachments) {
  const batchKey = Date.now();
  const storedFiles = [];
  const storageErrors = [];

  for (const file of attachments) {
    const storagePath = invoiceDeliveryStoragePath(
      clientId,
      year,
      batchKey,
      file.filename
    );
    try {
      const path = await uploadInvoiceToSupabase(file.buffer, storagePath);
      storedFiles.push({ filename: file.filename, storagePath: path });
    } catch (err) {
      storageErrors.push(`${file.filename}: ${err.message}`);
      console.error("Invoice Supabase upload failed:", err);
    }
  }

  return { storedFiles, storageWarning: storageErrors.length > 0 ? storageErrors.join("; ") : null };
}

async function createDeliveryLog(data) {
  return prisma.invoiceDelivery.create({ data });
}

function normalizeBrevoMessageId(messageId) {
  return String(messageId || "").trim();
}

function normalizeBrevoEventName(event) {
  return String(event || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mapBrevoEventToLastEvent(event) {
  const normalized = normalizeBrevoEventName(event);
  if (OPENED_BREVO_EVENTS.has(normalized)) return "OPENED";
  if (normalized === "delivered") return "DELIVERED";
  if (BOUNCE_BREVO_EVENTS.has(normalized)) return "BOUNCED";
  if (["blocked", "error"].includes(normalized)) return "BLOCKED";
  if (["invalid_email", "invalid"].includes(normalized)) return "INVALID";
  if (normalized === "deferred") return "DEFERRED";
  if (["sent", "request"].includes(normalized)) return "SENT";
  return normalized ? normalized.toUpperCase() : null;
}

function shouldUpgradeEmailLastEvent(current, next) {
  if (!next) return false;
  if (["BOUNCED", "BLOCKED", "INVALID"].includes(next)) return true;
  const currentRank = EMAIL_LAST_EVENT_RANK[current] || 0;
  const nextRank = EMAIL_LAST_EVENT_RANK[next] || 0;
  return nextRank >= currentRank;
}

function parseBrevoEventTime(payload = {}) {
  if (payload.eventTime) {
    const parsed = new Date(payload.eventTime);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (payload.time) {
    const parsed = new Date(payload.time);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (payload.date) {
    const parsed = new Date(payload.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const ts = payload.ts_event ?? payload.ts;
  if (ts != null) {
    const parsed = new Date(Number(ts) * 1000);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (payload.ts_epoch != null) {
    const parsed = new Date(Number(payload.ts_epoch));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function toDeliveryTrackingDto(delivery) {
  if (!delivery) return null;
  return {
    deliveryId: delivery.id,
    year: delivery.year,
    recipientEmail: delivery.recipientEmail,
    emailSentAt: delivery.emailSentAt,
    emailDeliveredAt: delivery.emailDeliveredAt,
    emailOpenedAt: delivery.emailOpenedAt,
    emailLastEvent: delivery.emailLastEvent || (delivery.emailStatus === "SENT" ? "SENT" : null),
    emailBounceReason: delivery.emailBounceReason,
    syncedAt: delivery.syncedAt,
    createdAt: delivery.createdAt,
  };
}

function buildDeliveryTrackingUpdate(delivery, { event, eventTime, reason }) {
  const lastEvent = mapBrevoEventToLastEvent(event);
  if (!lastEvent) return null;

  const update = {};
  const normalizedEvent = normalizeBrevoEventName(event);
  const parsedTime =
    eventTime && typeof eventTime === "object" && !(eventTime instanceof Date)
      ? parseBrevoEventTime(eventTime)
      : parseBrevoEventTime({ eventTime, time: eventTime });

  if (shouldUpgradeEmailLastEvent(delivery.emailLastEvent, lastEvent)) {
    update.emailLastEvent = lastEvent;
  }

  if (lastEvent === "DELIVERED" && !delivery.emailDeliveredAt) {
    update.emailDeliveredAt = parsedTime;
  }

  if (lastEvent === "OPENED") {
    if (!delivery.emailOpenedAt || parsedTime > delivery.emailOpenedAt) {
      update.emailOpenedAt = parsedTime;
    }
  }

  if (lastEvent === "BOUNCED" && reason) {
    update.emailBounceReason = String(reason).trim();
  } else if (
    BOUNCE_BREVO_EVENTS.has(normalizedEvent) &&
    reason &&
    !delivery.emailBounceReason
  ) {
    update.emailBounceReason = String(reason).trim();
  }

  return Object.keys(update).length > 0 ? update : null;
}

/**
 * Apply a single Brevo transactional email webhook/API event to a delivery row.
 * Uses row-level locking to prevent concurrent webhooks from regressing emailLastEvent.
 */
export async function applyBrevoEmailEvent({ messageId, event, eventTime, reason }) {
  const normalizedMessageId = normalizeBrevoMessageId(messageId);
  if (!normalizedMessageId || !event) return null;

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`
      SELECT "id"
      FROM "InvoiceDelivery"
      WHERE "brevoEmailMessageId" = ${normalizedMessageId}
      ORDER BY "createdAt" DESC
      LIMIT 1
      FOR UPDATE
    `;
    const deliveryId = locked[0]?.id;
    if (!deliveryId) return null;

    const delivery = await tx.invoiceDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) return null;

    const patch = buildDeliveryTrackingUpdate(delivery, { event, eventTime, reason });
    return tx.invoiceDelivery.update({
      where: { id: delivery.id },
      data: {
        syncedAt: new Date(),
        ...(patch || {}),
      },
    });
  });
}

function buildSyncEligibleWhere({ onlyStale = false } = {}) {
  const where = {
    brevoEmailMessageId: { not: null },
    emailStatus: "SENT",
  };

  if (onlyStale) {
    where.OR = [{ emailLastEvent: null }, { emailLastEvent: "SENT" }];
  }

  return where;
}

/**
 * Pull email tracking events from Brevo for a stored delivery messageId.
 */
export async function syncEmailTrackingFromBrevo(deliveryId, { quiet = false } = {}) {
  const idNum = parseInt(deliveryId, 10);
  if (Number.isNaN(idNum)) throw new Error("Invalid deliveryId");

  const delivery = await prisma.invoiceDelivery.findUnique({
    where: { id: idNum },
  });
  if (!delivery) throw new Error("Delivery not found");
  if (!delivery.brevoEmailMessageId) {
    throw new Error("Delivery has no Brevo messageId to sync");
  }

  const events = await getTransactionalEmailEvents(delivery.brevoEmailMessageId);
  const sortedEvents = [...events].sort((a, b) => {
    const aTime = new Date(a?.time || 0).getTime();
    const bTime = new Date(b?.time || 0).getTime();
    return aTime - bTime;
  });
  let current = delivery;

  for (const item of sortedEvents) {
    const updated = await applyBrevoEmailEvent({
      messageId: delivery.brevoEmailMessageId,
      event: item?.name,
      eventTime: item?.time,
      reason: item?.reason,
    });
    if (updated) current = updated;
  }

  if (sortedEvents.length === 0) {
    current = await prisma.invoiceDelivery.update({
      where: { id: current.id },
      data: { syncedAt: new Date() },
    });
  }

  if (!quiet) {
    console.info(
      `[InvoiceDelivery sync] deliveryId=${current.id} clientId=${current.clientId} event=${current.emailLastEvent || "SENT"} (${sortedEvents.length} Brevo events)`
    );
  }

  return current;
}

/**
 * Pull Brevo tracking for invoice deliveries in batches (manual sync from invoice list).
 *
 * Each delivery = 2 Brevo API calls (~0.3–1s). Default batch is 50; max 100 per request.
 * Use offset pagination when totalEligible > limit (e.g. 5×100 requests for 500 deliveries ≈ 3–8 min).
 */
export async function syncDeliveriesFromBrevo({
  limit = 50,
  offset = 0,
  onlyStale = false,
  includeResults = false,
} = {}) {
  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), MAX_BULK_SYNC_LIMIT);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);
  const where = buildSyncEligibleWhere({ onlyStale });

  const [totalEligible, deliveries] = await Promise.all([
    prisma.invoiceDelivery.count({ where }),
    prisma.invoiceDelivery.findMany({
      where,
      orderBy: [{ emailSentAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
  ]);

  const batchSize = deliveries.length;
  const startedAt = Date.now();

  if (batchSize === 0) {
    console.info(
      `${BULK_SYNC_LOG_PREFIX} nothing to sync (totalEligible=${totalEligible}, offset=${skip}, onlyStale=${onlyStale})`
    );
    return {
      totalEligible,
      offset: skip,
      limit: take,
      attempted: 0,
      synced: 0,
      failed: 0,
      remaining: 0,
      hasMore: false,
      nextOffset: null,
      durationMs: 0,
      onlyStale,
      errors: [],
      results: includeResults ? [] : undefined,
    };
  }

  console.info(
    `${BULK_SYNC_LOG_PREFIX} starting batch ${skip + 1}-${skip + batchSize} of ${totalEligible} (limit=${take}, onlyStale=${onlyStale})`
  );

  let synced = 0;
  let failed = 0;
  const errors = [];
  const results = [];

  for (let i = 0; i < deliveries.length; i++) {
    const delivery = deliveries[i];
    const processed = skip + i + 1;

    try {
      const updated = await syncEmailTrackingFromBrevo(delivery.id, { quiet: true });
      synced += 1;
      if (includeResults) {
        results.push({
          deliveryId: updated.id,
          clientId: updated.clientId,
          success: true,
          emailLastEvent: updated.emailLastEvent || "SENT",
        });
      }
      if (
        processed % BULK_SYNC_PROGRESS_INTERVAL === 0 ||
        i === deliveries.length - 1
      ) {
        console.info(
          `${BULK_SYNC_LOG_PREFIX} ${processed}/${totalEligible} processed (${synced} ok, ${failed} failed)`
        );
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        deliveryId: delivery.id,
        clientId: delivery.clientId,
        message,
      });
      if (includeResults) {
        results.push({
          deliveryId: delivery.id,
          clientId: delivery.clientId,
          success: false,
          error: message,
        });
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  const remaining = Math.max(totalEligible - skip - batchSize, 0);
  const hasMore = remaining > 0;

  console.info(
    `${BULK_SYNC_LOG_PREFIX} batch complete — ${synced}/${batchSize} synced, ${failed} failed, ${durationMs}ms${hasMore ? `, ${remaining} remaining (nextOffset=${skip + batchSize})` : ""}${failed ? `; see response errors[] for details` : ""}`
  );

  return {
    totalEligible,
    offset: skip,
    limit: take,
    attempted: batchSize,
    synced,
    failed,
    remaining,
    hasMore,
    nextOffset: hasMore ? skip + batchSize : null,
    durationMs,
    onlyStale,
    errors,
    results: includeResults ? results : undefined,
  };
}

/**
 * Latest successful invoice email delivery per client (for invoice list UI).
 */
export async function getLatestDeliveriesByClientIds(clientIds = []) {
  const deliveriesByClient = await getSentInvoiceDeliveriesByClientIds(clientIds);
  const latestByClient = new Map();
  for (const [clientId, deliveries] of deliveriesByClient) {
    latestByClient.set(clientId, deliveries[0] || null);
  }
  return latestByClient;
}

/**
 * Invoice email deliveries grouped by client, newest first.
 * Excludes payment acknowledgement rows (no attachments / scope).
 */
export async function getSentInvoiceDeliveriesByClientIds(clientIds = []) {
  const uniqueClientIds = [
    ...new Set(
      clientIds
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isFinite(id))
    ),
  ];
  if (!uniqueClientIds.length) return new Map();

  const deliveries = await prisma.invoiceDelivery.findMany({
    where: {
      clientId: { in: uniqueClientIds },
      emailStatus: "SENT",
    },
    orderBy: [{ emailSentAt: "desc" }, { createdAt: "desc" }],
  });

  const grouped = new Map();
  for (const delivery of deliveries) {
    if (!isInvoiceDeliveryRecord(delivery)) continue;
    if (!grouped.has(delivery.clientId)) grouped.set(delivery.clientId, []);
    grouped.get(delivery.clientId).push(delivery);
  }

  return grouped;
}

async function maybeSyncStaleDeliveryTracking(deliveries = []) {
  const stale = deliveries
    .filter((delivery) => {
      if (!delivery?.brevoEmailMessageId) return false;
      if (delivery.emailLastEvent && delivery.emailLastEvent !== "SENT") return false;
      const sentAt = delivery.emailSentAt || delivery.createdAt;
      if (!sentAt) return false;
      return Date.now() - new Date(sentAt).getTime() >= EMAIL_TRACKING_SYNC_MIN_AGE_MS;
    })
    .slice(0, EMAIL_TRACKING_SYNC_LIMIT);

  for (const delivery of stale) {
    try {
      await syncEmailTrackingFromBrevo(delivery.id);
    } catch (err) {
      console.warn(
        `[InvoiceDelivery sync clientId=${delivery.clientId} deliveryId=${delivery.id}] ${err.message}`
      );
    }
  }

  if (!stale.length) return deliveries;

  const refreshedIds = stale.map((delivery) => delivery.id);
  const refreshed = await prisma.invoiceDelivery.findMany({
    where: { id: { in: refreshedIds } },
  });
  const refreshedById = new Map(refreshed.map((delivery) => [delivery.id, delivery]));

  return deliveries.map((delivery) => refreshedById.get(delivery.id) || delivery);
}

function hasExplicitInvoiceSendScope({
  invoiceIds = [],
  propertyIds = [],
  propertyAddresses = null,
} = {}) {
  if (invoiceIds.length > 0 || propertyIds.length > 0) return true;
  return (
    Array.isArray(propertyAddresses) &&
    propertyAddresses.some((address) => String(address).trim())
  );
}

async function resolveSentInvoiceScope(
  clientId,
  year,
  { invoiceIds = [], propertyIds = [], propertyAddresses = null } = {}
) {
  const where = {
    isArchived: false,
    property: { clientId, isArchived: false },
  };
  if (year != null) where.year = year;

  const normalizedAddresses = Array.isArray(propertyAddresses)
    ? [
        ...new Set(
          propertyAddresses.map((address) => String(address).trim()).filter(Boolean)
        ),
      ]
    : [];

  if (invoiceIds.length) {
    where.id = { in: invoiceIds };
  } else if (propertyIds.length) {
    where.propertyId = { in: propertyIds };
  } else if (normalizedAddresses.length) {
    where.property = {
      ...where.property,
      OR: normalizedAddresses.map((address) => ({
        propertyAddress: { equals: address, mode: "insensitive" },
      })),
    };
  }

  const rows = await prisma.invoice.findMany({
    where,
    select: { id: true, propertyId: true },
  });

  return {
    invoiceIds: [...new Set(rows.map((row) => row.id))],
    propertyIds: [
      ...new Set(rows.map((row) => row.propertyId).filter((id) => id != null)),
    ],
  };
}

function isInvoiceDeliveryRecord(delivery) {
  const hasAttachments =
    Array.isArray(delivery?.attachmentNames) && delivery.attachmentNames.length > 0;
  const hasStoredFiles =
    Array.isArray(delivery?.storedFiles) && delivery.storedFiles.length > 0;
  const hasInvoiceScope =
    Array.isArray(delivery?.invoiceIds) && delivery.invoiceIds.length > 0;
  const hasPropertyScope =
    Array.isArray(delivery?.propertyIds) && delivery.propertyIds.length > 0;
  return hasAttachments || hasStoredFiles || hasInvoiceScope || hasPropertyScope;
}

/**
 * Whether a delivery applies to an invoice list row (grouped by property).
 * Legacy deliveries without invoiceIds/propertyIds apply to all rows for that client.
 */
export function deliveryAppliesToInvoiceGroup(
  delivery,
  { clientId, propertyId, invoiceIds = [] } = {}
) {
  if (!delivery || !isInvoiceDeliveryRecord(delivery)) return false;
  if (Number(delivery.clientId) !== Number(clientId)) return false;

  const deliveryInvoiceIds = delivery.invoiceIds || [];
  const deliveryPropertyIds = delivery.propertyIds || [];
  if (deliveryInvoiceIds.length === 0 && deliveryPropertyIds.length === 0) {
    return true;
  }

  const groupPropertyId = Number(propertyId);
  if (
    deliveryPropertyIds.length > 0 &&
    Number.isFinite(groupPropertyId) &&
    deliveryPropertyIds.includes(groupPropertyId)
  ) {
    return true;
  }

  const groupInvoiceIds = (invoiceIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
  if (
    deliveryInvoiceIds.length > 0 &&
    groupInvoiceIds.some((id) => deliveryInvoiceIds.includes(id))
  ) {
    return true;
  }

  return false;
}

function compareDeliveriesByRecency(a, b) {
  const aTime = new Date(a?.emailSentAt || a?.createdAt || 0).getTime();
  const bTime = new Date(b?.emailSentAt || b?.createdAt || 0).getTime();
  return bTime - aTime || (Number(b?.id) || 0) - (Number(a?.id) || 0);
}

export function getLatestDeliveryForInvoiceGroup(deliveries = [], group = {}) {
  return (
    [...deliveries]
      .filter((delivery) => deliveryAppliesToInvoiceGroup(delivery, group))
      .sort(compareDeliveriesByRecency)[0] || null
  );
}

async function resolveInvoicePropertyAddresses(
  clientId,
  year,
  { invoiceIds = [], propertyIds = [] } = {}
) {
  const where = {
    property: { clientId, isArchived: false },
  };
  if (year != null) where.year = year;
  if (invoiceIds.length) where.id = { in: invoiceIds };
  if (propertyIds.length) where.propertyId = { in: propertyIds };

  const rows = await prisma.invoice.findMany({
    where,
    select: {
      propertyId: true,
      property: { select: { propertyAddress: true } },
    },
    distinct: ["propertyId"],
  });

  return [
    ...new Set(
      rows.map((row) => row.property?.propertyAddress?.trim()).filter(Boolean)
    ),
  ];
}

/**
 * Send client-generated invoice PDF(s) via Brevo email, then optional SMS.
 *
 * PDFs are generated on the frontend and passed as base64 attachments.
 * Pass propertyAddresses, invoiceIds, and/or propertyIds so the email
 * subject/body only mention the properties actually being sent.
 */
export async function sendInvoiceToClient({
  clientId,
  year = null,
  sendSms = true,
  attachments,
  customMessage = null,
  propertyAddresses = null,
  invoiceIds = null,
  propertyIds = null,
}) {
  const idNum = parseInt(clientId, 10);
  if (Number.isNaN(idNum)) {
    throw new Error("Invalid clientId");
  }

  const parsedYear =
    year == null || year === ""
      ? null
      : parseInt(year, 10);
  if (parsedYear != null && (Number.isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100)) {
    throw new Error("Invalid year");
  }

  const scopedInvoiceIds = parseIntegerList(invoiceIds, "invoiceIds");
  const scopedPropertyIds = parseIntegerList(propertyIds, "propertyIds");
  const normalizedAttachments = normalizeAttachments(attachments);
  const normalizedPropertyAddresses = Array.isArray(propertyAddresses)
    ? [
        ...new Set(
          propertyAddresses.map((address) => String(address).trim()).filter(Boolean)
        ),
      ]
    : null;

  const client = await prisma.client.findUnique({
    where: { id: idNum },
    select: {
      id: true,
      clientName: true,
      email: true,
      billingEmail: true,
      phoneNumber: true,
      type: true,
      isArchived: true,
    },
  });

  if (!client || client.type !== "CLIENT" || client.isArchived) {
    throw new Error("Client not found");
  }

  const recipientEmail = (client.billingEmail || client.email || "").trim();
  if (!recipientEmail) {
    throw new Error("Client billing email or email is required to send invoice");
  }

  const sentScope = hasExplicitInvoiceSendScope({
    invoiceIds: scopedInvoiceIds,
    propertyIds: scopedPropertyIds,
    propertyAddresses: normalizedPropertyAddresses,
  })
    ? await resolveSentInvoiceScope(client.id, parsedYear, {
        invoiceIds: scopedInvoiceIds,
        propertyIds: scopedPropertyIds,
        propertyAddresses: normalizedPropertyAddresses,
      })
    : { invoiceIds: [], propertyIds: [] };

  const recipientPhone = toE164(client.phoneNumber);
  const shouldSendSms = sendSms !== false;

  const clientName = client.clientName || "Client";
  const resolvedPropertyAddresses = Array.isArray(propertyAddresses)
    ? [
        ...new Set(
          propertyAddresses.map((address) => String(address).trim()).filter(Boolean)
        ),
      ]
    : await resolveInvoicePropertyAddresses(client.id, parsedYear, {
        invoiceIds: scopedInvoiceIds,
        propertyIds: scopedPropertyIds,
      });
  const subject = getInvoiceEmailSubject({
    year: parsedYear,
    propertyAddresses: resolvedPropertyAddresses,
  });
  const htmlContent =
    customMessage?.trim() ||
    getInvoiceEmailHtml({
      clientName,
      year: parsedYear,
      propertyAddresses: resolvedPropertyAddresses,
    });

  const deliveryBase = {
    clientId: client.id,
    year: parsedYear,
    recipientEmail,
    recipientPhone,
    attachmentNames: normalizedAttachments.map((a) => a.filename),
    invoiceIds: sentScope.invoiceIds,
    propertyIds: sentScope.propertyIds,
    storedFiles: [],
  };

  const warnings = [];
  let uploadedFiles = [];
  const logPrefix = `[InvoiceDelivery clientId=${client.id}${parsedYear ? ` year=${parsedYear}` : ""}]`;

  try {
    const { storedFiles, storageWarning } = await uploadInvoiceAttachments(
      client.id,
      parsedYear,
      normalizedAttachments
    );
    uploadedFiles = storedFiles;
    deliveryBase.storedFiles = storedFiles;
    if (storageWarning) warnings.push(storageWarning);

    let emailResult;
    try {
      console.info(
        `${logPrefix} sending email to ${recipientEmail} with ${normalizedAttachments.length} attachment(s)...`
      );
      emailResult = await sendTransactionalEmail({
        toEmail: recipientEmail,
        toName: clientName,
        subject,
        htmlContent,
        attachments: normalizedAttachments,
        tags: ["invoice-delivery", `client-${client.id}`],
      });
      console.info(
        `${logPrefix} email sent${emailResult.messageId ? ` messageId=${emailResult.messageId}` : ""}`
      );
    } catch (emailErr) {
      console.warn(`${logPrefix} failed to send email: ${emailErr.message}`);
      throw emailErr;
    }

    let smsStatus = shouldSendSms ? "PENDING" : "SKIPPED";
    let smsSentAt = null;
    let smsError = null;
    let smsResult = { messageId: null };

    if (!shouldSendSms) {
      console.info(`${logPrefix} SMS skipped: sendSms=false`);
    } else if (!recipientPhone) {
      smsStatus = "SKIPPED";
      smsError = "Client phone number is missing; SMS was not sent";
      console.warn(`${logPrefix} SMS skipped: client phone number is missing or invalid`);
    } else {
      try {
        console.info(`${logPrefix} sending SMS to ${recipientPhone}...`);
        smsResult = await sendTransactionalSms({
          recipient: recipientPhone,
          content: getInvoiceSmsText({
            clientName,
            year: parsedYear,
            recipientEmail,
          }),
        });
        smsStatus = "ACCEPTED";
        smsSentAt = new Date();
        console.info(
          `${logPrefix} SMS accepted by Brevo${
            smsResult.messageId ? ` messageId=${smsResult.messageId}` : ""
          }; carrier delivery is asynchronous`
        );
      } catch (smsErr) {
        smsStatus = "FAILED";
        smsError = smsErr.message;
        console.warn(`${logPrefix} failed to send SMS: ${smsErr.message}`);
      }
    }

    const delivery = await createDeliveryLog({
      ...deliveryBase,
      emailStatus: "SENT",
      emailLastEvent: "SENT",
      smsStatus,
      emailSentAt: new Date(),
      smsSentAt,
      brevoEmailMessageId: emailResult.messageId,
      errorMessage: [smsError, storageWarning].filter(Boolean).join(" | ") || null,
    });

    const combinedWarning = [...warnings, smsError].filter(Boolean).join(" | ") || undefined;

    return {
      success: true,
      clientId: client.id,
      recipientEmail,
      recipientPhone,
      emailStatus: "SENT",
      emailLastEvent: "SENT",
      smsStatus,
      brevoEmailMessageId: emailResult.messageId,
      brevoSmsMessageId: smsResult.messageId,
      deliveryId: delivery.id,
      storedFiles,
      warning: combinedWarning,
    };
  } catch (err) {
    await createDeliveryLog({
      ...deliveryBase,
      storedFiles: uploadedFiles,
      emailStatus: "FAILED",
      smsStatus: shouldSendSms ? "SKIPPED" : "SKIPPED",
      errorMessage: err.message,
    });
    throw err;
  }
}

function groupInvoicesByClient(invoices = []) {
  const grouped = new Map();

  for (const invoice of invoices) {
    const client = invoice.property?.client;
    if (!client?.id) continue;

    if (!grouped.has(client.id)) {
      grouped.set(client.id, {
        client,
        invoices: [],
        propertyAddresses: new Set(),
        years: new Set(),
        paidDates: new Set(),
        totalPaymentAmount: 0,
      });
    }

    const entry = grouped.get(client.id);
    entry.invoices.push(invoice);
    if (invoice.year != null) entry.years.add(invoice.year);
    if (invoice.paidDate?.trim()) entry.paidDates.add(invoice.paidDate.trim());
    const address = invoice.property?.propertyAddress?.trim();
    if (address) entry.propertyAddresses.add(address);

    const clientContingencyFee =
      client.contingencyFee != null ? Number(client.contingencyFee) : 25;
    entry.totalPaymentAmount += resolveInvoiceDueAmount(invoice, clientContingencyFee);
  }

  return grouped;
}

/**
 * Send payment acknowledgement emails via Brevo for paid invoices, grouped by client.
 */
export async function sendPaymentAcknowledgementEmailsForInvoices({
  invoiceIds,
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

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids } },
    include: {
      property: {
        select: {
          propertyAddress: true,
          client: {
            select: {
              id: true,
              clientName: true,
              email: true,
              billingEmail: true,
              type: true,
              isArchived: true,
              contingencyFee: true,
            },
          },
        },
      },
    },
  });

  if (!invoices.length) {
    throw new Error("No matching invoices found for the provided invoiceIds");
  }

  const grouped = groupInvoicesByClient(invoices);
  const sent = [];
  const skipped = [];
  const failed = [];

  for (const [clientId, entry] of grouped) {
    const { client } = entry;
    const recipientEmail = (client.billingEmail || client.email || "").trim();
    const clientName = client.clientName || "Client";
    const propertyAddresses = [...entry.propertyAddresses];
    const years = [...entry.years];

    if (client.type !== "CLIENT" || client.isArchived) {
      skipped.push({
        clientId,
        reason: "Client not found or archived",
      });
      continue;
    }

    if (!recipientEmail) {
      skipped.push({
        clientId,
        reason: "Client billing email or email is missing",
      });
      continue;
    }

    const subject = getPaymentAcknowledgementSubject();
    const htmlContent =
      customMessage?.trim() ||
      getPaymentAcknowledgementHtml({
        clientName,
        paymentAmount: entry.totalPaymentAmount,
        propertyAddresses,
      });

    const logPrefix = `[PaymentAck clientId=${clientId}]`;

    try {
      console.info(`${logPrefix} sending acknowledgement email to ${recipientEmail}...`);
      const emailResult = await sendTransactionalEmail({
        toEmail: recipientEmail,
        toName: clientName,
        subject,
        htmlContent,
        tags: ["payment-acknowledgement", `client-${clientId}`],
      });

      const delivery = await createDeliveryLog({
        clientId,
        year: years.length === 1 ? years[0] : null,
        recipientEmail,
        recipientPhone: null,
        emailStatus: "SENT",
        emailLastEvent: "SENT",
        smsStatus: "SKIPPED",
        emailSentAt: new Date(),
        brevoEmailMessageId: emailResult.messageId,
        attachmentNames: [],
        storedFiles: [],
      });

      console.info(
        `${logPrefix} acknowledgement email sent${
          emailResult.messageId ? ` messageId=${emailResult.messageId}` : ""
        }`
      );

      sent.push({
        clientId,
        recipientEmail,
        deliveryId: delivery.id,
        brevoEmailMessageId: emailResult.messageId,
        invoiceIds: entry.invoices.map((invoice) => invoice.id),
      });
    } catch (err) {
      console.warn(`${logPrefix} failed to send acknowledgement email: ${err.message}`);
      await createDeliveryLog({
        clientId,
        year: years.length === 1 ? years[0] : null,
        recipientEmail,
        recipientPhone: null,
        emailStatus: "FAILED",
        smsStatus: "SKIPPED",
        attachmentNames: [],
        storedFiles: [],
        errorMessage: err.message,
      });
      failed.push({
        clientId,
        recipientEmail,
        error: err.message,
        invoiceIds: entry.invoices.map((invoice) => invoice.id),
      });
    }
  }

  return {
    attempted: grouped.size,
    sentCount: sent.length,
    skippedCount: skipped.length,
    failedCount: failed.length,
    sent,
    skipped,
    failed,
  };
}

/**
 * Resolve invoice-page filters into client recipients for bulk invoice delivery.
 */
export async function getBulkInvoiceRecipients({ filters = {}, limit = MAX_BULK_RECIPIENTS } = {}) {
  const normalizedFilters = normalizeBulkInvoiceFilters(filters);
  const recipientLimit = Math.min(
    Math.max(parseInt(limit, 10) || MAX_BULK_RECIPIENTS, 1),
    MAX_BULK_RECIPIENTS
  );

  const invoices = await prisma.invoice.findMany({
    where: bulkInvoiceWhere(normalizedFilters),
    include: {
      property: {
        select: {
          id: true,
          accountNumber: true,
          cadCounty: true,
          propertyAddress: true,
          client: {
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
          },
        },
      },
    },
    orderBy: [{ year: "desc" }, { id: "asc" }],
    take: MAX_BULK_INVOICES,
  });

  const clientsById = new Map();
  for (const invoice of invoices) {
    const client = invoice.property?.client;
    if (!client || (normalizedFilters.hasEmail && !hasUsableEmail(client))) continue;

    if (!clientsById.has(client.id)) {
      clientsById.set(client.id, {
        clientId: client.id,
        clientNumber: client.clientNumber,
        clientName: client.clientName,
        recipientEmail: (client.billingEmail || client.email || "").trim() || null,
        recipientPhone: toE164(client.phoneNumber),
        hasEmail: hasUsableEmail(client),
        invoiceCount: 0,
        totalInvoiceAmount: 0,
        invoiceIds: [],
        years: new Set(),
        propertyIds: new Set(),
        propertyNumbers: new Set(),
        cadCounties: new Set(),
        invoices: [],
      });
    }

    const row = clientsById.get(client.id);
    const clientContingencyFee =
      invoice.contingencyFee != null ? Number(invoice.contingencyFee) : 25;
    const dueAmount = resolveInvoiceDueAmount(invoice, clientContingencyFee);
    row.invoiceCount += 1;
    row.totalInvoiceAmount += dueAmount;
    row.invoiceIds.push(invoice.id);
    if (invoice.year) row.years.add(invoice.year);
    if (invoice.propertyId) row.propertyIds.add(invoice.propertyId);
    if (invoice.accountNumber || invoice.property?.accountNumber) {
      row.propertyNumbers.add(invoice.accountNumber || invoice.property.accountNumber);
    }
    if (invoice.property?.cadCounty) row.cadCounties.add(invoice.property.cadCounty);
    row.invoices.push({
      id: invoice.id,
      propertyId: invoice.propertyId,
      accountNumber: invoice.accountNumber,
      year: invoice.year,
      bppInvoice: invoice.bppInvoice ?? null,
      bppInvoiceAmount: parseBppInvoiceAmount(invoice.bppInvoice),
      invoiceAmount: dueAmount,
      paidDate: invoice.paidDate,
      propertyAddress: invoice.property?.propertyAddress || null,
      cadCounty: invoice.property?.cadCounty || null,
    });
  }

  const allRecipients = Array.from(clientsById.values());
  const returnedRecipients = allRecipients.slice(0, recipientLimit);
  const deliveryClientIds = returnedRecipients.map((recipient) => recipient.clientId);

  const latestDeliveries = deliveryClientIds.length
    ? await prisma.invoiceDelivery.findMany({
        where: {
          clientId: { in: deliveryClientIds },
          emailStatus: "SENT",
          ...(normalizedFilters.years.length ? { year: { in: normalizedFilters.years } } : {}),
        },
        orderBy: [{ emailSentAt: "desc" }, { createdAt: "desc" }],
      })
    : [];
  const latestDeliveryByClient = new Map();
  for (const delivery of latestDeliveries) {
    if (!latestDeliveryByClient.has(delivery.clientId)) {
      latestDeliveryByClient.set(delivery.clientId, delivery);
    }
  }

  const recipients = returnedRecipients.map((recipient) => {
    const latestDelivery = latestDeliveryByClient.get(recipient.clientId);
    return {
      ...recipient,
      totalInvoiceAmount: Number(recipient.totalInvoiceAmount.toFixed(2)),
      years: Array.from(recipient.years).sort((a, b) => b - a),
      propertyIds: Array.from(recipient.propertyIds),
      propertyNumbers: Array.from(recipient.propertyNumbers),
      cadCounties: Array.from(recipient.cadCounties),
      canSend: recipient.hasEmail,
      skipReason: recipient.hasEmail ? null : "Client billing email or email is missing",
      lastDelivery: latestDelivery
        ? toDeliveryTrackingDto(latestDelivery)
        : null,
    };
  });

  return {
    filters: normalizedFilters,
    totalMatchedClients: allRecipients.length,
    totalReturned: recipients.length,
    truncated: allRecipients.length > recipientLimit || invoices.length === MAX_BULK_INVOICES,
    recipients,
  };
}

function normalizeBulkAttachmentMap(attachmentsByClient, recipients) {
  const map = new Map();

  const addEntry = (clientId, entry) => {
    const idNum = parseInt(clientId, 10);
    if (Number.isNaN(idNum) || entry == null) return;
    map.set(idNum, Array.isArray(entry) ? { attachments: entry } : entry);
  };

  if (Array.isArray(recipients)) {
    for (const recipient of recipients) {
      if (recipient?.attachments) addEntry(recipient.clientId, recipient);
    }
  }

  if (Array.isArray(attachmentsByClient)) {
    for (const entry of attachmentsByClient) {
      addEntry(entry?.clientId, entry);
    }
  } else if (attachmentsByClient && typeof attachmentsByClient === "object") {
    for (const [clientId, entry] of Object.entries(attachmentsByClient)) {
      addEntry(clientId, entry);
    }
  }

  return map;
}

function parseBulkYear(year, fieldName = "year") {
  if (year == null || year === "") return null;
  const parsed = parseInt(year, 10);
  if (Number.isNaN(parsed) || parsed < 1900 || parsed > 2100) {
    throw new Error(`${fieldName} is invalid`);
  }
  return parsed;
}

function hasBulkSelection(filters, attachmentClientIds) {
  return (
    attachmentClientIds.length > 0 ||
    filters.invoiceIds.length > 0 ||
    filters.clientIds.length > 0 ||
    filters.propertyIds.length > 0 ||
    filters.years.length > 0 ||
    filters.accountNumbers.length > 0 ||
    filters.cadCounties.length > 0 ||
    Boolean(filters.search)
  );
}

/**
 * Send invoice PDFs to all clients matching the provided invoice-page filters.
 *
 * attachmentsByClient can be either:
 * - [{ clientId, attachments, year?, customMessage? }]
 * - { "123": { attachments, year?, customMessage? } }
 * - { "123": [{ filename, contentBase64 }] }
 */
export async function sendInvoicesToClientsBulk({
  filters = {},
  recipients = [],
  attachmentsByClient,
  year = null,
  sendSms = true,
  customMessage = null,
  limit = MAX_BULK_RECIPIENTS,
} = {}) {
  const attachmentMap = normalizeBulkAttachmentMap(attachmentsByClient, recipients);
  const attachmentClientIds = Array.from(attachmentMap.keys());
  const requestedFilters = { ...filters };
  if (!toList(requestedFilters.clientIds).length && attachmentClientIds.length) {
    requestedFilters.clientIds = attachmentClientIds;
  }

  const normalizedFilters = normalizeBulkInvoiceFilters(requestedFilters);
  if (!hasBulkSelection(normalizedFilters, attachmentClientIds)) {
    throw new Error("At least one bulk recipient filter or attachmentsByClient entry is required");
  }

  const recipientPreview = await getBulkInvoiceRecipients({
    filters: normalizedFilters,
    limit,
  });
  const fallbackYear =
    parseBulkYear(year) ||
    (normalizedFilters.years.length === 1 ? normalizedFilters.years[0] : null);

  const results = [];
  const matchedClientIds = new Set();

  for (const recipient of recipientPreview.recipients) {
    matchedClientIds.add(recipient.clientId);
    const attachmentEntry = attachmentMap.get(recipient.clientId);
    const attachments = attachmentEntry?.attachments;

    if (!recipient.canSend) {
      results.push({
        clientId: recipient.clientId,
        clientName: recipient.clientName,
        success: false,
        status: "SKIPPED",
        error: recipient.skipReason,
      });
      continue;
    }

    if (!Array.isArray(attachments) || attachments.length === 0) {
      results.push({
        clientId: recipient.clientId,
        clientName: recipient.clientName,
        success: false,
        status: "SKIPPED",
        error: "No PDF attachments were provided for this client",
      });
      continue;
    }

    try {
      const propertyAddresses = [
        ...new Set(
          (recipient.invoices || [])
            .map((invoice) => invoice.propertyAddress?.trim())
            .filter(Boolean)
        ),
      ];
      const sent = await sendInvoiceToClient({
        clientId: recipient.clientId,
        year: parseBulkYear(attachmentEntry.year, "recipient.year") || fallbackYear,
        sendSms,
        attachments,
        customMessage: attachmentEntry.customMessage ?? customMessage,
        propertyAddresses,
        invoiceIds: recipient.invoiceIds,
        propertyIds: recipient.propertyIds,
      });
      results.push({
        clientId: recipient.clientId,
        clientName: recipient.clientName,
        success: true,
        status: "SENT",
        data: sent,
      });
    } catch (err) {
      results.push({
        clientId: recipient.clientId,
        clientName: recipient.clientName,
        success: false,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  for (const clientId of attachmentClientIds) {
    if (matchedClientIds.has(clientId)) continue;
    results.push({
      clientId,
      success: false,
      status: "SKIPPED",
      error: "Client did not match the bulk filters or has no matching invoices",
    });
  }

  const summary = {
    matchedClients: recipientPreview.totalMatchedClients,
    attempted: results.filter((result) => result.status !== "SKIPPED").length,
    sent: results.filter((result) => result.success).length,
    failed: results.filter((result) => result.status === "FAILED").length,
    skipped: results.filter((result) => result.status === "SKIPPED").length,
  };

  return {
    success: summary.failed === 0,
    summary,
    filters: recipientPreview.filters,
    truncated: recipientPreview.truncated,
    results,
  };
}

/**
 * Short-lived signed URL for a stored invoice PDF from a delivery record.
 */
export async function getInvoiceDeliveryDownloadUrl(deliveryId, fileIndex = 0, expiresIn = 3600) {
  const idNum = parseInt(deliveryId, 10);
  if (Number.isNaN(idNum)) throw new Error("Invalid deliveryId");

  const delivery = await prisma.invoiceDelivery.findUnique({
    where: { id: idNum },
  });
  if (!delivery) throw new Error("Delivery not found");

  const files = Array.isArray(delivery.storedFiles) ? delivery.storedFiles : [];
  const index = parseInt(fileIndex, 10) || 0;
  const file = files[index];
  if (!file?.storagePath) {
    throw new Error("Stored invoice file not available");
  }

  const ttl = Math.min(Math.max(parseInt(expiresIn, 10) || 3600, 60), 86400);
  const url = await getInvoiceSignedDownloadUrl(file.storagePath, ttl);
  return {
    url,
    filename: file.filename || `invoice-${delivery.id}.pdf`,
    storagePath: file.storagePath,
  };
}

/**
 * Recent invoice delivery history for a client.
 */
export async function getInvoiceDeliveriesForClient(clientId, limit = 20) {
  const idNum = parseInt(clientId, 10);
  if (Number.isNaN(idNum)) return null;

  const client = await prisma.client.findUnique({
    where: { id: idNum },
    select: { id: true, type: true, isArchived: true },
  });
  if (!client || client.type !== "CLIENT" || client.isArchived) return null;

  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const deliveries = await prisma.invoiceDelivery.findMany({
    where: { clientId: idNum },
    orderBy: { createdAt: "desc" },
    take,
  });

  const syncedDeliveries = await maybeSyncStaleDeliveryTracking(deliveries);

  return {
    clientId: idNum,
    deliveries: syncedDeliveries.map((delivery) => ({
      ...delivery,
      emailTracking: toDeliveryTrackingDto(delivery),
    })),
  };
}
