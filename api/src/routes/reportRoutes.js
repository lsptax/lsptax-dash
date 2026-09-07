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
import { requireOwner } from "../middleware/requireOwner.js";

const router = Router();

// CSV report: filter by county (repeat param or comma-separated)
// GET /report/properties?county=Bexar or ?county=Bexar,Travis or ?county=Bexar&county=Travis
router.get("/properties", downloadReportPropertiesCSV);

// Optimized: distinct list of counties available in DB
router.get("/counties", getReportCounties);

// Owner financial reports. Billed uses invoiceDate; collected uses paidDate (full-pay v1).
router.get("/billed", requireOwner, getBilledReport);
router.get("/collected", requireOwner, getCollectedReport);
router.get("/unpaid", requireOwner, getUnpaidReport);
router.get("/reductions", requireOwner, getReductionsReport);
router.get("/acquisition/avg-properties", requireOwner, getAveragePropertiesReport);
router.get("/clients/active", requireOwner, getActiveClientsReport);

export default router;
