import path from "path";
import { fileURLToPath } from "url";
import prisma from "../../prisma/prismaClient.js";
import { fillAOAForm, fillContractForm } from "../utils/pdfFill.js";
import {
  sendEnvelope,
  AOA_SIGN_ANCHOR,
  CONTRACT_SIGN_ANCHOR,
   checkEnvelopeStatus,
  getSignedDocumentBuffers,
} from "../controller/docuSignUtils.js";
import {
  uploadContractToSupabase,
  signedContractPath,
} from "../utils/supabaseStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AOA_PDF_PATH = path.resolve(__dirname, "../template-pdfs/50-162.pdf");
const CONTRACT_PDF_PATH = path.resolve(__dirname, "../template-pdfs/contract.pdf");
const ALLOW_MULTIPLE_CLIENT_CONTRACT_SENDS =
  String(process.env.ALLOW_MULTIPLE_CLIENT_CONTRACT_SENDS ?? "true").toLowerCase() !== "false";
const ALLOW_MULTIPLE_AOA_SENDS =
  String(process.env.ALLOW_MULTIPLE_AOA_SENDS ?? "true").toLowerCase() !== "false";

/**
 * Get client and properties by client id (works for both PROSPECT and CLIENT).
 */
export async function getClientAndProperties(clientId) {
  const id = parseInt(clientId, 10);
  if (Number.isNaN(id)) throw new Error("Invalid client id");
  const client = await prisma.client.findUnique({
    where: { id },
    include: { properties: { where: { isArchived: false } } },
  });
  if (!client) throw new Error("Client not found");
  return { client, properties: client.properties };
}

/**
 * Preview filled client contract PDF (base64).
 */
export async function previewClientContract(clientId) {
  const { client, properties } = await getClientAndProperties(clientId);
  if (!properties.length) throw new Error("No properties found for contract.");
  const base64 = await fillContractForm(CONTRACT_PDF_PATH, client, properties);
  return { contractPdf: base64 };
}

/**
 * Preview filled AOA PDF for one property (base64). For single-property AOA pass that property only.
 */
export async function previewAOA(clientId, propertyId) {
  const { client, properties } = await getClientAndProperties(clientId);
  const propId = parseInt(propertyId, 10);
  const property = propId
    ? properties.find((p) => p.id === propId)
    : properties[0];
  if (!property) throw new Error("Property not found");
  const base64 = await fillAOAForm(AOA_PDF_PATH, client, [property]);
  return { aoaPdf: base64 };
}

/**
 * Single entrypoint for sending docs.
 *
 * type:
 * - "contract"   -> send single client contract
 * - "aoa"        -> send single AOA for propertyId
 * - "aoa_all"    -> send all AOAs (one per property) in one envelope
 * - "all_docs"   -> send contract + all AOAs in one envelope
 */
export async function sendDocs({ clientId, type, propertyId } = {}) {
  switch (type) {
    case "contract":
      return sendSingleContractImpl(clientId);
    case "aoa":
      return sendSingleAoaImpl(clientId, propertyId);
    case "aoa_all":
      return sendAllAoasImpl(clientId);
    case "all_docs":
      return sendAllDocsImpl(clientId);
    default:
      throw new Error(
        'Invalid type. Expected one of: "contract", "aoa", "aoa_all", "all_docs".'
      );
  }
}

async function sendSingleContractImpl(clientId) {
  const { client, properties } = await getClientAndProperties(clientId);
  if (!properties.length) throw new Error("No properties found for contract.");
  if (!client.email) throw new Error("Client email is required to send contract.");

  if (!ALLOW_MULTIPLE_CLIENT_CONTRACT_SENDS) {
    const existing = await prisma.contract.findFirst({
      where: {
        clientId: client.id,
        type: "CLIENT_CONTRACT",
        status: { in: ["SENT", "COMPLETED"] },
      },
    });
    if (existing) {
      throw new Error(
        "A client contract has already been sent for this client. Check the contracts list for status."
      );
    }
  }

  const contractPdfBase64 = await fillContractForm(
    CONTRACT_PDF_PATH,
    client,
    properties
  );
  const result = await sendEnvelope(
    [
      {
        documentBase64: contractPdfBase64,
        name: `client-${clientId}-contract.pdf`,
      },
    ],
    client.email,
    client.clientName || "Client",
    // Move signature a bit higher above the anchor line in the contract PDF.
    { anchorYOffset: -25, formType: "contract" }
  );

  const contract = await prisma.contract.create({
    data: {
      type: "CLIENT_CONTRACT",
      status: "SENT",
      clientId: client.id,
      propertyId: null,
      envelopeId: result.envelopeId,
      fileUrl: null,
    },
  });
  return { contract, envelopeId: result.envelopeId };
}

async function sendSingleAoaImpl(clientId, propertyId) {
  const { client, properties } = await getClientAndProperties(clientId);
  const propId = parseInt(propertyId, 10);
  const property = properties.find((p) => p.id === propId);
  if (!property) throw new Error("Property not found");
  if (!client.email) throw new Error("Client email is required to send AOA.");

  if (!ALLOW_MULTIPLE_AOA_SENDS) {
    const existingAoa = await prisma.contract.findFirst({
      where: {
        clientId: client.id,
        propertyId: property.id,
        type: "AOA",
        status: { in: ["SENT", "COMPLETED"] },
      },
    });
    if (existingAoa) {
      throw new Error(
        "An AOA has already been sent for this property. Check the contracts list for status."
      );
    }
  }

  const aoaPdfBase64 = await fillAOAForm(AOA_PDF_PATH, client, [property]);
  const result = await sendEnvelope(
    [
      {
        documentBase64: aoaPdfBase64,
        name: `client-${clientId}-property-${propertyId}-aoa.pdf`,
      },
    ],
    client.email,
    client.clientName || "Client",
    { anchorString: AOA_SIGN_ANCHOR, formType: "aoa" }
  );

  const contract = await prisma.contract.create({
    data: {
      type: "AOA",
      status: "SENT",
      clientId: client.id,
      propertyId: property.id,
      envelopeId: result.envelopeId,
      fileUrl: null,
    },
  });
  return { contract, envelopeId: result.envelopeId };
}

async function sendAllAoasImpl(clientId) {
  const { client, properties } = await getClientAndProperties(clientId);
  if (!properties.length) throw new Error("No properties found for AOA.");
  if (!client.email) throw new Error("Client email is required to send AOA.");

  const results = [];
  const documents = [];
  const toCreate = [];

  for (const p of properties) {
    try {
      if (!ALLOW_MULTIPLE_AOA_SENDS) {
        const existingAoa = await prisma.contract.findFirst({
          where: {
            clientId: client.id,
            propertyId: p.id,
            type: "AOA",
            status: { in: ["SENT", "COMPLETED"] },
          },
          select: { id: true },
        });
        if (existingAoa) {
          results.push({
            success: false,
            propertyId: p.id,
            message:
              "An AOA has already been sent for this property. Check the contracts list for status.",
          });
          continue;
        }
      }

      const aoaPdfBase64 = await fillAOAForm(AOA_PDF_PATH, client, [p]);
      documents.push({
        documentBase64: aoaPdfBase64,
        name: `client-${clientId}-property-${p.id}-aoa.pdf`,
      });
      toCreate.push(p);
    } catch (err) {
      results.push({
        success: false,
        propertyId: p.id,
        message: err?.message || "Error sending AOA",
      });
    }
  }

  if (!documents.length) {
    return {
      success: false,
      total: properties.length,
      sent: 0,
      failed: results.length,
      envelopeId: null,
      results,
    };
  }

  const envelopeRes = await sendEnvelope(
    documents,
    client.email,
    client.clientName || "Client",
    {
      anchorString: AOA_SIGN_ANCHOR,
      formType: documents.length > 1 ? "aoa_multi" : "aoa",
      emailSubject:
        documents.length > 1
          ? "Action Required: Please Review and Sign Your Authorization of Agent (AOA) Forms"
          : "Action Required: Please Review and Sign Your Authorization of Agent (AOA) Form",
    }
  );

  const envelopeId = envelopeRes.envelopeId;
  const createdContracts = await prisma.$transaction(
    toCreate.map((p) =>
      prisma.contract.create({
        data: {
          type: "AOA",
          status: "SENT",
          clientId: client.id,
          propertyId: p.id,
          envelopeId,
          fileUrl: null,
        },
      })
    )
  );

  // Mark successful properties now that we have contracts/envelopeId.
  const createdByPropertyId = new Map(createdContracts.map((c) => [c.propertyId, c]));
  for (const p of toCreate) {
    const c = createdByPropertyId.get(p.id);
    results.push({
      success: true,
      propertyId: p.id,
      contract: { id: c.id, envelopeId, status: c.status },
      envelopeId,
    });
  }

  return {
    success: results.length > 0 && results.every((r) => r.success),
    total: properties.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    envelopeId,
    results,
  };
}

async function sendAllDocsImpl(clientId) {
  const { client, properties } = await getClientAndProperties(clientId);
  if (!properties.length) throw new Error("No properties found for contract/AOAs.");
  if (!client.email) throw new Error("Client email is required to send documents.");

  if (!ALLOW_MULTIPLE_CLIENT_CONTRACT_SENDS) {
    const existing = await prisma.contract.findFirst({
      where: {
        clientId: client.id,
        type: "CLIENT_CONTRACT",
        status: { in: ["SENT", "COMPLETED"] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new Error(
        "A client contract has already been sent for this client. Check the contracts list for status."
      );
    }
  }

  const results = [];
  const aoaDocs = [];
  const aoaPropertiesToCreate = [];

  for (const p of properties) {
    try {
      if (!ALLOW_MULTIPLE_AOA_SENDS) {
        const existingAoa = await prisma.contract.findFirst({
          where: {
            clientId: client.id,
            propertyId: p.id,
            type: "AOA",
            status: { in: ["SENT", "COMPLETED"] },
          },
          select: { id: true },
        });
        if (existingAoa) {
          results.push({
            success: false,
            propertyId: p.id,
            message:
              "An AOA has already been sent for this property. Check the contracts list for status.",
          });
          continue;
        }
      }

      const aoaPdfBase64 = await fillAOAForm(AOA_PDF_PATH, client, [p]);
      aoaDocs.push({
        documentBase64: aoaPdfBase64,
        name: `client-${clientId}-property-${p.id}-aoa.pdf`,
      });
      aoaPropertiesToCreate.push(p);
    } catch (err) {
      results.push({
        success: false,
        propertyId: p.id,
        message: err?.message || "Error generating AOA",
      });
    }
  }

  const contractPdfBase64 = await fillContractForm(CONTRACT_PDF_PATH, client, properties);
  const documents = [
    { documentBase64: contractPdfBase64, name: `client-${clientId}-contract.pdf` },
    ...aoaDocs,
  ];

  const envelopeRes = await sendEnvelope(documents, client.email, client.clientName || "Client", {
    formType: "all_docs",
    emailSubject:
      "Action Required: Please Review and Sign Your Client Contract and Authorization of Agent (AOA) Forms",
    signHereTabs: [
      { anchorString: CONTRACT_SIGN_ANCHOR, anchorYOffset: -25 },
      { anchorString: AOA_SIGN_ANCHOR },
    ],
  });

  const envelopeId = envelopeRes.envelopeId;

  const [createdClientContract, ...createdAoaContracts] = await prisma.$transaction([
    prisma.contract.create({
      data: {
        type: "CLIENT_CONTRACT",
        status: "SENT",
        clientId: client.id,
        propertyId: null,
        envelopeId,
        fileUrl: null,
      },
    }),
    ...aoaPropertiesToCreate.map((p) =>
      prisma.contract.create({
        data: {
          type: "AOA",
          status: "SENT",
          clientId: client.id,
          propertyId: p.id,
          envelopeId,
          fileUrl: null,
        },
      })
    ),
  ]);

  const createdByPropertyId = new Map(createdAoaContracts.map((c) => [c.propertyId, c]));
  for (const p of aoaPropertiesToCreate) {
    const c = createdByPropertyId.get(p.id);
    results.push({
      success: true,
      propertyId: p.id,
      contract: { id: c.id, envelopeId, status: c.status },
      envelopeId,
    });
  }

  return {
    success: true,
    envelopeId,
    clientContract: {
      id: createdClientContract.id,
      envelopeId,
      status: createdClientContract.status,
    },
    aoa: {
      total: properties.length,
      sent: results.filter((r) => r.success).length,
      skippedOrFailed: results.filter((r) => !r.success).length,
      results,
    },
  };
}

/**
 * List all contracts for a client.
 */
export async function getContractsForClient(clientId) {
  const id = parseInt(clientId, 10);
  if (Number.isNaN(id)) throw new Error("Invalid client id");
  return prisma.contract.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { id: true, accountNumber: true } } },
  });
}

/**
 * Update contract status by envelope id (used by webhook and optional poll).
 */
export async function updateContractStatus(envelopeId, status, signedAt = null, signedFileUrl = null) {
  const data = {
    status,
    ...(signedAt != null && { signedAt }),
    ...(signedFileUrl != null && { signedFileUrl }),
  };
  const updated = await prisma.contract.updateMany({
    where: { envelopeId },
    data,
  });
  return updated;
}

/**
 * Find contract by envelope id.
 */
export async function findContractByEnvelopeId(envelopeId) {
  return prisma.contract.findFirst({
    where: { envelopeId },
    include: { client: true, property: true },
  });
}

/**
 * On envelope completed: fetch signed PDF from DocuSign, upload to Supabase, update contract.
 */
export async function onEnvelopeCompleted(envelopeId) {
  const buffers = await getSignedDocumentBuffers(envelopeId);
  const contracts = await prisma.contract.findMany({
    where: { envelopeId },
    include: { client: true, property: true },
  });
  if (!contracts.length) {
    console.warn(`No contract rows found for envelope ${envelopeId}`);
    return;
  }

  const signedAt = new Date();
  if (!buffers.length) {
    // No documents returned; mark all complete but without file URLs.
    await prisma.contract.updateMany({
      where: { envelopeId },
      data: { status: "COMPLETED", signedAt },
    });
    return;
  }

  // Best-effort mapping: match AOAs by `property-<id>-aoa` in DocuSign document name; otherwise treat as client contract.
  for (const doc of buffers) {
    const docName = String(doc.name || "");
    const propertyMatch = docName.match(/property-(\d+)-aoa/i);
    let target = null;
    if (propertyMatch) {
      const propertyId = parseInt(propertyMatch[1], 10);
      target = contracts.find((c) => c.type === "AOA" && c.propertyId === propertyId);
    } else if (docName.includes("contract")) {
      target = contracts.find((c) => c.type === "CLIENT_CONTRACT");
    }

    if (!target) {
      // If we can't map reliably, skip upload for this doc but continue.
      console.warn(`Unable to map signed document '${docName}' to a contract row (envelope ${envelopeId})`);
      continue;
    }

    const storagePath = signedContractPath(target.clientId, target.id, target.type);
    await uploadContractToSupabase(doc.buffer, storagePath);
    await prisma.contract.update({
      where: { id: target.id },
      data: { status: "COMPLETED", signedAt, signedFileUrl: storagePath },
    });
  }

  // Ensure any remaining rows are at least marked completed (even if upload failed/mapping missing).
  await prisma.contract.updateMany({
    where: { envelopeId, status: { not: "COMPLETED" } },
    data: { status: "COMPLETED", signedAt },
  });
}

/**
 * Poll envelope status (fallback when webhook not used).
 */
export async function pollEnvelopeStatus(envelopeId) {
  const status = await checkEnvelopeStatus(envelopeId);
  if (status === "completed") {
    await onEnvelopeCompleted(envelopeId);
  } else if (status) {
    const docuSignToDb = {
      sent: "SENT",
      delivered: "SENT",
      completed: "COMPLETED",
      declined: "DECLINED",
      voided: "VOIDED",
    };
    const dbStatus = docuSignToDb[status.toLowerCase()];
    if (dbStatus && dbStatus !== "COMPLETED") {
      await updateContractStatus(envelopeId, dbStatus);
    }
  }
  return status;
}

/**
 * Sync status from DocuSign for all SENT contracts of a client (use when webhook is not available, e.g. localhost).
 * Polls each envelope and updates DB; returns updated contract list.
 */
export async function syncClientContractStatuses(clientId) {
  const id = parseInt(clientId, 10);
  if (Number.isNaN(id)) throw new Error("Invalid client id");
  const sent = await prisma.contract.findMany({
    where: { clientId: id, status: "SENT", envelopeId: { not: null } },
    select: { envelopeId: true },
  });
  for (const c of sent) {
    try {
      await pollEnvelopeStatus(c.envelopeId);
    } catch (err) {
      console.warn(`Sync status for envelope ${c.envelopeId}:`, err.message);
    }
  }
  return getContractsForClient(clientId);
}
