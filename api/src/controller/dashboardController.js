import { sendError } from "../services/exportService.js";
import * as dashboardService from "../services/dashboardService.js";

export const getOwnerDashboard = async (_req, res) => {
  try {
    const result = await dashboardService.getOwnerDashboard();
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Failed to fetch owner dashboard", error);
  }
};
