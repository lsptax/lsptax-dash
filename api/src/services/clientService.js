import prisma from "../../prisma/prismaClient.js";
import { pick } from "../config/constants.js";
import { normalizeClientFeeFieldsForWrite } from "../config/csvColumnMapping.js";
import { paginate } from "../utils/pagination.js";
import { sanitizeSearchTerm } from "../utils/search.js";

/** clientId = system id (Client.id). clientNumber = user-entered only (not used in any query). */
export async function createClient(clientData) {
  const data = {
    type: "CLIENT",
    clientNumber: clientData.clientNumber ?? null,
    ...clientData,
  };
  normalizeClientFeeFieldsForWrite(data);
  return prisma.client.create({ data });
}

const clientToDto = (c) => ({
  clientId: c.id,
  clientNumber: c.clientNumber,
  clientName: c.clientName,
  email: c.email,
  mobile: c.phoneNumber,
  isArchived: c.isArchived,
  type: c.typeOfAcct,
  contingencyFee: c.contingencyFee != null ? Number(c.contingencyFee) : null,
  flatFee: c.flatFee != null ? Number(c.flatFee) : null,
});

/** Build filter for client search.
 * - If search starts with "#<number>", treat it as clientNumber (user-entered) (e.g. "#231" → clientNumber = "231").
 * - Otherwise, search clientName, email, phoneNumber (case-insensitive).
 */
function clientSearchWhere(searchTerm) {
  const raw = sanitizeSearchTerm(searchTerm);
  if (!raw) return {};

  // "#123" → search by clientNumber, not phone/email
  if (raw.startsWith("#")) {
    const numPart = raw.slice(1).trim();
    if (/^\d+$/.test(numPart)) {
      return {
        clientNumber: {
          startsWith: numPart,
          mode: "insensitive",
        },
      };
    }
    // If "#something" but not numeric, fall through to text search
  }

  const q = raw;
  const contains = { contains: q, mode: "insensitive" };
  return {
    OR: [
      { clientName: contains },
      { email: contains },
      { phoneNumber: contains },
    ],
  };
}

function normalizeAccountType(accountType) {
  const raw = sanitizeSearchTerm(accountType);
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "real") return "real";
  if (v === "bpp") return "bpp";
  return "__invalid__";
}

function clientAccountTypeWhere(accountType) {
  const normalized = normalizeAccountType(accountType);
  if (!normalized) return {};
  if (normalized === "__invalid__") return { __invalidAccountType: true };
  return {
    typeOfAcct: {
      equals: normalized,
      mode: "insensitive",
    },
  };
}

function buildClientWhere({ isArchived, search, accountType }) {
  const baseWhere = { isArchived, type: "CLIENT" };
  const and = [];

  const searchWhere = clientSearchWhere(search);
  if (Object.keys(searchWhere).length) and.push(searchWhere);

  const accountTypeWhere = clientAccountTypeWhere(accountType);
  if (accountTypeWhere.__invalidAccountType) return { __invalidAccountType: true };
  if (Object.keys(accountTypeWhere).length) and.push(accountTypeWhere);

  return and.length ? { ...baseWhere, AND: and } : baseWhere;
}

export async function getClients(limit, offset, search, accountType) {
  const where = buildClientWhere({ isArchived: false, search, accountType });
  if (where.__invalidAccountType) {
    const err = new Error("Invalid accountType. Allowed values: real, bpp");
    err.statusCode = 400;
    throw err;
  }

  return paginate(prisma.client, {
    where,
    orderBy: { clientNumber: "asc" },
    select: {
      id: true,
      clientNumber: true,
      clientName: true,
      email: true,
      phoneNumber: true,
      isArchived: true,
      typeOfAcct: true,
      contingencyFee: true,
      flatFee: true,
    },
    limit,
    offset,
    transform: clientToDto,
  });
}

export async function getArchiveClients(limit, offset, search, accountType) {
  const where = buildClientWhere({ isArchived: true, search, accountType });
  if (where.__invalidAccountType) {
    const err = new Error("Invalid accountType. Allowed values: real, bpp");
    err.statusCode = 400;
    throw err;
  }

  return paginate(prisma.client, {
    where,
    orderBy: { clientNumber: "asc" },
    select: {
      id: true,
      clientNumber: true,
      clientName: true,
      email: true,
      phoneNumber: true,
      isArchived: true,
      typeOfAcct: true,
      contingencyFee: true,
      flatFee: true,
    },
    limit,
    offset,
    transform: clientToDto,
  });
}

export async function getClientDetails(clientId) {
  const id = parseInt(clientId, 10);
  if (Number.isNaN(id)) return null;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { properties: true },
  });
  if (!client) return null;
  const { properties, ...clientRest } = client;
  return { client: clientRest, properties };
}

export async function getClientsForExport({ accountType } = {}) {
  const where = buildClientWhere({ isArchived: false, search: null, accountType });
  if (where.__invalidAccountType) {
    const err = new Error("Invalid accountType. Allowed values: real, bpp");
    err.statusCode = 400;
    throw err;
  }
  return prisma.client.findMany({ where });
}

export async function getAllClientsForExport() {
  return prisma.client.findMany();
}

export async function updateClient(clientId, data, allowedFields) {
  const id = parseInt(clientId, 10);
  const safeData = pick(data, allowedFields);
  normalizeClientFeeFieldsForWrite(safeData);

  return prisma.client.update({
    where: { id },
    data: safeData,
  });
}

export async function deleteClient(id) {
  const clientProps = await prisma.property.findMany({
    where: { clientId: id },
    select: { id: true },
  });
  const propIds = clientProps.map((p) => p.id);
  await prisma.invoice.deleteMany({ where: { propertyId: { in: propIds } } });
  await prisma.property.deleteMany({ where: { clientId: id } });
  return prisma.client.delete({ where: { id } });
}

export async function findClientById(id) {
  return prisma.client.findUnique({ where: { id } });
}

export async function findClientByClientNumber(clientNumber) {
  return prisma.client.findFirst({
    where: { type: "CLIENT", clientNumber },
  });
}
