import prisma from "../../prisma/prismaClient.js";
import { pick } from "../config/constants.js";
import { normalizeClientFeeFieldsForWrite } from "../config/csvColumnMapping.js";
import { checkEnvelopeStatus } from "../controller/docuSignUtils.js";
import { createClient } from "./clientService.js";
import { paginate } from "../utils/pagination.js";

async function enrichProspectAndToDto(p) {
  if (p.envelopeId && p.prospectStatus !== "FORM_SENT") {
    const status = await checkEnvelopeStatus(p.envelopeId);
    if (status === "completed") {
      await prisma.client.update({
        where: { id: p.id },
        data: { prospectStatus: "FORM_SENT" },
      });
      p.prospectStatus = "FORM_SENT";
    }
  }
  return toProspectDto(p);
}

export async function getProspects(limit, offset, enrichDocuSign = true) {
  return paginate(prisma.client, {
    where: { isArchived: false, type: "PROSPECT" },
    orderBy: { createdAt: "desc" },
    limit,
    offset,
    transform: enrichDocuSign ? enrichProspectAndToDto : toProspectDto,
  });
}

export async function getArchiveProspects(limit, offset, enrichDocuSign = true) {
  return paginate(prisma.client, {
    where: { isArchived: true, type: "PROSPECT" },
    orderBy: { createdAt: "desc" },
    limit,
    offset,
    transform: enrichDocuSign ? enrichProspectAndToDto : toProspectDto,
  });
}

function toProspectDto(p) {
  const status =
    p.envelopeId && p.prospectStatus === "FORM_SENT"
      ? "SIGNED"
      : p.envelopeId
        ? "IN_PROGRESS"
        : p.prospectStatus;
  return {
    id: p.id,
    name: p.clientName,
    email: p.email,
    mobile: p.phoneNumber,
    address: p.mailingAddress,
    inquireDate: p.createdAt,
    isArchived: p.isArchived,
    status,
    envelopeId: p.envelopeId,
    contingencyFee: p.contingencyFee != null ? Number(p.contingencyFee) : null,
    flatFee: p.flatFee != null ? Number(p.flatFee) : null,
  };
}

export async function getProspectDetails(prospectId, enrichDocuSign = true) {
  let prospect = await prisma.client.findFirst({
    where: { id: parseInt(prospectId), type: "PROSPECT" },
  });
  if (!prospect) return null;

  if (enrichDocuSign && prospect.envelopeId && prospect.prospectStatus !== "FORM_SENT") {
    const status = await checkEnvelopeStatus(prospect.envelopeId);
    if (status === "completed") {
      await prisma.client.update({
        where: { id: prospect.id },
        data: { prospectStatus: "FORM_SENT" },
      });
      prospect = await prisma.client.findFirst({
        where: { id: parseInt(prospectId), type: "PROSPECT" },
      });
    }
  }

  const properties = await prisma.property.findMany({
    where: { clientId: prospect.id },
  });
  return { prospect, properties };
}

export async function getProspectPropertyDetails(propertyId) {
  const property = await prisma.property.findUnique({
    where: { id: parseInt(propertyId) },
  });
  if (!property) return null;
  const client = await prisma.client.findUnique({
    where: { id: property.clientId },
  });
  return { propertyDetails: property, clientDetails: client };
}

export async function createProspect(data) {
  const row = {
    type: "PROSPECT",
    clientName: data.clientName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    mailingAddress: data.mailingAddress,
    mailingAddressCityTxZip: data.mailingAddressCityTxZip,
    contingencyFee: data.contingencyFee,
    flatFee: data.flatFee,
  };
  normalizeClientFeeFieldsForWrite(row);
  return prisma.client.create({ data: row });
}

export async function findProspectByEmail(email) {
  return prisma.client.findFirst({
    where: { type: "PROSPECT", email },
    select: { email: true },
  });
}

export async function updateProspect(prospectId, data, allowedFields) {
  const safeData = pick(data, allowedFields);
  normalizeClientFeeFieldsForWrite(safeData);
  return prisma.client.update({
    where: { id: parseInt(prospectId) },
    data: safeData,
  });
}

export async function deleteProspect(id) {
  const propIds = (
    await prisma.property.findMany({ where: { clientId: id }, select: { id: true } })
  ).map((p) => p.id);
  await prisma.invoice.deleteMany({ where: { propertyId: { in: propIds } } });
  await prisma.property.deleteMany({ where: { clientId: id } });
  return prisma.client.delete({ where: { id } });
}

export async function findProspectById(id) {
  return prisma.client.findFirst({
    where: { id: parseInt(id), type: "PROSPECT" },
  });
}

export async function convertProspectToClient(prospectId, clientNumber) {
  const prospect = await prisma.client.findFirst({
    where: { id: parseInt(prospectId), type: "PROSPECT" },
  });
  if (!prospect) return null;

  const prospectProperties = await prisma.property.findMany({
    where: { clientId: prospect.id },
  });

  const newClient = await createClient({
    clientName: prospect.clientName,
    email: prospect.email,
    phoneNumber: prospect.phoneNumber,
    mailingAddressCityTxZip: prospect.mailingAddressCityTxZip,
    typeOfAcct: prospect.typeOfAcct,
    envelopeId: prospect.envelopeId,
    billingEmail: prospect.billingEmail,
    billingAddress: prospect.billingAddress,
    contingencyFee: prospect.contingencyFee,
    flatFee: prospect.flatFee,
    clientNumber,
  });

  for (const prop of prospectProperties) {
    await prisma.property.create({
      data: {
        clientId: newClient.id,
        clientNumber: newClient.clientNumber,
        statusNotes: prop.statusNotes,
        otherNotes: prop.otherNotes,
        nameOnCad: prop.nameOnCad,
        mailingAddress: prop.mailingAddress,
        mailingAddressCityTxZip: prop.mailingAddressCityTxZip,
        propertyAddress: prop.propertyAddress,
        cadMailingAddress: prop.cadMailingAddress,
        cadCity: prop.cadCity,
        cadZipCode: prop.cadZipCode,
        cadCounty: prop.cadCounty,
        accountNumber: prop.accountNumber,
        contactOwner: prop.contactOwner,
        subcontractOwner: prop.subcontractOwner,
        bppFee: prop.bppFee,
        flatFee: prop.flatFee,
        aoaSigned: prop.aoaSigned,
        hearingDate: prop.hearingDate,
        isArchived: prop.isArchived,
      },
    });
  }

  await prisma.client.update({
    where: { id: parseInt(prospectId) },
    data: { isArchived: true },
  });

  return newClient;
}

export async function changeProspectStatus(prospectId, newStatus) {
  const prospect = await prisma.client.findFirst({
    where: { id: prospectId, type: "PROSPECT" },
    select: { prospectStatus: true },
  });
  if (!prospect) return null;
  return prisma.client.update({
    where: { id: prospectId },
    data: { prospectStatus: newStatus },
  });
}

export async function getProspectsForExport() {
  return prisma.client.findMany({ where: { type: "PROSPECT" } });
}

export async function addPropertyToProspect(prospectId, propertyData) {
  const client = await prisma.client.findFirst({
    where: { id: parseInt(prospectId), type: "PROSPECT" },
  });
  if (!client) return null;

  const defaults = {
    statusNotes: "",
    otherNotes: "",
    nameOnCad: "",
    mailingAddress: "",
    mailingAddressCityTxZip: "",
    propertyAddress: "",
    cadMailingAddress: "",
    cadCity: "",
    cadZipCode: "",
    cadCounty: "",
    accountNumber: "",
    contactOwner: "",
    subcontractOwner: "",
    bppFee: "",
    flatFee: "",
    aoaSigned: "",
    hearingDate: "",
  };
  const data = { ...defaults, ...propertyData };
  return prisma.property.create({
    data: {
      clientId: client.id,
      clientNumber: String(prospectId),
      ...data,
    },
  });
}
