import prisma from "../../prisma/prismaClient.js";
import { generateInvoices, getExistingInvoices } from "../utils/invoiceGenerator.js";
import * as invoiceService from "../services/invoiceService.js";
import {
  sendError,
  convertToXLSX,
  EXPORT_FIELDS,
} from "../services/exportService.js";


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
        for (let year = new Date().getFullYear() - 4; year <= new Date().getFullYear(); year++) {
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
      select: { propertyId: true, accountNumber: true, year: true, invoiceAmount: true }
    });

    const totalInvoices = existingInvoices.length;
    const totalAmount = existingInvoices.reduce((sum, inv) => sum + (Number(inv.invoiceAmount) || 0), 0);
    const uniqueProperties = new Set(existingInvoices.map((inv) => inv.accountNumber)).size;

    const invoicesByYear = {};
    for (const invoice of existingInvoices) {
      if (!invoicesByYear[invoice.year]) {
        invoicesByYear[invoice.year] = { count: 0, amount: 0 };
      }
      invoicesByYear[invoice.year].count++;
      invoicesByYear[invoice.year].amount += Number(invoice.invoiceAmount) || 0;
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

// --- Read & export (data routes) ---
export const getInvoice = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await invoiceService.getInvoiceByClientId(clientId);
    if (!result) return res.status(404).json({ message: "Client not found." });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invoices." });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const { limit, offset, search } = req.query;
    const result = await invoiceService.getAllInvoices(limit, offset, search);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all invoices." });
  }
};

export const getArchiveInvoices = async (req, res) => {
  try {
    const { limit, offset, search } = req.query;
    const result = await invoiceService.getArchiveInvoices(limit, offset, search);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all invoices." });
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