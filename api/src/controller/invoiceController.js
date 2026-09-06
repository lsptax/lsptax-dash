import prisma from "../../prisma/prismaClient.js";
import { generateInvoices, getExistingInvoices } from "../utils/invoiceGenerator.js";
import * as invoiceService from "../services/invoiceService.js";
import {
  sendError,
  convertToXLSX,
  EXPORT_FIELDS,
} from "../services/exportService.js";
import * as invoiceDeliveryService from "../services/invoiceDeliveryService.js";
import { resolveInvoiceDueAmount } from "../utils/invoiceYearlyData.js";

const BULK_INVOICE_FILTER_KEYS = [
  "invoiceIds",
  "clientIds",
  "propertyIds",
  "years",
  "accountNumbers",
  "cadCounties",
  "counties",
  "search",
  "paymentStatus",
  "minInvoiceAmount",
  "maxInvoiceAmount",
  "includeArchivedInvoices",
  "includeArchivedClients",
  "includeArchivedProperties",
  "hasEmail",
];

function pickBulkInvoiceFilters(source = {}) {
  const filters = {};
  for (const key of BULK_INVOICE_FILTER_KEYS) {
    if (source[key] !== undefined) filters[key] = source[key];
  }
  return filters;
}

/**
 * Generate invoices for selected clients and properties (by clientId).
 */
export const generateInvoicesForClients = async (req, res) => {
  try {
    const {
      clientIds,
      propertyAccountNumbers,
      years,
      invoiceDefaults
    } = req.body;

    const clientIdsArray = Array.isArray(clientIds)
      ? clientIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id))
      : [];

    if (clientIdsArray.length === 0) {
      return sendError(res, 400, "At least one client ID is required");
    }

    const yearsToUse = years && Array.isArray(years) && years.length > 0
      ? years
      : [new Date().getFullYear()];

    const existingClients = await prisma.client.findMany({
      where: { type: "CLIENT", id: { in: clientIdsArray } },
      select: { id: true }
    });
    const existingIds = new Set(existingClients.map((c) => c.id));
    const missingIds = clientIdsArray.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return sendError(res, 400, `The following client IDs do not exist: ${missingIds.join(", ")}`);
    }

    const result = await generateInvoices({
      clientIds: clientIdsArray,
      propertyAccountNumbers,
      years: yearsToUse,
      invoiceDefaults
    });

    const totalProcessed = result.createdInvoices + result.updatedInvoices;
    const message = result.updatedInvoices > 0
      ? `Successfully processed ${totalProcessed} invoices (${result.createdInvoices} created, ${result.updatedInvoices} updated)`
      : `Successfully generated ${result.createdInvoices} invoices`;

    res.status(200).json({
      success: true,
      message,
      data: result
    });

  } catch (error) {
    console.error("Error generating invoices:", error);
    sendError(res, 500, "Failed to generate invoices", error);
  }
};

/**
 * Get available properties for invoice generation (by clientIds).
 */
export const getPropertiesForInvoiceGeneration = async (req, res) => {
  try {
    const { clientIds } = req.query;

    if (!clientIds) {
      return sendError(res, 400, "Client IDs are required (query: clientIds)");
    }

    const clientIdsArray = (Array.isArray(clientIds)
      ? clientIds
      : clientIds.split(",").map((id) => id.trim())
    ).map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id));

    if (clientIdsArray.length === 0) {
      return sendError(res, 400, "At least one valid client ID is required");
    }

    const existingClients = await prisma.client.findMany({
      where: { type: "CLIENT", id: { in: clientIdsArray } },
      select: { id: true, clientNumber: true, clientName: true, email: true }
    });
    const clientMap = new Map(existingClients.map((c) => [c.id, c]));
    const missingIds = clientIdsArray.filter((id) => !clientMap.has(id));
    if (missingIds.length > 0) {
      return sendError(res, 400, `The following client IDs do not exist: ${missingIds.join(", ")}`);
    }

    const properties = await prisma.property.findMany({
      where: { clientId: { in: clientIdsArray }, isArchived: false },
      orderBy: [{ clientId: "asc" }, { accountNumber: "asc" }]
    });

    const propertiesByClient = {};
    for (const property of properties) {
      const cid = property.clientId;
      if (!propertiesByClient[cid]) {
        propertiesByClient[cid] = {
          client: clientMap.get(cid),
          properties: []
        };
      }
      propertiesByClient[cid].properties.push(property);
    }

    // Get existing invoices for these properties
    const propertyAccountNumbers = properties.map(p => p.accountNumber);
    const existingInvoices = await getExistingInvoices(propertyAccountNumbers);

    // Create a map of existing invoices for quick lookup
    const existingInvoiceMap = new Map();
    for (const invoice of existingInvoices) {
      const key = `${invoice.accountNumber}-${invoice.year}`;
      if (!existingInvoiceMap.has(key)) {
        existingInvoiceMap.set(key, []);
      }
      existingInvoiceMap.get(key).push(invoice);
    }

    for (const cid in propertiesByClient) {
      for (const property of propertiesByClient[cid].properties) {
        property.existingInvoices = [];
        for (
          let year = new Date().getFullYear() - 4;
          year <= new Date().getFullYear() + 1;
          year++
        ) {
          const key = `${property.accountNumber}-${year}`;
          if (existingInvoiceMap.has(key)) {
            property.existingInvoices.push(...existingInvoiceMap.get(key));
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        clients: Object.values(propertiesByClient),
        totalProperties: properties.length,
        totalClients: Object.keys(propertiesByClient).length
      }
    });

  } catch (error) {
    console.error("Error getting properties for invoice generation:", error);
    sendError(res, 500, "Failed to get properties for invoice generation", error);
  }
};

/**
 * Get all clients for invoice generation selection
 */
export const getClientsForInvoiceGeneration = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        type: "CLIENT",
        isArchived: false
      },
      select: {
        id: true,
        clientNumber: true,
        clientName: true,
        email: true,
        phoneNumber: true,
        _count: {
          select: {
            properties: true
          }
        }
      },
      orderBy: {
        clientName: 'asc'
      }
    });

    // Use Prisma relation count (avoids N+1 queries)
    const clientsWithPropertyCounts = clients.map((c) => ({
      id: c.id,
      clientNumber: c.clientNumber,
      clientName: c.clientName,
      email: c.email,
      phoneNumber: c.phoneNumber,
      propertyCount: c._count?.properties ?? 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        clients: clientsWithPropertyCounts,
        totalClients: clientsWithPropertyCounts.length
      }
    });

  } catch (error) {
    console.error("Error getting clients for invoice generation:", error);
    sendError(res, 500, "Failed to get clients for invoice generation", error);
  }
};

/**
 * Get invoice generation statistics (filter by clientIds).
 */
export const getInvoiceGenerationStats = async (req, res) => {
  try {
    const { clientIds, years } = req.query;

    const clientIdsArray = clientIds
      ? (Array.isArray(clientIds) ? clientIds : clientIds.split(",").map((id) => id.trim()))
          .map((id) => parseInt(id, 10))
          .filter((id) => !Number.isNaN(id))
      : [];

    const yearsArray = years
      ? (Array.isArray(years) ? years.map((y) => parseInt(y)) : years.split(",").map((y) => parseInt(y.trim())))
      : [new Date().getFullYear()];

    let propertyIds = null;
    if (clientIdsArray.length > 0) {
      const props = await prisma.property.findMany({
        where: { clientId: { in: clientIdsArray } },
        select: { id: true }
      });
      propertyIds = props.map((p) => p.id);
      if (propertyIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            totalInvoices: 0,
            totalAmount: 0,
            uniqueClients: 0,
            uniqueProperties: 0,
            invoicesByYear: {},
            filters: { clientIds: clientIdsArray, years: yearsArray }
          }
        });
      }
    }

    const whereClause = {};
    if (propertyIds && propertyIds.length > 0) whereClause.propertyId = { in: propertyIds };
    if (yearsArray.length > 0) whereClause.year = { in: yearsArray };

    const existingInvoices = await prisma.invoice.findMany({
      where: whereClause,
    });

    const totalInvoices = existingInvoices.length;
    const totalAmount = existingInvoices.reduce((sum, inv) => {
      const clientContingencyFee =
        inv.contingencyFee != null ? Number(inv.contingencyFee) : 25;
      return sum + resolveInvoiceDueAmount(inv, clientContingencyFee);
    }, 0);
    const uniqueProperties = new Set(existingInvoices.map((inv) => inv.accountNumber)).size;

    const invoicesByYear = {};
    for (const invoice of existingInvoices) {
      if (!invoicesByYear[invoice.year]) {
        invoicesByYear[invoice.year] = { count: 0, amount: 0 };
      }
      invoicesByYear[invoice.year].count++;
      invoicesByYear[invoice.year].amount += resolveInvoiceDueAmount(
        invoice,
        invoice.contingencyFee != null ? Number(invoice.contingencyFee) : 25
      );
    }

    res.status(200).json({
      success: true,
      data: {
        totalInvoices,
        totalAmount,
        uniqueClients: clientIdsArray.length || (propertyIds ? 1 : 0),
        uniqueProperties,
        invoicesByYear,
        filters: { clientIds: clientIdsArray, years: yearsArray }
      }
    });

  } catch (error) {
    console.error("Error getting invoice generation stats:", error);
    sendError(res, 500, "Failed to get invoice generation statistics", error);
  }
};

export const getInvoiceByProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await invoiceService.getInvoiceByPropertyId(id);
    if (!result) return res.status(404).json({ message: "Property not found." });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching property invoices:", error);
    res.status(500).json({ message: "Failed to fetch property invoices." });
  }
};

export const getInvoicesByClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset, search } = req.query;
    const result = await invoiceService.getInvoicesByClientId(id, limit, offset, search);
    if (!result) return res.status(404).json({ message: "Client not found." });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching client invoices:", error);
    res.status(500).json({ message: "Failed to fetch client invoices." });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const { limit, offset, search, sendStatus, paymentStatus } = req.query;
    const result = await invoiceService.getAllInvoices(
      limit,
      offset,
      search,
      sendStatus,
      paymentStatus
    );
    res.status(200).json(result);
  } catch (error) {
    const status = /paymentStatus must be/i.test(error.message) ? 400 : 500;
    res.status(status).json({ message: error.message || "Failed to fetch all invoices." });
  }
};

export const getArchiveInvoices = async (req, res) => {
  try {
    const { limit, offset, search, sendStatus, paymentStatus } = req.query;
    const result = await invoiceService.getArchiveInvoices(
      limit,
      offset,
      search,
      sendStatus,
      paymentStatus
    );
    res.status(200).json(result);
  } catch (error) {
    const status = /paymentStatus must be/i.test(error.message) ? 400 : 500;
    res.status(status).json({ message: error.message || "Failed to fetch all invoices." });
  }
};

/**
 * Toggle paid status for one or more invoices.
 * Body: {
 *   invoiceIds: number|number[],
 *   isPaid: boolean,
 *   paidDate?: string,
 *   paymentNotes?: string,
 *   sendAcknowledgementEmail?: boolean,
 *   customMessage?: string
 * }
 */
export const updateInvoicePaymentStatus = async (req, res) => {
  try {
    const {
      invoiceIds,
      isPaid,
      paidDate,
      paymentNotes,
      sendAcknowledgementEmail,
      customMessage,
    } = req.body || {};
    const result = await invoiceService.updateInvoicePaymentStatus({
      invoiceIds,
      isPaid,
      paidDate,
      paymentNotes,
      sendAcknowledgementEmail: Boolean(sendAcknowledgementEmail),
      customMessage,
    });
    const acknowledgement = result.acknowledgementEmail;
    let message = isPaid ? "Invoice(s) marked as paid" : "Invoice(s) marked as unpaid";
    if (acknowledgement) {
      if (acknowledgement.sentCount > 0 && acknowledgement.failedCount === 0) {
        message += `; acknowledgement email sent to ${acknowledgement.sentCount} client(s)`;
      } else if (acknowledgement.sentCount > 0) {
        message += `; acknowledgement email sent to ${acknowledgement.sentCount} client(s), ${acknowledgement.failedCount} failed`;
      } else if (acknowledgement.failedCount > 0) {
        message += `; acknowledgement email failed for ${acknowledgement.failedCount} client(s)`;
      } else if (acknowledgement.skippedCount > 0) {
        message += "; acknowledgement email skipped (no client email on file)";
      }
    }
    res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    console.error("Error updating invoice payment status:", error);
    const status = /No matching invoices/i.test(error.message)
      ? 404
      : /required|must be|boolean|valid date/i.test(error.message)
        ? 400
        : 500;
    sendError(res, status, error.message || "Failed to update invoice payment status", error);
  }
};

export const getCounts = async (req, res) => {
  try {
    const result = await invoiceService.getCounts();
    res.json(result);
  } catch (error) {
    console.error("Error fetching stats:", error);
    sendError(res, 500, "Failed to fetch counts", error);
  }
};

export const downloadInvoicesXLSX = async (req, res) => {
  try {
    const invoices = await invoiceService.getInvoicesForExport();
    const buffer = convertToXLSX(invoices, EXPORT_FIELDS.invoices, "Invoices");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=invoices.xlsx");
    res.status(200).send(buffer);
  } catch (error) {
    sendError(res, 500, "Error downloading invoices XLSX", error);
  }
};

/**
 * Send client-generated invoice PDF(s) to the client via Brevo email + optional SMS.
 *
 * Body:
 * {
 *   "clientId": number,
 *   "year"?: number,
 *   "sendSms"?: boolean (default true),
 *   "customMessage"?: string (HTML),
 *   "attachments": [{ "filename": string, "contentBase64": string }],
 *   "propertyAddresses"?: string[],
 *   "invoiceIds"?: number[],
 *   "propertyIds"?: number[]
 * }
 *
 * Prefer propertyAddresses / invoiceIds / propertyIds so the email subject
 * only lists the properties for the invoice(s) being sent.
 */
export const sendInvoiceToClient = async (req, res) => {
  try {
    const {
      clientId,
      year,
      sendSms,
      attachments,
      customMessage,
      propertyAddresses,
      invoiceIds,
      propertyIds,
    } = req.body;

    if (!clientId) {
      return sendError(res, 400, "clientId is required");
    }

    const result = await invoiceDeliveryService.sendInvoiceToClient({
      clientId,
      year,
      sendSms,
      attachments,
      customMessage,
      propertyAddresses,
      invoiceIds,
      propertyIds,
    });

    const message =
      result.smsStatus === "FAILED"
        ? "Invoice emailed successfully, but SMS notification failed"
        : result.smsStatus === "ACCEPTED"
          ? "Invoice emailed successfully; SMS was accepted by Brevo and is awaiting carrier delivery"
          : "Invoice sent successfully";

    res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    console.error("Error sending invoice to client:", error);
    const status =
      error.message === "Client not found"
        ? 404
        : /required|invalid|must be|exceeds/i.test(error.message)
          ? 400
          : 500;
    sendError(res, status, error.message || "Failed to send invoice", error);
  }
};

/**
 * Preview clients matching invoice-page filters before bulk invoice delivery.
 *
 * Query filters:
 * invoiceIds, clientIds, propertyIds, years, accountNumbers, cadCounties/counties,
 * search, paymentStatus=any|paid|unpaid, minInvoiceAmount, maxInvoiceAmount.
 */
export const getBulkInvoiceRecipients = async (req, res) => {
  try {
    const result = await invoiceDeliveryService.getBulkInvoiceRecipients({
      filters: pickBulkInvoiceFilters(req.query),
      limit: req.query.limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error getting bulk invoice recipients:", error);
    const status = /required|invalid|must be|valid|one of/i.test(error.message) ? 400 : 500;
    sendError(res, status, error.message || "Failed to get bulk invoice recipients", error);
  }
};

/**
 * Send invoice PDFs in bulk to clients matching invoice-page filters.
 *
 * Body:
 * {
 *   "filters": { ...same filters as preview... },
 *   "sendSms"?: boolean,
 *   "year"?: number,
 *   "customMessage"?: string,
 *   "attachmentsByClient": [
 *     { "clientId": number, "year"?: number, "attachments": [{ "filename": string, "contentBase64": string }] }
 *   ]
 * }
 */
export const sendBulkInvoicesToClients = async (req, res) => {
  try {
    const {
      filters = {},
      recipients,
      attachmentsByClient,
      year,
      sendSms,
      customMessage,
      limit,
    } = req.body;

    const result = await invoiceDeliveryService.sendInvoicesToClientsBulk({
      filters: {
        ...filters,
        ...pickBulkInvoiceFilters(req.body),
      },
      recipients,
      attachmentsByClient,
      year,
      sendSms,
      customMessage,
      limit,
    });

    const message =
      result.summary.sent > 0
        ? `Bulk invoice send completed: ${result.summary.sent} sent, ${result.summary.failed} failed, ${result.summary.skipped} skipped`
        : "Bulk invoice send completed with no invoices sent";

    res.status(200).json({
      success: result.success,
      message,
      data: result,
    });
  } catch (error) {
    console.error("Error sending bulk invoices:", error);
    const status = /required|invalid|must be|valid|one of|At least one/i.test(error.message)
      ? 400
      : 500;
    sendError(res, status, error.message || "Failed to send bulk invoices", error);
  }
};

/**
 * Delivery history for a client. Query: clientId (required), limit (optional).
 */
export const getInvoiceDeliveries = async (req, res) => {
  try {
    const { clientId, limit } = req.query;
    if (!clientId) {
      return sendError(res, 400, "clientId is required");
    }

    const result = await invoiceDeliveryService.getInvoiceDeliveriesForClient(
      clientId,
      limit
    );
    if (!result) {
      return sendError(res, 404, "Client not found");
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching invoice deliveries:", error);
    sendError(res, 500, "Failed to fetch invoice deliveries", error);
  }
};

/**
 * GET /invoice/deliveries/:deliveryId/download-url?fileIndex=0&expiresIn=3600
 * Short-lived signed URL for a stored invoice PDF in Supabase.
 */
export const getInvoiceDeliveryDownloadUrl = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { fileIndex, expiresIn } = req.query;

    const result = await invoiceDeliveryService.getInvoiceDeliveryDownloadUrl(
      deliveryId,
      fileIndex,
      expiresIn
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Error getting invoice download URL:", error);
    const status =
      error.message === "Delivery not found"
        ? 404
        : error.message === "Stored invoice file not available"
          ? 404
          : 500;
    sendError(res, status, error.message || "Failed to get download URL", error);
  }
};

/**
 * POST /webhooks/brevo
 * Brevo transactional email webhook (delivered, opened, bounced, etc.).
 * Configure in Brevo with URL: https://<host>/webhooks/brevo?secret=<BREVO_WEBHOOK_SECRET>
 */
export async function brevoWebhook(req, res) {
  const secret = (process.env.BREVO_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return res.status(503).send("Webhook not configured");
  }

  const provided =
    req.query.secret ||
    req.get("X-Brevo-Webhook-Secret") ||
    req.get("x-brevo-webhook-secret");

  if (provided !== secret) {
    return res.status(401).send("Unauthorized");
  }

  const payloads = Array.isArray(req.body) ? req.body : [req.body || {}];
  let hadError = false;

  for (const payload of payloads) {
    const messageId =
      payload["message-id"] ?? payload.messageId ?? payload.message_id;
    const event = payload.event;
    if (!messageId || !event) continue;

    try {
      await invoiceDeliveryService.applyBrevoEmailEvent({
        messageId,
        event,
        eventTime: payload,
        reason: payload.reason,
      });
    } catch (err) {
      hadError = true;
      console.error("Brevo webhook processing error:", err);
    }
  }

  if (hadError) {
    return res.status(500).send("processing failed");
  }

  return res.status(200).send("ok");
};

/**
 * POST /invoice/deliveries/:deliveryId/sync-tracking
 * Pull latest email tracking from Brevo for one delivery (fallback when webhooks are unavailable).
 */
export const syncInvoiceDeliveryTracking = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const delivery = await invoiceDeliveryService.syncEmailTrackingFromBrevo(deliveryId);

    res.status(200).json({
      success: true,
      data: {
        deliveryId: delivery.id,
        emailTracking: invoiceDeliveryService.toDeliveryTrackingDto(delivery),
      },
    });
  } catch (error) {
    console.error("Error syncing invoice delivery tracking:", error);
    const status =
      error.message === "Delivery not found"
        ? 404
        : error.message === "Invalid deliveryId"
          ? 400
          : 500;
    sendError(res, status, error.message || "Failed to sync delivery tracking", error);
  }
};

/**
 * POST /invoice/deliveries/sync-tracking
 * Pull latest Brevo email tracking for recent deliveries (invoice list manual sync).
 */
export const syncInvoiceDeliveriesTracking = async (req, res) => {
  try {
    const limit = req.body?.limit ?? req.query?.limit;
    const offset = req.body?.offset ?? req.query?.offset;
    const onlyStaleRaw = req.body?.onlyStale ?? req.query?.onlyStale;
    const includeResultsRaw = req.body?.includeResults ?? req.query?.includeResults;
    const onlyStale =
      onlyStaleRaw == null || onlyStaleRaw === ""
        ? false
        : ["true", "1", "yes"].includes(String(onlyStaleRaw).toLowerCase()) ||
          onlyStaleRaw === true;
    const includeResults =
      includeResultsRaw == null || includeResultsRaw === ""
        ? false
        : ["true", "1", "yes"].includes(String(includeResultsRaw).toLowerCase()) ||
          includeResultsRaw === true;

    const result = await invoiceDeliveryService.syncDeliveriesFromBrevo({
      limit,
      offset,
      onlyStale,
      includeResults,
    });

    const progress = `${result.synced}/${result.attempted} synced in batch (${result.offset + 1}-${result.offset + result.attempted} of ${result.totalEligible} total)`;
    const message = result.hasMore
      ? `${progress}. ${result.remaining} remaining — call again with offset=${result.nextOffset}`
      : `${progress}. All eligible deliveries synced.`;

    res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    console.error("Error syncing invoice deliveries from Brevo:", error);
    sendError(res, 500, error.message || "Failed to sync deliveries from Brevo", error);
  }
};