import { Router } from "express";
import {
  getClients,
  getArchiveClients,
  getClientDetails,
  downloadClientsXLSX,
} from "../controller/clientController.js";
import {
  getProspects,
  getArchiveProspects,
  getProspectDetails,
  getProspectPropertyDetails,
  downloadProspectsXLSX,
} from "../controller/prospectController.js";
import {
  getProperties,
  getArchiveProperties,
  getPropertyDetails,
  downloadPropertiesCSV,
  downloadPropertiesXLSX,
} from "../controller/propertyController.js";
import {
  getInvoicesByClient,
  getInvoiceByProperty,
  getAllInvoices,
  getArchiveInvoices,
  getCounts,
  downloadInvoicesXLSX,
} from "../controller/invoiceController.js";
import { listHearings } from "../controller/hearingController.js";
import {
  getOwnerDashboard,
  getOwnerDashboardOptions,
} from "../controller/dashboardController.js";
import { requireOwner } from "../middleware/requireOwner.js";
import { getProfile, updateProfile, updatePassword } from "../controller/profileController.js";
import { getInfraSettings, updateInfraSettings } from "../controller/settingsController.js";

const router = Router();

router.get("/clients", getClients);
router.get("/archive_clients", getArchiveClients);
router.get("/client", getClientDetails);
router.get("/download-clients-xlsx", downloadClientsXLSX);
router.get("/download-prospects-xlsx", downloadProspectsXLSX);
router.get("/download-properties-xlsx", downloadPropertiesXLSX);
router.get("/download-properties-csv", downloadPropertiesCSV);
router.get(
  "/download-properties-real-csv",
  (req, _res, next) => {
    req.query.accountType = "real";
    next();
  },
  downloadPropertiesCSV
);
router.get(
  "/download-properties-bpp-csv",
  (req, _res, next) => {
    req.query.accountType = "bpp";
    next();
  },
  downloadPropertiesCSV
);
router.get("/download-invoices-xlsx", downloadInvoicesXLSX);

router.get("/prospects", getProspects);
router.get("/prospect", getProspectDetails);
router.get("/archive-prospects", getArchiveProspects);
router.get("/prospect-property", getProspectPropertyDetails);

router.get("/properties", getProperties);
router.get(
  "/properties/real",
  (req, _res, next) => {
    req.query.accountType = "real";
    next();
  },
  getProperties
);
router.get(
  "/properties/bpp",
  (req, _res, next) => {
    req.query.accountType = "bpp";
    next();
  },
  getProperties
);
router.get("/archive_properties", getArchiveProperties);
router.get("/property", getPropertyDetails);

router.get("/invoice/clientid=:id", getInvoicesByClient);
router.get("/invoice/:id", getInvoiceByProperty);
router.get("/invoices", getAllInvoices);
router.get("/archive-invoices", getArchiveInvoices);

router.get("/stats", getCounts);
router.get("/dashboard/owner", requireOwner, getOwnerDashboard);
router.get("/dashboard/owner/options", requireOwner, getOwnerDashboardOptions);
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.patch("/profile/password", updatePassword);
router.get("/settings", requireOwner, getInfraSettings);
router.patch("/settings", requireOwner, updateInfraSettings);
router.get("/hearings", listHearings);

export default router;
