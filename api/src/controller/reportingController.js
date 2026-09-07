import prisma from "../../prisma/prismaClient.js";
import { convertToCSV, sendError } from "../services/exportService.js";
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

function parseCountyParam(county) {
  if (!county) return [];
  const raw = Array.isArray(county) ? county : [county];
  const split = raw
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  // de-dupe case-insensitively but keep original casing from first occurrence
  const seen = new Set();
  const out = [];
  for (const c of split) {
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function includesAllToken(counties) {
  return (counties || []).some((c) => String(c).trim().toLowerCase() === "all");
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

export const downloadReportPropertiesCSV = async (req, res) => {
  try {
    const counties = parseCountyParam(req.query.county);
    const unfiltered = counties.length === 0 || includesAllToken(counties);

    const where = {
      isArchived: false,
      ...(!unfiltered ? { cadCounty: { in: counties, mode: "insensitive" } } : {}),
    };

    // Optimized: only fetch fields needed for this report
    const properties = await prisma.property.findMany({
      where,
      select: {
        nameOnCad: true,
        propertyAddress: true,
        cadCounty: true,
        accountNumber: true,
      },
      orderBy: [{ cadCounty: "asc" }, { accountNumber: "asc" }],
    });

    const fields = [
      { label: "NAME ON CAD", value: "nameOnCad" },
      { label: "PROPERTY ADDRESS", value: "propertyAddress" },
      { label: "COUNTY", value: "cadCounty" },
      { label: "Account", value: "accountNumber" },
    ];

    const csv = convertToCSV(properties, fields);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const suffix =
      !unfiltered && counties.length ? `-${counties.join("-")}`.replace(/[^a-z0-9\-]+/gi, "_") : "";
    res.setHeader("Content-Disposition", `attachment; filename=report-properties${suffix}.csv`);
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

