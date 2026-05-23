import { Router } from "express";
import {
  previewContract,
  previewAOA,
  sendDocs,
  getContractsByClient,
  pollStatus,
  syncClientStatus,
  getContractDownloadUrl,
} from "../controller/contractController.js";

const router = Router();

router.post("/preview-contract", previewContract);
router.post("/preview-aoa", previewAOA);
router.post("/send-docs", sendDocs);
router.get("/client", getContractsByClient);
router.get("/client/:clientId", getContractsByClient);
router.post("/sync-client-status", syncClientStatus);
router.post("/poll-status", pollStatus);
router.get("/:contractId/download-url", getContractDownloadUrl);

export default router;
