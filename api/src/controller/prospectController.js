import { CLIENT_UPDATE_FIELDS } from "../config/constants.js";
import * as prospectService from "../services/prospectService.js";
import * as propertyService from "../services/propertyService.js";
import {
  sendError,
  convertToXLSX,
  EXPORT_FIELDS,
} from "../services/exportService.js";

// --- Mutations (action routes) ---
export const addProspect = async (req, res) => {
  try {
    const { clientName, email, phoneNumber, mailingAddress, mailingAddressCityTxZip, contingencyFee, flatFee } = req.body;
    if (!clientName || !email) {
      return sendError(res, 400, "Prospect name and email are required");
    }
    const existing = await prospectService.findProspectByEmail(email);
    if (existing?.email) return sendError(res, 400, "Email already present");
    const newProspect = await prospectService.createProspect({
      clientName,
      email,
      phoneNumber,
      mailingAddress,
      mailingAddressCityTxZip,
      contingencyFee,
      flatFee,
    });
    res.status(201).json({ message: "Prospect added successfully", prospect: newProspect });
  } catch (error) {
    console.error("Error adding prospect:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const editProspect = async (req, res) => {
  try {
    const { prospectId, prospectDetails } = req.body;
    if (!prospectId) return sendError(res, 400, "Client ID is required");
    const updatedClient = await prospectService.updateProspect(
      prospectId,
      prospectDetails,
      CLIENT_UPDATE_FIELDS
    );
    res.status(200).json({ message: "Prospect updated successfully", client: updatedClient });
  } catch (error) {
    console.error("Error updating prospect:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const deleteProspect = async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10);
    if (Number.isNaN(id)) return sendError(res, 400, "Invalid ID format");
    const prospect = await prospectService.findProspectById(id);
    if (!prospect) return sendError(res, 404, "Prospect not found");
    await prospectService.deleteProspect(id);
    res.status(200).json({ message: "Prospect deleted successfully", prospect });
  } catch (error) {
    console.error("Error deleting prospect:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const changeProspectStatus = async (req, res) => {
  try {
    const { prospectId, newStatus } = req.body;
    if (!prospectId || !newStatus) {
      return sendError(res, 400, "Prospect ID and status are required");
    }
    const updated = await prospectService.changeProspectStatus(prospectId, newStatus);
    if (!updated) return sendError(res, 404, `Prospect not found with ID: ${prospectId}`);
    res.status(200).json({ message: "Prospect Status Updated...", prospect: updated });
  } catch (error) {
    console.error("Error updating prospect:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const convertProspectToClient = async (req, res) => {
  try {
    const { id, clientNumber } = req.body;
    if (clientNumber == null || String(clientNumber).trim() === "") {
      return sendError(res, 400, "Client number is required (user-entered)");
    }
    const newClient = await prospectService.convertProspectToClient(id, String(clientNumber).trim());
    if (!newClient) return sendError(res, 404, "Prospect not found");
    res.status(201).json({
      message: "Prospect converted to client successfully",
      client: newClient,
    });
  } catch (error) {
    console.error("Error converting prospect to client:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const addPropertyToProspect = async (req, res) => {
  try {
    const { id, propertyData } = req.body;
    if (!id) return sendError(res, 400, "Prospect number is required");
    const newProperty = await prospectService.addPropertyToProspect(id, propertyData);
    if (!newProperty) return sendError(res, 404, "Prospect not found");
    res.status(201).json({
      message: "Property added successfully with 5 invoices",
      property: newProperty,
    });
  } catch (error) {
    console.error("Error adding property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const deleteProspectProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) return sendError(res, 400, "Property ID is required");
    const property = await propertyService.deleteProperty(propertyId);
    if (!property) return sendError(res, 404, "Prospect property not found");
    res.status(200).json({ message: "Prospect property deleted successfully", property });
  } catch (error) {
    console.error("Error deleting prospect property:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

// --- Read & export (data routes) ---
// Skip DocuSign enrichment for dashboard/mini-tables: use ?enrich=0 or small first page (limit<=20, offset=0).
export const getProspects = async (req, res) => {
  try {
    const { limit, offset, enrich } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    const offsetNum = parseInt(offset, 10) || 0;
    const explicitNoEnrich = enrich === "0" || enrich === "false";
    const dashboardStyle = limitNum <= 20 && offsetNum === 0;
    const enrichDocuSign = !explicitNoEnrich && !dashboardStyle;
    const result = await prospectService.getProspects(limit, offset, enrichDocuSign);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching prospects", error);
  }
};

export const getArchiveProspects = async (req, res) => {
  try {
    const { limit, offset, enrich } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    const offsetNum = parseInt(offset, 10) || 0;
    const explicitNoEnrich = enrich === "0" || enrich === "false";
    const dashboardStyle = limitNum <= 20 && offsetNum === 0;
    const enrichDocuSign = !explicitNoEnrich && !dashboardStyle;
    const result = await prospectService.getArchiveProspects(limit, offset, enrichDocuSign);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching prospects", error);
  }
};

export const getProspectDetails = async (req, res) => {
  try {
    const { prospectId } = req.query;
    const data = await prospectService.getProspectDetails(prospectId);
    if (!data) return res.status(404).json({ message: "Prospect not found" });
    res.status(200).json(data);
  } catch (error) {
    sendError(res, 500, "Error fetching prospects", error);
  }
};

export const getProspectPropertyDetails = async (req, res) => {
  try {
    const { id } = req.query;
    const data = await prospectService.getProspectPropertyDetails(id);
    if (!data) return res.status(404).json({ message: "Property not found." });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "An error occurred while fetching property details." });
  }
};

export const downloadProspectsXLSX = async (req, res) => {
  try {
    const prospects = await prospectService.getProspectsForExport();
    const buffer = convertToXLSX(prospects, EXPORT_FIELDS.prospects, "Prospects");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=prospects.xlsx");
    res.status(200).send(buffer);
  } catch (error) {
    sendError(res, 500, "Error downloading prospects XLSX", error);
  }
};
