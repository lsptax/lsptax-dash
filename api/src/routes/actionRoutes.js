import { Router } from "express";
import {
  addClient,
  editClient,
  deleteClient,
} from "../controller/clientController.js";
import {
  addProspect,
  editProspect,
  deleteProspect,
  changeProspectStatus,
  convertProspectToClient,
  addPropertyToProspect,
  deleteProspectProperty,
} from "../controller/prospectController.js";
import {
  addPropertyToClient,
  editProperty,
  editProspectProperty,
  deleteProperty,
} from "../controller/propertyController.js";
import {
  addHearing,
  editHearing,
  deleteHearing,
} from "../controller/hearingController.js";
import { toggleArchiveEntity } from "../controller/archiveController.js";
import { previewSignedPdf, signController } from "../controller/signController.js";
import { downloadSignedPdf } from "../controller/docuSignUtils.js";

const router = Router();
router.post("/add-client", addClient);
router.post("/edit-client", editClient);
router.post("/delete-client", deleteClient);

router.post("/add-prospect", addProspect);
router.post("/delete-prospect", deleteProspect);
router.put("/edit-prospect", editProspect);
router.post("/move-to-client", convertProspectToClient);
router.post("/change-prospect-status", changeProspectStatus);
router.post("/add-prospect-property", addPropertyToProspect);
router.post("/delete-prospect-property", deleteProspectProperty);

router.post("/add-property", addPropertyToClient);
router.post("/delete-property", deleteProperty);
router.put("/edit-property", editProperty);
router.put("/edit-prospect-property", editProspectProperty);

router.post("/sign-aoa", signController);
router.post("/preview-signed-pdf", previewSignedPdf);
router.post("/download-signed-pdf", downloadSignedPdf);

router.post("/archive-entity", toggleArchiveEntity);

router.post("/add-hearing", addHearing);
router.put("/edit-hearing", editHearing);
router.post("/delete-hearing", deleteHearing);

export default router;
