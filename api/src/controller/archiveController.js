import * as propertyService from "../services/propertyService.js";
import { sendError } from "../services/exportService.js";

export const toggleArchiveEntity = async (req, res) => {
  try {
    const { tableName, id } = req.body;
    if (!tableName || !id) {
      return sendError(res, 400, "Table name and ID are required");
    }
    const tableMapping = propertyService.getArchiveTableMapping();
    const model = tableMapping[tableName];
    if (!model) {
      return sendError(res, 400, `Invalid table name: ${tableName}`);
    }
    const updatedRecord = await propertyService.toggleArchive(model, id);
    if (!updatedRecord) {
      return sendError(res, 404, `${tableName} not found with ID: ${id}`);
    }
    res.status(200).json({
      message: `${tableName} ${updatedRecord.isArchived ? "archived" : "unarchived"} successfully`,
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Error toggling archive state:", error);
    sendError(res, 500, "Internal server error", error);
  }
};
