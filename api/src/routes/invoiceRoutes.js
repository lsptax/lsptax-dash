import { Router } from "express";
import {
  generateInvoicesForClients,
  getPropertiesForInvoiceGeneration,
  getClientsForInvoiceGeneration,
  getInvoiceGenerationStats
} from "../controller/invoiceController.js";

const router = Router();

// Generate invoices for selected clients and properties
router.post("/generate", generateInvoicesForClients);

// Get available properties for invoice generation
router.get("/properties", getPropertiesForInvoiceGeneration);

// Get all clients for invoice generation selection
router.get("/clients", getClientsForInvoiceGeneration);

// Get invoice generation statistics
router.get("/stats", getInvoiceGenerationStats);

export default router; 