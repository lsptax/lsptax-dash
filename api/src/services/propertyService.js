import prisma from "../../prisma/prismaClient.js";
import { pick } from "../config/constants.js";
import {
  buildLifecycleResponse,
  resolveLifecycleUpdate,
  LIFECYCLE_PATCH_FIELDS,
} from "../config/propertyLifecycle.js";
import { getHearingsByPropertyId } from "./hearingService.js";
import { paginate } from "../utils/pagination.js";
import { sanitizeSearchTerm } from "../utils/search.js";

const propertyToDto = (p) => ({
  clientId: p.clientId,
  clientNumber: p.clientNumber,
  propertyId: p.id,
  propertyAccount: p.accountNumber,
  propertyDetails: {
    assessor: p.cadCounty,
    address: [p.mailingAddress, p.mailingAddressCityTxZip],
  },
  cadOwner: {
    name: p.nameOnCad,
    address: p.cadMailingAddress,
    county: p.cadCounty,
  },
  addedOn: p.createdAt,
  status: p.isArchived,
});

/** Build OR filter for property search: property id, accountNumber, client name (case-insensitive). */
function propertySearchWhere(searchTerm) {
  const q = sanitizeSearchTerm(searchTerm);
  if (!q) return {};
  const contains = { contains: q, mode: "insensitive" };
  const orConditions = [
    { accountNumber: contains },
    { client: { clientName: contains } },
  ];
  const idNum = parseInt(q, 10);
  if (Number.isFinite(idNum)) orConditions.push({ id: idNum });
  return { OR: orConditions };
}

function normalizeAccountType(accountType) {
  const raw = sanitizeSearchTerm(accountType);
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "real") return "real";
  if (v === "bpp") return "bpp";
  return "__invalid__";
}

function propertyAccountTypeWhere(accountType) {
  const normalized = normalizeAccountType(accountType);
  if (!normalized) return {};
  if (normalized === "__invalid__") return { __invalidAccountType: true };
  return {
    client: {
      typeOfAcct: {
        equals: normalized,
        mode: "insensitive",
      },
    },
  };
}

function buildPropertyWhere({ isArchived, search, accountType }) {
  const baseWhere = { isArchived };
  const and = [];

  const searchWhere = propertySearchWhere(search);
  if (Object.keys(searchWhere).length) and.push(searchWhere);

  const accountTypeWhere = propertyAccountTypeWhere(accountType);
  if (accountTypeWhere.__invalidAccountType) return { __invalidAccountType: true };
  if (Object.keys(accountTypeWhere).length) and.push(accountTypeWhere);

  return and.length ? { ...baseWhere, AND: and } : baseWhere;
}

export async function getProperties(limit, offset, search, accountType) {
  const where = buildPropertyWhere({ isArchived: false, search, accountType });
  if (where.__invalidAccountType) {
    const err = new Error("Invalid accountType. Allowed values: real, bpp");
    err.statusCode = 400;
    throw err;
  }

  return paginate(prisma.property, {
    where,
    orderBy: { clientNumber: "asc" },
    select: {
      clientId: true,
      clientNumber: true,
      id: true,
      accountNumber: true,
      cadCounty: true,
      mailingAddress: true,
      mailingAddressCityTxZip: true,
      nameOnCad: true,
      cadMailingAddress: true,
      createdAt: true,
      isArchived: true,
    },
    limit,
    offset,
    transform: propertyToDto,
  });
}

export async function getArchiveProperties(limit, offset, search, accountType) {
  const where = buildPropertyWhere({ isArchived: true, search, accountType });
  if (where.__invalidAccountType) {
    const err = new Error("Invalid accountType. Allowed values: real, bpp");
    err.statusCode = 400;
    throw err;
  }

  return paginate(prisma.property, {
    where,
    orderBy: { clientNumber: "asc" },
    select: {
      clientId: true,
      clientNumber: true,
      id: true,
      accountNumber: true,
      cadCounty: true,
      mailingAddress: true,
      mailingAddressCityTxZip: true,
      nameOnCad: true,
      cadMailingAddress: true,
      createdAt: true,
      isArchived: true,
    },
    limit,
    offset,
    transform: propertyToDto,
  });
}

export async function getPropertyDetails(propertyId) {
  const property = await prisma.property.findUnique({
    where: { id: parseInt(propertyId) },
    include: {
      client: true,
      invoices: true,
    },
  });
  if (!property) return null;

  const { client, invoices, ...propertyOnly } = property;
  const lifecycle = buildLifecycleResponse(propertyOnly);
  const {
    lifecyclePhase: _lifecyclePhase,
    lifecycleStep: _lifecycleStep,
    lifecycleHistory: _lifecycleHistory,
    lifecycleCompletedAt: _lifecycleCompletedAt,
    lifecycleNotes: _lifecycleNotes,
    ...propertyDetails
  } = propertyOnly;
  const hearings = await getHearingsByPropertyId(propertyId);

  return {
    propertyDetails,
    client,
    invoices,
    lifecycle,
    hearings,
  };
}

export async function getPropertiesByClientId(clientId) {
  const properties = await prisma.property.findMany({
    where: { clientId: parseInt(clientId) },
    select: {
      clientId: true,
      clientNumber: true,
      id: true,
      accountNumber: true,
      cadCounty: true,
      mailingAddress: true,
      mailingAddressCityTxZip: true,
      nameOnCad: true,
      cadMailingAddress: true,
      cadCity: true,
      createdAt: true,
      isArchived: true,
      contactOwner: true,
    },
  });
  return properties.map((p) => ({
    ...propertyToDto(p),
    propertyDetails: { assessor: p.contactOwner, address: [p.mailingAddress, p.mailingAddressCityTxZip] },
    cadOwner: {
      name: p.nameOnCad,
      address: `${p.cadMailingAddress || ""} ${p.cadCity || ""}`.trim(),
      county: p.cadCounty,
    },
  }));
}

export async function updateProperty(propertyId, data, allowedFields) {
  const id = parseInt(propertyId);
  const safeData = pick(data, allowedFields);

  const hasLifecyclePatch = LIFECYCLE_PATCH_FIELDS.some((k) =>
    Object.prototype.hasOwnProperty.call(safeData, k)
  );

  if (hasLifecyclePatch) {
    const lifecyclePatch = pick(safeData, LIFECYCLE_PATCH_FIELDS);
    for (const k of LIFECYCLE_PATCH_FIELDS) delete safeData[k];

    const existing = await prisma.property.findUnique({
      where: { id },
      select: {
        lifecyclePhase: true,
        lifecycleStep: true,
        lifecycleNotes: true,
        lifecycleHistory: true,
      },
    });
    if (!existing) {
      const err = new Error("Property not found");
      err.statusCode = 404;
      throw err;
    }
    const { data: lifecycleData, error } = resolveLifecycleUpdate(
      existing,
      lifecyclePatch
    );
    if (error) {
      const err = new Error(error);
      err.statusCode = 400;
      throw err;
    }
    Object.assign(safeData, lifecycleData);
  }

  return prisma.property.update({
    where: { id },
    data: safeData,
  });
}

export async function updatePropertyMany(propertyId, data, allowedFields) {
  const safeData = pick(data, allowedFields);
  // Bulk path can't safely resolve lifecycle history; require single-property update for lifecycle.
  for (const k of LIFECYCLE_PATCH_FIELDS) delete safeData[k];
  return prisma.property.updateMany({
    where: { id: parseInt(propertyId) },
    data: safeData,
  });
}

export async function addPropertyToClient(clientId, propertyData) {
  const client = await prisma.client.findUnique({
    where: { id: parseInt(clientId, 10) },
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
  const { clientId: _skipId, clientNumber: _skipNum, ...rest } = propertyData || {};
  const data = { ...defaults, ...rest };
  const newProperty = await prisma.property.create({
    data: {
      ...data,
      clientId: client.id,
      clientNumber: client.clientNumber,
    },
  });

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 4;
  for (let year = startYear; year <= currentYear; year++) {
    await prisma.invoice.create({
      data: {
        propertyId: newProperty.id,
        accountNumber: newProperty.accountNumber,
        clientNumber: client.clientNumber,
        year,
      },
    });
  }
  return newProperty;
}

export async function deleteProperty(propertyId) {
  const property = await prisma.property.findUnique({
    where: { id: parseInt(propertyId) },
  });
  if (!property) return null;
  await prisma.invoice.deleteMany({ where: { propertyId: property.id } });
  await prisma.property.delete({ where: { id: parseInt(propertyId) } });
  return property;
}

export async function toggleArchive(model, id) {
  const record = await model.findUnique({ where: { id: parseInt(id) } });
  if (!record) return null;
  return model.update({
    where: { id: parseInt(id) },
    data: { isArchived: !record.isArchived },
  });
}

export function getArchiveTableMapping() {
  return {
    client: prisma.client,
    // Prospects are stored in the Client table with type="PROSPECT"
    prospect: prisma.client,
    invoice: prisma.invoice,
    property: prisma.property,
    prospectProperty: prisma.property,
  };
}

export async function getPropertiesForExport({ accountType } = {}) {
  const where = buildPropertyWhere({ isArchived: false, search: null, accountType });
  if (where.__invalidAccountType) {
    const err = new Error("Invalid accountType. Allowed values: real, bpp");
    err.statusCode = 400;
    throw err;
  }
  return prisma.property.findMany({ where });
}
