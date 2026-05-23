import prisma from "../../prisma/prismaClient.js";
import { PROPERTY_UPDATE_FIELDS } from "../config/constants.js";
import * as propertyService from "../services/propertyService.js";
import {
  sendError,
  convertToCSV,
  convertToXLSX,
  EXPORT_FIELDS,
} from "../services/exportService.js";

// --- Mutations (action routes) ---
export const addPropertyToClient = async (req, res) => {
  try {
    const { clientId, propertyData } = req.body;
    if (clientId == null || clientId === "")
      return sendError(res, 400, "Client ID is required");
    const newProperty = await propertyService.addPropertyToClient(clientId, propertyData);
    if (!newProperty) return sendError(res, 404, "Client not found");
    res.status(201).json({
      message: "Property added successfully with 5 invoices",
      property: newProperty,
    });
  } catch (error) {
    console.error("Error adding property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const editProperty = async (req, res) => {
  try {
    const { propertyId, propertyDetails, yearlyData } = req.body;
    if (!propertyId) return sendError(res, 400, "Property ID is required");

    const updatedProperty = await propertyService.updateProperty(
      propertyId,
      propertyDetails,
      PROPERTY_UPDATE_FIELDS
    );

    if (yearlyData) {
      const cleanAndParseDecimal = (value) => {
        if (!value) return 0;
        const cleanValue = value.toString().replace(/,/g, "");
        return parseFloat(cleanValue) || 0;
      };

      const invoiceOperations = Object.entries(yearlyData).map(async ([year, data]) => {
        const yearInt = parseInt(year, 10);
        if (!Number.isFinite(yearInt)) return null;
        const invoiceData = {
          protestDate: data["Protest Date"] || "",
          bppRendered: data["BPP Rendered"] || "",
          bppInvoice: data["BPP Invoice"] || "",
          bppPaid: data["BPP Paid"] || "",
          noticeLandValue: cleanAndParseDecimal(data["Notice Land Value"]),
          noticeImprovementValue: cleanAndParseDecimal(data["Notice Improvement Value"]),
          noticeMarketValue: cleanAndParseDecimal(data["Notice Market Value"]),
          noticeAppraisedValue: cleanAndParseDecimal(data["Notice Appraised Value"]),
          finalLandValue: cleanAndParseDecimal(data["Final Land Value"]),
          finalImprovementValue: cleanAndParseDecimal(data["Final Improvement Value"]),
          finalMarketValue: cleanAndParseDecimal(data["Final Market Value"]),
          finalAppraisedValue: cleanAndParseDecimal(data["Final Appraised Value"]),
          marketReduction: cleanAndParseDecimal(data["Market Reduction"]),
          appraisedReduction: cleanAndParseDecimal(data["Appraised Reduction"]),
          hearingDate: data["Hearing Date"] || "",
          invoiceDate: data["Invoice Date"] || "",
          underLitigation: data["Under Litigation"] || false,
          underArbitration: data["Under Arbitration"] || false,
          taxRate: cleanAndParseDecimal(data["Tax Rate"]),
          taxableSavings: cleanAndParseDecimal(data["Taxable Savings"]),
          contingencyFee: cleanAndParseDecimal(data["Contingency Fee"]),
          invoiceAmount: cleanAndParseDecimal(data["Invoice Amount"]),
          paidDate: data["Paid Date"] || "",
          paymentNotes: data["Payment Notes"] || "",
          beginningMarket: cleanAndParseDecimal(data["Beginning Market"]),
          endingMarket: cleanAndParseDecimal(data["Ending Market"]),
          beginningAppraised: cleanAndParseDecimal(data["Beginning Appraised"]),
          endingAppraised: cleanAndParseDecimal(data["Ending Appraised"]),
        };

        // Use upsert on (propertyId, year) unique index to avoid an extra read per year.
        return prisma.invoice.upsert({
          where: {
            propertyId_year: {
              propertyId: updatedProperty.id,
              year: yearInt,
            },
          },
          update: invoiceData,
          create: {
            ...invoiceData,
            propertyId: updatedProperty.id,
            accountNumber: updatedProperty.accountNumber,
            clientNumber: updatedProperty.clientNumber,
            year: yearInt,
          },
        });
      });
      await Promise.all(invoiceOperations);
    }

    res.status(200).json({
      message: "Property updated successfully",
      property: updatedProperty,
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
