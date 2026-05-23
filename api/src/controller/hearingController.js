import * as hearingService from "../services/hearingService.js";
import { sendError } from "../services/exportService.js";

export const listHearings = async (req, res) => {
  try {
    const { limit, offset, from, to, status } = req.query;
    const result = await hearingService.listHearings({
      limit,
      offset,
      from,
      to,
      status,
    });
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error fetching hearings", error);
  }
};

export const addHearing = async (req, res) => {
  try {
    const { propertyId, date, notes, status } = req.body;
    if (propertyId == null) return sendError(res, 400, "propertyId is required");
    if (date == null || date === "") return sendError(res, 400, "date is required");

    const hearing = await hearingService.createHearing({
      propertyId,
      date,
      notes,
      status,
    });
    res.status(201).json({ message: "Hearing scheduled", hearing });
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error adding hearing", error);
  }
};

export const editHearing = async (req, res) => {
  try {
    const { hearingId, date, notes, status } = req.body;
    if (hearingId == null) return sendError(res, 400, "hearingId is required");

    const hearing = await hearingService.updateHearing(hearingId, {
      date,
      notes,
      status,
    });
    res.status(200).json({ message: "Hearing updated", hearing });
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error updating hearing", error);
  }
};

export const deleteHearing = async (req, res) => {
  try {
    const { hearingId } = req.body;
    if (hearingId == null) return sendError(res, 400, "hearingId is required");

    const deleted = await hearingService.deleteHearing(hearingId);
    res.status(200).json({
      message: "Hearing deleted",
      hearingId: deleted.id,
      deletedAt: deleted.deletedAt,
    });
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error deleting hearing", error);
  }
};
