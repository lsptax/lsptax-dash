import prisma from "../../prisma/prismaClient.js";
import { PROPERTY_UPDATE_FIELDS } from "../config/constants.js";
import * as propertyService from "../services/propertyService.js";
import {
  sendError,
  convertToCSV,
  convertToXLSX,
  EXPORT_FIELDS,
} from "../services/exportService.js";
import {
  buildInvoicePatchFromYearlyData,
  normalizeYearlyRow,
  normalizeYearlyDataInput,
} from "../utils/invoiceYearlyData.js";

function logEditPropertyDebug(label, data) {
  console.log(`[edit-property] ${label}:`, JSON.stringify(data, null, 2));
}

// --- Mutations (action routes) ---
export const addPropertyToClient = async (req, res) => {
  try {
    const { clientId, propertyData } = req.body;
    if (clientId == null || clientId === "")
      return sendError(res, 400, "Client ID is required");
    const newProperty = await propertyService.addPropertyToClient(clientId, propertyData);
    if (!newProperty) return sendError(res, 404, "Client not found");
    res.status(201).json({
      message: "Property added successfully with invoice rows",
      property: newProperty,
    });
  } catch (error) {
    console.error("Error adding property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const editProperty = async (req, res) => {
  try {
    const { propertyId, propertyDetails, yearlyData, year, invoices } = req.body;
    if (!propertyId) return sendError(res, 400, "Property ID is required");

    logEditPropertyDebug("raw payload", {
      propertyId,
      year: year ?? null,
      topLevelKeys: Object.keys(req.body ?? {}),
      propertyDetails,
      yearlyData,
      invoices: invoices ?? null,
    });

    const existingProperty = await prisma.property.findUnique({
      where: { id: parseInt(propertyId, 10) },
      include: { client: { select: { contingencyFee: true } } },
    });
    if (!existingProperty) return sendError(res, 404, "Property not found");

    const clientContingencyFee =
      existingProperty.client?.contingencyFee != null
        ? Number(existingProperty.client.contingencyFee)
        : 25;

    const updatedProperty = await propertyService.updateProperty(
      propertyId,
      propertyDetails,
      PROPERTY_UPDATE_FIELDS
    );

    const fallbackYear =
      year ??
      propertyDetails?.year ??
      propertyDetails?.selectedYear ??
      new Date().getFullYear();
    const yearlyByYear =
      normalizeYearlyDataInput(yearlyData, { fallbackYear }) ??
      normalizeYearlyDataInput(propertyDetails?.yearlyData, { fallbackYear }) ??
      normalizeYearlyDataInput(invoices, { fallbackYear }) ??
      normalizeYearlyDataInput(propertyDetails, { fallbackYear });

    logEditPropertyDebug("resolved yearlyByYear", yearlyByYear);

    if (yearlyByYear && Object.keys(yearlyByYear).length > 0) {
      const yearEntries = Object.entries(yearlyByYear);
      const years = yearEntries.map(([y]) => parseInt(y, 10));

      const existingInvoices = years.length
        ? await prisma.invoice.findMany({
            where: {
              propertyId: updatedProperty.id,
              year: { in: years },
            },
          })
        : [];
      const invoiceByYear = new Map(existingInvoices.map((inv) => [inv.year, inv]));

      const invoiceOperations = yearEntries.map(async ([y, row]) => {
        const yearInt = parseInt(y, 10);
        const existing = invoiceByYear.get(yearInt) ?? null;
        const normalizedRow = normalizeYearlyRow(row);
        const patch = buildInvoicePatchFromYearlyData(
          normalizedRow,
          existing,
          clientContingencyFee
        );

        logEditPropertyDebug(`year ${yearInt}`, {
          rawRow: row,
          normalizedRow,
          existingInvoice: existing
            ? {
                noticeLandValue: existing.noticeLandValue,
                noticeImprovementValue: existing.noticeImprovementValue,
                noticeMarketValue: existing.noticeMarketValue,
                finalLandValue: existing.finalLandValue,
                finalImprovementValue: existing.finalImprovementValue,
                finalMarketValue: existing.finalMarketValue,
              }
            : null,
          patch,
        });

        return prisma.invoice.upsert({
          where: {
            propertyId_year: {
              propertyId: updatedProperty.id,
              year: yearInt,
            },
          },
          update: patch,
          create: {
            propertyId: updatedProperty.id,
            accountNumber: updatedProperty.accountNumber,
            clientNumber: updatedProperty.clientNumber,
            year: yearInt,
            contingencyFee: clientContingencyFee,
            ...patch,
          },
        });
      });

      await Promise.all(invoiceOperations);
    } else {
      logEditPropertyDebug(
        "no invoice years to save",
        "yearlyData/invoices/propertyDetails had no recognizable invoice fields or year keys"
      );
    }

    const invoiceYearsSaved = yearlyByYear ? Object.keys(yearlyByYear) : [];
    const invoiceSaveSkipped = invoiceYearsSaved.length === 0;

    res.status(200).json({
      message: "Property updated successfully",
      property: updatedProperty,
      invoiceYearsSaved,
      ...(invoiceSaveSkipped && {
        warning:
          "Invoice data was not saved: yearlyData was empty or had no invoice fields. " +
          "Send yearlyData like { \"2026\": { \"noticeLandValue\": 100000, \"noticeImprovementValue\": 50000, ... } }.",
      }),
    });
  } catch (error) {
    console.error("Error updating property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const editProspectProperty = async (req, res) => {
  try {
    const { propertyId, propertyDetails } = req.body;
    if (!propertyId) return sendError(res, 400, "Property ID is required");
    const updatedProperty = await propertyService.updatePropertyMany(
      propertyId,
      propertyDetails,
      PROPERTY_UPDATE_FIELDS
    );
    res.status(200).json({ message: "Property updated successfully", property: updatedProperty });
  } catch (error) {
    console.error("Error updating property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const deleteProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) return sendError(res, 400, "Property ID is required");
    const property = await propertyService.deleteProperty(propertyId);
    if (!property) return sendError(res, 404, "Property not found");
    res.status(200).json({ message: "Property deleted successfully", property });
  } catch (error) {
    console.error("Error deleting property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

// --- Read & export (data routes) ---
export const getProperties = async (req, res) => {
  try {
    const { limit, offset, search, accountType } = req.query;
    const result = await propertyService.getProperties(limit, offset, search, accountType);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error fetching properties", error);
  }
};

export const getArchiveProperties = async (req, res) => {
  try {
    const { limit, offset, search, accountType } = req.query;
    const result = await propertyService.getArchiveProperties(limit, offset, search, accountType);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error fetching properties", error);
  }
};

export const getPropertiesByClients = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await propertyService.getPropertiesByClientId(clientId);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching properties", error);
  }
};

export const getPropertyDetails = async (req, res) => {
  try {
    const { propertyId } = req.query;
    if (!propertyId) return res.status(400).json({ message: "Property ID is required." });
    const data = await propertyService.getPropertyDetails(propertyId);
    if (!data) return res.status(404).json({ message: "Property not found." });
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching property details:", error);
    sendError(res, 500, "An error occurred while fetching property details.", error);
  }
};

export const downloadPropertiesXLSX = async (req, res) => {
  try {
    const { accountType } = req.query;
    const properties = await propertyService.getPropertiesForExport({ accountType });
    const buffer = convertToXLSX(properties, EXPORT_FIELDS.properties, "Properties");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const suffix = accountType ? `-${String(accountType).toLowerCase()}` : "";
    res.setHeader("Content-Disposition", `attachment; filename=properties${suffix}.xlsx`);
    res.status(200).send(buffer);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error downloading properties XLSX", error);
  }
};

export const downloadPropertiesCSV = async (req, res) => {
  try {
    const { accountType } = req.query;
    const properties = await propertyService.getPropertiesForExport({ accountType });
    const csv = convertToCSV(properties, EXPORT_FIELDS.properties);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const suffix = accountType ? `-${String(accountType).toLowerCase()}` : "";
    res.setHeader("Content-Disposition", `attachment; filename=properties${suffix}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error downloading properties CSV", error);
  }
};
