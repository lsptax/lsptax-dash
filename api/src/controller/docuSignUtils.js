import "../utils/loadEnv.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import docusign from "docusign-esign";
import prisma from "../../prisma/prismaClient.js";
import axios from "axios";
import archiver from "archiver";
import { getEmailTemplate } from "../utils/emailTemplate.js";
import {
  withDocuSignLimit,
  ingestDocuSignResponseHeaders,
} from "../utils/docusignRateLimiter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PRIVATE_KEY_PATH = path.resolve(__dirname, "../keys/private.key");

function getDocuSignRestBaseUrl() {
  return (process.env.DOCUSIGN_REST_BASE_URL || "https://demo.docusign.net/restapi").replace(
    /\/+$/,
    ""
  );
}

function getDocuSignApiBase() {
  return `${getDocuSignRestBaseUrl()}/v2.1`;
}

function readDocuSignPrivateKey() {
  const keyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || DEFAULT_PRIVATE_KEY_PATH;
  return fs.readFileSync(keyPath, "utf8");
}

const JWT_LIFE_SEC = 3600;
const JWT_REFRESH_BUFFER_MS = 5 * 60 * 1000;

let cachedAccessToken = null;
let cachedTokenExpiresAt = 0;
let inflightJwtPromise = null;

export function resetDocuSignAccessTokenCache() {
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
  inflightJwtPromise = null;
}

export async function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < cachedTokenExpiresAt - JWT_REFRESH_BUFFER_MS) {
    return cachedAccessToken;
  }
  if (inflightJwtPromise) {
    return inflightJwtPromise;
  }

  inflightJwtPromise = (async () => {
    try {
      return await withDocuSignLimit(async () => {
        const apiClient = new docusign.ApiClient();
        apiClient.setOAuthBasePath(
          process.env.DOCUSIGN_AUTH_SERVER.replace("https://", "")
        );
        const privateKey = readDocuSignPrivateKey();
        const results = await apiClient.requestJWTUserToken(
          process.env.DOCUSIGN_CLIENT_ID,
          process.env.DOCUSIGN_USER_ID,
          "signature impersonation",
          privateKey,
          JWT_LIFE_SEC
        );
        const token = results.body.access_token;
        cachedAccessToken = token;
        cachedTokenExpiresAt = Date.now() + JWT_LIFE_SEC * 1000;
        return token;
      });
    } catch (error) {
      if (error.response) {
        console.error("Error response from DocuSign:", error.response.data);
      } else {
        console.error("Error getting access token", error);
      }
      throw error;
    } finally {
      inflightJwtPromise = null;
    }
  })();

  return inflightJwtPromise;
}

/** Anchor text in contract PDF: signature tab is placed above this line. */
export const CONTRACT_SIGN_ANCHOR = "Signature of Owner";

/** Anchor text in AOA (50-162) PDF: signature tab is placed above this line. */
export const AOA_SIGN_ANCHOR =
  "Signature of Property Owner, Property Manager or Other Person";

/**
 * @param {object} [options] - Optional.
 * @param {string} [options.anchorString] - Text in PDF above which to place the signature tab (default: CONTRACT_SIGN_ANCHOR).
 * @param {string|number} [options.anchorXOffset] - X offset (pixels) from anchor (default: 20).
 * @param {string|number} [options.anchorYOffset] - Y offset (pixels) from anchor (default: -10). More negative moves tab up.
 * @param {Array<{anchorString: string, anchorXOffset?: string|number, anchorYOffset?: string|number}>} [options.signHereTabs]
 *        When provided, creates multiple SignHere tabs (one per anchor). Useful for envelopes that contain mixed document types
 *        (e.g. contract + AOAs) with different anchor strings.
 */
export async function sendEnvelope(documents, emailId, name, options = {}) {
  const anchorString = options.anchorString ?? CONTRACT_SIGN_ANCHOR;
  const anchorXOffset = options.anchorXOffset ?? "20";
  const anchorYOffset = options.anchorYOffset ?? "-10";
  const formType = options.formType ?? "contract";
  const emailSubject = options.emailSubject;
  const emailBlurb = options.emailBlurb;
  const signHereTabsOpt = Array.isArray(options.signHereTabs) ? options.signHereTabs : null;

  const envelopeDefinition = new docusign.EnvelopeDefinition();
  envelopeDefinition.emailSubject =
    emailSubject ?? "Action Required: Please Review and Sign the Attached Documents";
  envelopeDefinition.emailBlurb = emailBlurb ?? getEmailTemplate(name, formType);
  envelopeDefinition.status = "sent";

  // Add multiple documents to the envelope
  envelopeDefinition.documents = documents.map((doc, index) => ({
    documentBase64: doc.documentBase64,
    name: doc.name,
    fileExtension: "pdf",
    documentId: `${index + 1}`,
  }));

  const signer = new docusign.Signer();
  signer.email = emailId;
  signer.name = name;
  signer.recipientId = "1";
  signer.routingOrder = "1";

  const toSignHere = (tab) => {
    const signHere = new docusign.SignHere();
    signHere.anchorString = tab.anchorString;
    signHere.anchorUnits = "pixels";
    // Some PDFs split anchor text into multiple text runs; disabling whole-word matching
    // makes anchor detection more reliable (especially around punctuation like "/").
    signHere.anchorMatchWholeWord = "false";
    signHere.anchorYOffset = String(tab.anchorYOffset ?? anchorYOffset);
    signHere.anchorXOffset = String(tab.anchorXOffset ?? anchorXOffset);
    // Explicitly bind tab to signer; improves consistency across documents/templates.
    signHere.recipientId = signer.recipientId;
    // Require all signature locations created by this anchor before Finish is allowed.
    signHere.optional = "false";
    return signHere;
  };

  const signHereTabs = signHereTabsOpt?.length
    ? signHereTabsOpt.map((t) =>
        toSignHere({
          anchorString: t.anchorString,
          anchorXOffset: t.anchorXOffset,
          anchorYOffset: t.anchorYOffset,
        })
      )
    : [toSignHere({ anchorString, anchorXOffset, anchorYOffset })];

  const tabs = new docusign.Tabs();
  tabs.signHereTabs = signHereTabs;
  signer.tabs = tabs;

  envelopeDefinition.recipients = new docusign.Recipients();
  envelopeDefinition.recipients.signers = [signer];

  try {
    return await withDocuSignLimit(async () => {
      const accessToken = await getAccessToken();
      const apiClient = new docusign.ApiClient();
      apiClient.setBasePath(getDocuSignRestBaseUrl());
      apiClient.addDefaultHeader("Authorization", "Bearer " + accessToken);
      const envelopesApi = new docusign.EnvelopesApi(apiClient);
      return envelopesApi.createEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, {
        envelopeDefinition,
      });
    });
  } catch (error) {
    console.error("❌ Error sending envelope", error);
    throw error;
  }
}

export async function checkEnvelopeStatus(envelopeId) {
  if (!envelopeId) {
    return null;
  }
  try {
    const results = await withDocuSignLimit(async () => {
      const accessToken = await getAccessToken();
      const apiClient = new docusign.ApiClient();
      apiClient.setBasePath(getDocuSignRestBaseUrl());
      apiClient.addDefaultHeader("Authorization", "Bearer " + accessToken);
      const envelopesApi = new docusign.EnvelopesApi(apiClient);
      return envelopesApi.getEnvelope(process.env.DOCUSIGN_ACCOUNT_ID, envelopeId);
    });
    return results.status; // Possible values: "sent", "completed", "declined", etc.
  } catch (error) {
    console.error("❌ Error checking envelope status", error);
    throw error;
  }
}

export const downloadSignedPdf = async (req, res) => {
  try {
    const { prospectId } = req.body;

    if (!prospectId) {
      return res.status(400).json({ message: "Prospect ID is required!" });
    }

    // 🏛️ Fetch the Prospect from DB
    const prospect = await prisma.client.findFirst({
      where: { id: parseInt(prospectId), type: "PROSPECT" },
      select: { envelopeId: true },
    });

    if (!prospect || !prospect.envelopeId) {
      return res.status(404).json({ message: "Envelope ID not found." });
    }

    const envelopeId = prospect.envelopeId;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    // 📄 Fetch the list of documents in the envelope
    const documentListResponse = await withDocuSignLimit(async () => {
      const accessToken = await getAccessToken();
      return axios.get(
        `${getDocuSignApiBase()}/accounts/${accountId}/envelopes/${envelopeId}/documents`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    });
    ingestDocuSignResponseHeaders(documentListResponse.headers);

    const documents = documentListResponse.data.envelopeDocuments;

    if (!documents || documents.length === 0) {
      return res
        .status(404)
        .json({ message: "No documents found in the envelope." });
    }

    // 📦 Fetch all documents and add them to a ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } }); // Set compression level
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="signed_documents_${prospectId}.zip"`
    );

    archive.pipe(res);

    for (const doc of documents) {
      const documentResponse = await withDocuSignLimit(async () => {
        const accessToken = await getAccessToken();
        return axios.get(
          `${getDocuSignApiBase()}/accounts/${accountId}/envelopes/${envelopeId}/documents/${doc.documentId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/pdf",
            },
            responseType: "arraybuffer",
          }
        );
      });
      ingestDocuSignResponseHeaders(documentResponse.headers);
      archive.append(documentResponse.data, { name: `${doc.name}.pdf` });
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error("Error downloading PDF:", error.response?.data || error);
    res.status(500).json({ message: "Error downloading signed PDF" });
  }
};

/**
 * Fetch all signed document PDFs from a completed envelope (for storing in Supabase).
 * @param {string} envelopeId
 * @returns {Promise<Array<{ documentId: string, name: string, buffer: Buffer }>>}
 */
export async function getSignedDocumentBuffers(envelopeId) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const listRes = await withDocuSignLimit(async () => {
    const accessToken = await getAccessToken();
    return axios.get(
      `${getDocuSignApiBase()}/accounts/${accountId}/envelopes/${envelopeId}/documents`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  });
  ingestDocuSignResponseHeaders(listRes.headers);
  const documents = listRes.data.envelopeDocuments || [];
  const result = [];
  for (const doc of documents) {
    const docRes = await withDocuSignLimit(async () => {
      const accessToken = await getAccessToken();
      return axios.get(
        `${getDocuSignApiBase()}/accounts/${accountId}/envelopes/${envelopeId}/documents/${doc.documentId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/pdf" },
          responseType: "arraybuffer",
        }
      );
    });
    ingestDocuSignResponseHeaders(docRes.headers);
    result.push({
      documentId: doc.documentId,
      name: doc.name || `document-${doc.documentId}`,
      buffer: Buffer.from(docRes.data),
    });
  }
  return result;
}
