import prisma from "../../prisma/prismaClient.js";
import * as contractService from "../services/contractService.js";
import { getSignedDownloadUrl as createSignedUrl } from "../utils/supabaseStorage.js";
import crypto from "crypto";

/**
 * POST /contracts/preview-contract
 * Body: { clientId }
 */
export async function previewContract(req, res) {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }
    const data = await contractService.previewClientContract(clientId);
    return res.status(200).json(data);
  } catch (err) {
    console.error("previewContract:", err);
    return res
      .status(err.message === "Client not found" ? 404 : 400)
      .json({ success: false, message: err.message || "Error generating preview" });
  }
}

/**
 * POST /contracts/preview-aoa
 * Body: { clientId, propertyId }
 */
export async function previewAOA(req, res) {
  try {
    const { clientId, propertyId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }
    const data = await contractService.previewAOA(clientId, propertyId);
    return res.status(200).json(data);
  } catch (err) {
    console.error("previewAOA:", err);
    return res
      .status(err.message === "Client not found" || err.message === "Property not found" ? 404 : 400)
      .json({ success: false, message: err.message || "Error generating preview" });
  }
}

/**
 * POST /contracts/send-docs
 * Body:
 * {
 *   "clientId": number,
 *   "type": "contract" | "aoa" | "aoa_all" | "all_docs",
 *   "propertyId"?: number // required for type="aoa"
 * }
 */
export async function sendDocs(req, res) {
  try {
    const { clientId, type, propertyId } = req.body;
    if (!clientId) return res.status(400).json({ success: false, message: "clientId is required" });
    if (!type) return res.status(400).json({ success: false, message: "type is required" });
    if (type === "aoa" && !propertyId) {
      return res.status(400).json({ success: false, message: "propertyId is required for type=aoa" });
    }
    const data = await contractService.sendDocs({ clientId, type, propertyId });
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error("sendDocs:", err);
    return res
      .status(err.message === "Client not found" ? 404 : 400)
      .json({ success: false, message: err.message || "Error sending documents" });
  }
}

/**
 * GET /contracts/client/:clientId  or  GET /contracts/client?clientId=433
 * clientId must be the client's database id (Client.id), not clientNumber.
 */
export async function getContractsByClient(req, res) {
  try {
    const clientId = req.params.clientId ?? req.query.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required (path or query)" });
    }
    const contracts = await contractService.getContractsForClient(clientId);
    return res.status(200).json(contracts);
  } catch (err) {
    console.error("getContractsByClient:", err);
    return res.status(400).json({ success: false, message: err.message || "Error fetching contracts" });
  }
}

/**
 * POST /contracts/poll-status
 * Body: { envelopeId }
 */
export async function pollStatus(req, res) {
  try {
    const { envelopeId } = req.body;
    if (!envelopeId) {
      return res.status(400).json({ success: false, message: "envelopeId is required" });
    }
    const status = await contractService.pollEnvelopeStatus(envelopeId);
    return res.status(200).json({ success: true, status });
  } catch (err) {
    console.error("pollStatus:", err);
    return res.status(500).json({ success: false, message: err.message || "Error polling status" });
  }
}

/**
 * POST /contracts/sync-client-status
 * Body: { clientId }
 * Syncs status from DocuSign for all SENT contracts of this client (use when webhook cannot be used, e.g. localhost).
 * Returns updated contract list.
 */
export async function syncClientStatus(req, res) {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }
    const contracts = await contractService.syncClientContractStatuses(clientId);
    return res.status(200).json(contracts);
  } catch (err) {
    console.error("syncClientStatus:", err);
    return res.status(500).json({ success: false, message: err.message || "Error syncing status" });
  }
}

/**
 * GET /contracts/:contractId/download-url?expiresIn=3600
 * Returns a short-lived signed URL for the signed PDF (if stored in Supabase).
 */
export async function getContractDownloadUrl(req, res) {
  try {
    const contractId = parseInt(req.params.contractId, 10);
    const expiresIn = Math.min(
      parseInt(req.query.expiresIn, 10) || 3600,
      86400
    );
    const c = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!c) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }
    if (!c.signedFileUrl) {
      return res
        .status(404)
        .json({ success: false, message: "Signed document not yet available" });
    }
    const url = await createSignedUrl(c.signedFileUrl, expiresIn);
    return res.status(200).json({ url });
  } catch (err) {
    console.error("getContractDownloadUrl:", err);
    return res.status(500).json({ success: false, message: err.message || "Error getting download URL" });
  }
}

/**
 * Verify DocuSign Connect HMAC. Uses raw body and X-DocuSign-Signature-1 header.
 * @param {Buffer} rawBody
 * @param {string} signatureHeader
 * @param {string} secret
 * @returns {boolean}
 */
function verifyDocuSignHMAC(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const computed = hmac.digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader, "base64"),
    Buffer.from(computed, "base64")
  );
}

/**
 * POST /webhooks/docusign
 * DocuSign Connect webhook. Uses raw body (Buffer from express.raw()) for HMAC.
 * Configure Connect to send JSON; payload may have envelopeId/status at root or under envelopeSummary/data.
 */
export async function docusignWebhook(req, res) {
  const rawBody = req.body;
  const secret = process.env.DOCUSIGN_HMAC_SECRET;
  const signatureHeader = req.get("X-DocuSign-Signature-1");

  // Require HMAC secret to be configured; never accept unsigned webhooks.
  if (!secret) {
    return res.status(503).send("Webhook not configured");
  }

  if (signatureHeader) {
    const bodyBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody || {}));
    if (!verifyDocuSignHMAC(bodyBuffer, signatureHeader, secret)) {
      console.warn("DocuSign webhook HMAC verification failed");
      return res.status(401).send("Invalid signature");
    }
  } else {
    return res.status(401).send("Missing signature");
  }

  let payload;
  if (Buffer.isBuffer(rawBody)) {
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch (e) {
      return res.status(400).send("Invalid JSON");
    }
  } else {
    payload = rawBody || {};
  }

  const envelopeId =
    payload.envelopeId ??
    payload.envelopeSummary?.envelopeId ??
    payload.data?.envelopeSummary?.envelopeId;
  const status = (
    payload.status ??
    payload.envelopeSummary?.status ??
    payload.data?.envelopeSummary?.status ??
    ""
  ).toLowerCase();

  if (!envelopeId) {
    return res.status(200).send("ok");
  }

  try {
    if (status === "completed") {
      await contractService.onEnvelopeCompleted(envelopeId);
    } else if (["sent", "delivered"].includes(status)) {
      await contractService.updateContractStatus(envelopeId, "SENT");
    } else if (status === "declined") {
      await contractService.updateContractStatus(envelopeId, "DECLINED");
    } else if (status === "voided") {
      await contractService.updateContractStatus(envelopeId, "VOIDED");
    }
  } catch (err) {
    console.error("DocuSign webhook processing error:", err);
  }

  return res.status(200).send("ok");
}
