import prisma from "../../prisma/prismaClient.js";
import { convertToCSV, convertSheetsToXLSX, sendError } from "../services/exportService.js";
import * as dashboardService from "../services/dashboardService.js";
import {
  csvForBilledReport,
  csvForCollectedReport,
  csvForReductionsReport,
  csvForUnpaidReport,
  sendCsv,
} from "../services/ownerReportCsv.js";
import { parseReportFilters } from "../utils/reportFilters.js";

function firstQuery(value) {
  if (value == null) return "";
  return String(Array.isArray(value) ? value[0] : value).trim();
}

function queryFilters(req) {
  return parseReportFilters(req.query);
}

export const getReportCounties = async (_req, res) => {
  try {
    const rows = await prisma.property.findMany({
      where: {
        isArchived: false,
        cadCounty: { not: null },
        NOT: { cadCounty: "" },
      },
      distinct: ["cadCounty"],
      select: { cadCounty: true },
    });

    const counties = rows
      .map((r) => String(r.cadCounty || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    res.status(200).json({ counties: ["All", ...counties] });
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error fetching counties", error);
  }
};

function parseSheetList(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const wanted = new Set(
    raw
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
  return {
    clients: wanted.has("clients") || wanted.has("client"),
    properties: wanted.has("properties") || wanted.has("property"),
  };
}

const CLIENT_EXPORT_FIELDS = [
  { label: "Client number", value: "clientNumber" },
  { label: "Client name", value: "clientName" },
  { label: "Email", value: "email" },
  { label: "Billing email", value: "billingEmail" },
  { label: "Phone", value: "phoneNumber" },
  { label: "Mailing address", value: "mailingAddress" },
  { label: "Mailing city/TX/zip", value: "mailingCityTxZip" },
];

const PROPERTY_EXPORT_FIELDS = [
  { label: "Client number", value: "clientNumber" },
  { label: "Client name", value: "clientName" },
  { label: "Account", value: "accountNumber" },
  { label: "Name on CAD", value: "nameOnCad" },
  { label: "Property address", value: "propertyAddress" },
  { label: "County", value: "county" },
  { label: "Mailing address", value: "mailingAddress" },
  { label: "Mailing city/TX/zip", value: "mailingCityTxZip" },
];

export const downloadReportPropertiesCSV = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const wanted = parseSheetList(req.query.sheets);
    const roster = await dashboardService.getFilteredRosterExport(filters);

    if (wanted.clients || wanted.properties) {
      const sheets = [];
      if (wanted.clients) {
        sheets.push({ name: "Clients", data: roster.clients, fields: CLIENT_EXPORT_FIELDS });
      }
      if (wanted.properties) {
        sheets.push({
          name: "Properties",
          data: roster.properties,
          fields: PROPERTY_EXPORT_FIELDS,
        });
      }
      const buffer = convertSheetsToXLSX(sheets);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=owner-filtered-export.xlsx");
      return res.status(200).send(buffer);
    }

    const csv = convertToCSV(roster.properties, PROPERTY_EXPORT_FIELDS);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=owner-filtered-properties.csv");
    res.status(200).send(csv);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, "Error downloading reporting CSV", error);
  }
};

export const getBilledReport = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const result = await dashboardService.getBilledReport({
      ...filters,
      groupBy: firstQuery(req.query.groupBy),
    });
    if (filters.format === "csv") {
      return sendCsv(res, "report-billed.csv", csvForBilledReport(result));
    }
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching billed report", error);
  }
};

export const getCollectedReport = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const result = await dashboardService.getCollectedReport(filters);
    if (filters.format === "csv") {
      return sendCsv(res, "report-collected.csv", csvForCollectedReport(result));
    }
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching collected report", error);
  }
};

export const getUnpaidReport = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const result = await dashboardService.getUnpaidReport({
      ...filters,
      view: firstQuery(req.query.view),
      limit: firstQuery(req.query.limit),
    });
    if (filters.format === "csv") {
      return sendCsv(res, "report-unpaid.csv", csvForUnpaidReport(result));
    }
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching unpaid report", error);
  }
};

export const getReductionsReport = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const result = await dashboardService.getReductionsReport(filters);
    if (filters.format === "csv") {
      return sendCsv(res, "report-reductions.csv", csvForReductionsReport(result));
    }
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching reductions report", error);
  }
};

export const getAveragePropertiesReport = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const result = await dashboardService.getAveragePropertiesPerClient(filters);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching average properties report", error);
  }
};

export const getActiveClientsReport = async (req, res) => {
  try {
    const filters = queryFilters(req);
    const result = await dashboardService.getActiveClientCount(filters);
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching active clients report", error);
  }
};

