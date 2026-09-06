import { Router } from "express";
import {
  generateInvoicesForClients,
  getPropertiesForInvoiceGeneration,
  getClientsForInvoiceGeneration,
  getInvoiceGenerationStats,
  sendInvoiceToClient,
  getBulkInvoiceRecipients,
  sendBulkInvoicesToClients,
  getInvoiceDeliveries,
  getInvoiceDeliveryDownloadUrl,
  syncInvoiceDeliveryTracking,
  syncInvoiceDeliveriesTracking,
  updateInvoicePaymentStatus,
} from "../controller/invoiceController.js";

const router = Router();

// Generate invoices for selected clients and properties
router.post("/generate", generateInvoicesForClients);

// Mark invoice(s) paid / unpaid
router.patch("/payment", updateInvoicePaymentStatus);

// Send client-generated invoice PDF(s) via Brevo email + SMS
router.post("/send", sendInvoiceToClient);

// Preview/send filtered invoice recipients in bulk
router.get("/bulk-send/recipients", getBulkInvoiceRecipients);
router.post("/bulk-send", sendBulkInvoicesToClients);

// Delivery history for a client
router.get("/deliveries", getInvoiceDeliveries);

// Pull email tracking from Brevo for recent deliveries (must be before :deliveryId route)
router.post("/deliveries/sync-tracking", syncInvoiceDeliveriesTracking);

// Signed download URL for a stored invoice PDF
router.get("/deliveries/:deliveryId/download-url", getInvoiceDeliveryDownloadUrl);

// Pull email tracking from Brevo for one delivery (webhook fallback)
router.post("/deliveries/:deliveryId/sync-tracking", syncInvoiceDeliveryTracking);

// Get available properties for invoice generation
router.get("/properties", getPropertiesForInvoiceGeneration);

// Get all clients for invoice generation selection
router.get("/clients", getClientsForInvoiceGeneration);

// Get invoice generation statistics
router.get("/stats", getInvoiceGenerationStats);

export default router; 