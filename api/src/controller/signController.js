import path from "path";
import { fileURLToPath } from "url";
import prisma from "../../prisma/prismaClient.js";
import { fillAOAForm, fillContractForm } from "../utils/pdfFill.js";
import * as contractService from "../services/contractService.js";
import "../utils/loadEnv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AOA_PDF_PATH = path.resolve(__dirname, "../template-pdfs/50-162.pdf");
const CONTRACT_PDF_PATH = path.resolve(__dirname, "../template-pdfs/contract.pdf");

// Fetch client (Prospect) and their properties — legacy flow (PROSPECT only)
async function getClientDetailsFromDB(clientId) {
  const prospect = await prisma.client.findFirst({
    where: { id: parseInt(clientId), type: "PROSPECT" },
  });
  if (!prospect) throw new Error("No Client Found");
  const properties = await prisma.property.findMany({
    where: { clientId: prospect.id, isArchived: false },
  });
  return { prospect, properties };
}

/**
 * Send contract + AOAs for a prospect via DocuSign, creating Contract rows in the DB
 * (same as client flow). Uses one envelope for client contract and one per property AOA.
 */
export const signController = async (req, res) => {
  try {
    const prospectId = req.body.prospectId;
    if (!prospectId) {
      return res.status(400).json({ message: "prospectId is required." });
    }
    const { prospect, properties } = await getClientDetailsFromDB(prospectId);

    if (!properties || properties.length === 0) {
      return res
        .status(400)
        .json({ message: "No properties found. Contract not sent." });
    }

    const contracts = [];
    const envelopeIds = [];

    // 1. Send client contract (creates Contract row with type CLIENT_CONTRACT)
    const { contract: clientContract, envelopeId: clientEnvelopeId } =
      await contractService.sendDocs({ clientId: prospectId, type: "contract" });
    contracts.push(clientContract);
    envelopeIds.push(clientEnvelopeId);

    // 2. Send one AOA per property (each creates a Contract row with type AOA)
    for (const property of properties) {
      const { contract: aoaContract, envelopeId: aoaEnvelopeId } =
        await contractService.sendDocs({
          clientId: prospectId,
          type: "aoa",
          propertyId: property.id,
        });
      contracts.push(aoaContract);
      envelopeIds.push(aoaEnvelopeId);
    }

    // Optional: keep Client.envelopeId set to client contract envelope for backward compat
    await prisma.client.update({
      where: { id: parseInt(prospectId) },
      data: { envelopeId: clientEnvelopeId },
    });

    res.status(200).json({
      success: true,
      contracts,
      envelopeIds,
      result: { envelopeId: clientEnvelopeId },
      updatedProspect: { id: prospect.id, envelopeId: clientEnvelopeId },
    });
  } catch (error) {
    console.error("Error sending contract:", error);
    const status = error.message?.includes("already been sent") ? 400 : 500;
    res.status(status).json({
      message: error.message || "Error sending contracts",
    });
  }
};

export const previewSignedPdf = async (req, res) => {
  try {
    const prospectId = req.body.prospectId;
    const { prospect, properties } = await getClientDetailsFromDB(prospectId);

    if (!properties || properties.length === 0) {
      return res
        .status(400)
        .json({ message: "No properties found. Contract not generated." });
    }

    const AOAPdfBase64_1 = await fillAOAForm(AOA_PDF_PATH, prospect, properties);
    const ContractPdfBase64_2 = await fillContractForm(
      CONTRACT_PDF_PATH,
      prospect,
      properties
    );

    // Send Base64 data to the frontend for preview
    res.status(200).json({
      aoaPdf: AOAPdfBase64_1,
      contractPdf: ContractPdfBase64_2,
    });
  } catch (error) {
    console.error("Error generating preview:", error);
    res.status(500).json({ message: "Error generating preview" });
  }
};

// 🔥 **Example Usage**
// (async () => {
//   const documentBase64 = await fillPdfFormBase64(
//     "/Users/mukul/Documents/Work/lava/lsptax/new-backend/src/controller/50-162.pdf",
//     6
//   );
//   await sendEnvelope(documentBase64);
// })();
