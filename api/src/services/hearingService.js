import prisma from "../../prisma/prismaClient.js";
import {
  HEARING_MANAGEMENT_PHASE_ID,
} from "../config/lifecycleConstants.js";
import {
  HEARING_STATUS_DEFAULT,
  HEARING_STATUSES,
  parseHearingStatusInput,
} from "../config/hearingConstants.js";
import { paginate } from "../utils/pagination.js";
import { getDayRange, getWeekRange } from "../utils/weekRange.js";

/** Active hearings only (not soft-deleted). */
const notDeleted = { deletedAt: null };

const propertyWithClientSelect = {
  select: {
    id: true,
    accountNumber: true,
    propertyAddress: true,
    cadCounty: true,
    client: {
      select: {
        id: true,
        clientNumber: true,
        clientName: true,
      },
    },
  },
};

/** Flat row for hearings table / list APIs. */
export function hearingListItemDto(row) {
  const client = row.property?.client;
  return {
    id: row.id,
    propertyId: row.propertyId,
    clientId: client?.id ?? row.property?.clientId ?? null,
    clientName: client?.clientName ?? null,
    clientNumber: client?.clientNumber ?? null,
    accountNumber: row.property?.accountNumber ?? null,
    propertyAddress: row.property?.propertyAddress ?? null,
    date: row.date instanceof Date ? row.date.toISOString() : row.date,
    status: row.status ?? HEARING_STATUS_DEFAULT,
    notes: row.notes ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

const hearingListSelect = {
  id: true,
  propertyId: true,
  date: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  property: propertyWithClientSelect,
};

function parseHearingDate(raw) {
  if (raw == null || raw === "") return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findPropertyForHearing(propertyId) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      isArchived: true,
      lifecyclePhase: true,
    },
  });
}

function assertPropertyCanSchedule(property) {
  if (!property) {
    const err = new Error("Property not found");
    err.statusCode = 404;
    throw err;
  }
  if (property.isArchived) {
    const err = new Error("Cannot add hearing for archived property");
    err.statusCode = 400;
    throw err;
  }
  if (property.lifecyclePhase !== HEARING_MANAGEMENT_PHASE_ID) {
    const err = new Error(
      "Property must be in hearingManagement lifecycle phase to schedule a hearing"
    );
    err.statusCode = 400;
    throw err;
  }
}

export async function createHearing({ propertyId, date, notes, status }) {
  const pid = parseInt(propertyId, 10);
  if (!Number.isFinite(pid)) {
    const err = new Error("Invalid propertyId");
    err.statusCode = 400;
    throw err;
  }

  const parsedDate = parseHearingDate(date);
  if (!parsedDate) {
    const err = new Error("Invalid or missing date");
    err.statusCode = 400;
    throw err;
  }

  const parsedStatus =
    status != null && status !== ""
      ? parseHearingStatusInput(status)
      : HEARING_STATUS_DEFAULT;
  if (status != null && status !== "" && parsedStatus == null) {
    const err = new Error(
      `Invalid status. Allowed: ${HEARING_STATUSES.join(", ")}`
    );
    err.statusCode = 400;
    throw err;
  }

  const property = await findPropertyForHearing(pid);
  assertPropertyCanSchedule(property);

  const hearing = await prisma.hearing.create({
    data: {
      propertyId: pid,
      date: parsedDate,
      notes: notes ?? null,
      status: parsedStatus,
    },
    select: hearingListSelect,
  });

  return hearingListItemDto(hearing);
}

export async function updateHearing(hearingId, { date, notes, status }) {
  const id = parseInt(hearingId, 10);
  if (!Number.isFinite(id)) {
    const err = new Error("Invalid hearing id");
    err.statusCode = 400;
    throw err;
  }

  const existing = await prisma.hearing.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) {
    const err = new Error("Hearing not found");
    err.statusCode = 404;
    throw err;
  }

  const data = {};
  if (date !== undefined) {
    const parsed = parseHearingDate(date);
    if (!parsed) {
      const err = new Error("Invalid date");
      err.statusCode = 400;
      throw err;
    }
    data.date = parsed;
  }
  if (notes !== undefined) data.notes = notes;
  if (status !== undefined) {
    const parsed = parseHearingStatusInput(status);
    if (parsed == null) {
      const err = new Error(
        `Invalid status. Allowed: ${HEARING_STATUSES.join(", ")}`
      );
      err.statusCode = 400;
      throw err;
    }
    data.status = parsed;
  }

  if (!Object.keys(data).length) {
    const err = new Error("No fields to update");
    err.statusCode = 400;
    throw err;
  }

  const hearing = await prisma.hearing.update({
    where: { id },
    data,
    select: hearingListSelect,
  });

  return hearingListItemDto(hearing);
}

export async function deleteHearing(hearingId) {
  const id = parseInt(hearingId, 10);
  if (!Number.isFinite(id)) {
    const err = new Error("Invalid hearing id");
    err.statusCode = 400;
    throw err;
  }

  const existing = await prisma.hearing.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) {
    const err = new Error("Hearing not found");
    err.statusCode = 404;
    throw err;
  }

  const deletedAt = new Date();
  await prisma.hearing.update({
    where: { id },
    data: { deletedAt },
  });
  return { id, deletedAt: deletedAt.toISOString() };
}

/** Hearings for one property (flat rows, no extra property payload). */
export async function getHearingsByPropertyId(propertyId) {
  const pid = parseInt(propertyId, 10);
  if (!Number.isFinite(pid)) return [];

  const rows = await prisma.hearing.findMany({
    where: { propertyId: pid, ...notDeleted },
    orderBy: { date: "asc" },
    select: {
      id: true,
      propertyId: true,
      date: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return rows.map((h) => ({
    id: h.id,
    propertyId: h.propertyId,
    date: h.date instanceof Date ? h.date.toISOString() : h.date,
    status: h.status,
    notes: h.notes ?? null,
    createdAt:
      h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt,
    updatedAt:
      h.updatedAt instanceof Date ? h.updatedAt.toISOString() : h.updatedAt,
  }));
}

function buildListWhere({ from, to, status }) {
  const where = {
    ...notDeleted,
    property: { isArchived: false },
  };
  const dateFilter = {};
  const fromDate = from ? parseHearingDate(from) : null;
  const toDate = to ? parseHearingDate(to) : null;
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = toDate;
  if (Object.keys(dateFilter).length) where.date = dateFilter;

  if (status != null && status !== "") {
    const parsed = parseHearingStatusInput(status);
    if (parsed) where.status = parsed;
  }

  return where;
}

/** Paginated hearings table: propertyId, clientId, clientName, date, status, etc. */
export async function listHearings({ limit, offset, from, to, status }) {
  const where = buildListWhere({ from, to, status });
  return paginate(prisma.hearing, {
    where,
    orderBy: { date: "asc" },
    select: hearingListSelect,
    limit,
    offset,
    transform: hearingListItemDto,
  });
}

/** Dashboard hearing stats (non-archived properties only). */
export async function getHearingStats() {
  const now = new Date();
  const { start: weekStart, end: weekEnd } = getWeekRange(now);
  const { start: dayStart, end: dayEnd } = getDayRange(now);

  const baseWhere = {
    ...notDeleted,
    property: { isArchived: false },
  };

  const [meetingsThisWeek, meetingsToday, totalScheduled] = await Promise.all([
    prisma.hearing.count({
      where: {
        ...baseWhere,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.hearing.count({
      where: {
        ...baseWhere,
        date: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.hearing.count({
      where: {
        ...baseWhere,
        status: "SCHEDULED",
      },
    }),
  ]);

  return {
    meetingsThisWeek,
    meetingsToday,
    totalScheduled,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };
}

export { HEARING_STATUSES, HEARING_STATUS_DEFAULT };
