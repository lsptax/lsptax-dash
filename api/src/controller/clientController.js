import { CLIENT_UPDATE_FIELDS } from "../config/constants.js";
import * as clientService from "../services/clientService.js";
import {
  sendError,
  convertToXLSX,
  EXPORT_FIELDS,
} from "../services/exportService.js";

// --- Mutations (action routes) ---
export const addClient = async (req, res) => {
  try {
    const { clientName, clientNumber, email, phoneNumber, mailingAddressCityTxZip, typeOfAcct, contingencyFee, flatFee } = req.body;
    if (!clientName || !email) {
      return sendError(res, 400, "Client name and email are required");
    }
    if (clientNumber == null || String(clientNumber).trim() === "") {
      return sendError(res, 400, "Client number is required (user-entered)");
    }
    const newClient = await clientService.createClient({
      clientName,
      clientNumber: String(clientNumber).trim(),
      email,
      phoneNumber,
      mailingAddressCityTxZip,
      typeOfAcct,
      contingencyFee,
      flatFee,
    });
    res.status(201).json({ message: "Client added successfully", client: newClient });
  } catch (error) {
    console.error("Error adding client:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

export const editClient = async (req, res) => {
  try {
    const { clientId, clientDetails } = req.body;
    if (!clientId) return sendError(res, 400, "Client ID is required");
    const updatedClient = await clientService.updateClient(
      clientId,
      clientDetails,
      CLIENT_UPDATE_FIELDS
    );
    res.status(200).json({ message: "Client updated successfully", client: updatedClient });
  } catch (error) {
    const status = error?.statusCode || 500;
    const message =
      status === 500
        ? "Internal server error"
        : error.message || "Error updating client";
    sendError(res, status, message, status === 500 ? error : undefined);
  }
};

export const deleteClient = async (req, res) => {
  try {
    const id = parseInt(req.body.id, 10);
    if (Number.isNaN(id)) return sendError(res, 400, "Invalid ID format");
    const client = await clientService.findClientById(id);
    if (!client) return sendError(res, 404, "Client not found");
    await clientService.deleteClient(id);
    res.status(200).json({ message: "Client deleted successfully", client });
  } catch (error) {
    console.error("Error deleting client:", error);
    sendError(res, 500, "Internal server error", error);
  }
};

// --- Read & export (data routes) ---
export const getClients = async (req, res) => {
  try {
    const { limit, offset, search, accountType } = req.query;
    const result = await clientService.getClients(limit, offset, search, accountType);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error fetching clients", error);
  }
};

export const getArchiveClients = async (req, res) => {
  try {
    const { limit, offset, search, accountType } = req.query;
    const result = await clientService.getArchiveClients(limit, offset, search, accountType);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error fetching archive clients", error);
  }
};

export const getClientDetails = async (req, res) => {
  try {
    const { clientId } = req.query;
    const data = await clientService.getClientDetails(clientId);
    if (!data) return res.status(404).json({ message: "No Client Found..." });
    res.status(200).json(data);
  } catch (error) {
    sendError(res, 500, "Error fetching clients", error);
  }
};

export const downloadClientsXLSX = async (req, res) => {
  try {
    const { accountType } = req.query;
    const clients = await clientService.getClientsForExport({ accountType });
    const buffer = convertToXLSX(clients, EXPORT_FIELDS.clients, "Clients");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const suffix = accountType ? `-${String(accountType).toLowerCase()}` : "";
    res.setHeader("Content-Disposition", `attachment; filename=clients${suffix}.xlsx`);
    res.status(200).send(buffer);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error downloading clients XLSX", error);
  }
};

