import prisma from "../../prisma/prismaClient.js";
import { convertToCSV, sendError } from "../services/exportService.js";
import * as dashboardService from "../services/dashboardService.js";

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
    const result = await dashboardService.getBilledReport({
      groupBy: Array.isArray(req.query.groupBy) ? req.query.groupBy[0] : req.query.groupBy,
    });
    res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 500;
    sendError(res, status, error.message || "Error fetching billed report", error);
  }
};

export const getCollectedReport = async (_req, res) => {
  try {
    const result = await dashboardService.getCollectedReport();
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching collected report", error);
  }
};

export const getUnpaidReport = async (req, res) => {
  try {
    const result = await dashboardService.getUnpaidReport({
      view: Array.isArray(req.query.view) ? req.query.view[0] : req.query.view,
      limit: Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit,
    });
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching unpaid report", error);
  }
};

export const getReductionsReport = async (_req, res) => {
  try {
    const result = await dashboardService.getReductionsReport();
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching reductions report", error);
  }
};

export const getAveragePropertiesReport = async (_req, res) => {
  try {
    const result = await dashboardService.getAveragePropertiesPerClient();
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching average properties report", error);
  }
};

export const getActiveClientsReport = async (_req, res) => {
  try {
    const result = await dashboardService.getActiveClientCount();
    res.status(200).json(result);
  } catch (error) {
    sendError(res, 500, "Error fetching active clients report", error);
  }
};

