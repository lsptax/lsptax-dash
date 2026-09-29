import { searchPortal } from "../services/globalSearchService.js";
import { sendError } from "../services/exportService.js";

export const globalSearch = async (req, res) => {
  try {
    const result = await searchPortal(req.query.q);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error searching portal:", error);
    sendError(res, 500, "Error searching", error);
  }
};
