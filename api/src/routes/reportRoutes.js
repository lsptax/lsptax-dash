import { Router } from "express";
import { downloadReportPropertiesCSV, getReportCounties } from "../controller/reportingController.js";

const router = Router();

// CSV report: filter by county (repeat param or comma-separated)
// GET /report/properties?county=Bexar or ?county=Bexar,Travis or ?county=Bexar&county=Travis
router.get("/properties", downloadReportPropertiesCSV);

// Optimized: distinct list of counties available in DB
router.get("/counties", getReportCounties);

export default router;
