import { Router } from "express";
import {
  downloadReportPropertiesCSV,
  getActiveClientsReport,
  getAveragePropertiesReport,
  getBilledReport,
  getCollectedReport,
  getReductionsReport,
  getReportCounties,
  getUnpaidReport,
} from "../controller/reportingController.js";

const router = Router();

// CSV report: filter by county (repeat param or comma-separated)
// GET /report/properties?county=Bexar or ?county=Bexar,Travis or ?county=Bexar&county=Travis
router.get("/properties", downloadReportPropertiesCSV);

// Optimized: distinct list of counties available in DB
router.get("/counties", getReportCounties);

// Week 1 owner reports (JSON). Billed uses invoiceDate; collected uses paidDate (full-pay v1).
router.get("/billed", getBilledReport);
router.get("/collected", getCollectedReport);
router.get("/unpaid", getUnpaidReport);
router.get("/reductions", getReductionsReport);
router.get("/acquisition/avg-properties", getAveragePropertiesReport);
router.get("/clients/active", getActiveClientsReport);

export default router;
