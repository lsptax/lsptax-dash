import { sendError } from "../services/exportService.js";
import * as dashboardService from "../services/dashboardService.js";
import { parseReportFilters } from "../utils/reportFilters.js";

export const getOwnerDashboard = async (req, res) => {
  try {
    const filters = parseReportFilters(req.query);
    const result = await dashboardService.getOwnerDashboard(filters);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Failed to fetch owner dashboard", error);
  }
};

export const getOwnerDashboardOptions = async (_req, res) => {
  try {
    const result = await dashboardService.getOwnerDashboardOptions();
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Failed to fetch owner dashboard filters", error);
  }
};
