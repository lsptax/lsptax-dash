import { Router } from "express";
import multer from "multer";
import {
  previewClientPropertyCsv,
  uploadClientPropertyCsv,
  previewInvoiceCsv,
  uploadInvoiceCsv,
} from "../controller/csvController.js";

const router = Router();

// Use memory storage for previews and invoice upload (controller reads buffer)
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Use disk storage for client/property upload (importCSV needs file path)
const diskUpload = multer({ dest: "uploads/" });

// --- Client + Property CSV ---
// Preview: what's new vs what will be updated (Client & Property only)
router.post(
  "/preview-clients-properties",
  memoryUpload.single("csv"),
  previewClientPropertyCsv
);

// Upload: import into Client and Property tables only
router.post(
  "/upload-clients-properties",
  diskUpload.single("csv"),
  uploadClientPropertyCsv
);

// --- Invoice CSV ---
// Preview: what's new vs what will be updated (Invoice only)
router.post(
  "/preview-invoices",
  memoryUpload.single("csv"),
  previewInvoiceCsv
);

// Upload: import into Invoice table only
router.post(
  "/upload-invoices",
  memoryUpload.single("csv"),
  uploadInvoiceCsv
);

export default router;
