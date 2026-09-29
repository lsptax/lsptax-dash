import { Prisma } from "@prisma/client";
import prisma from "../../prisma/prismaClient.js";
import { parseGlobalSearch, SEARCH_SECTION_LIMIT } from "../utils/globalSearch.js";

const LIMIT = SEARCH_SECTION_LIMIT;

function like(columnSql, pattern) {
  return Prisma.sql`${columnSql} ILIKE ${pattern} ESCAPE '!'`;
}

function readTotal(rows) {
  const value = rows?.[0]?.total ?? 0;
  return typeof value === "bigint" ? Number(value) : Number(value) || 0;
}

function propertyCountLabel(count) {
  const n = Number(count) || 0;
  return n === 1 ? "1 property" : `${n} properties`;
}

function mapPerson(row, kind) {
  const name = String(row.clientName ?? "").trim() || "Unnamed";
  const number = String(row.clientNumber ?? "").trim();
  const identity = number ? `#${number}` : `ID ${row.id}`;
  return {
    id: Number(row.id),
    title: name,
    subtitle: `${identity} · ${propertyCountLabel(row.propertyCount)}`,
    kind,
    ownerType: kind === "Prospect" ? "PROSPECT" : "CLIENT",
  };
}

function mapProperty(row) {
  const address =
    String(row.propertyAddress ?? "").trim() ||
    String(row.mailingAddress ?? "").trim() ||
    "No address";
  const account = String(row.accountNumber ?? "").trim();
  const clientName = String(row.clientName ?? "").trim();
  const identity = account ? `Acct ${account}` : `ID ${row.id}`;
  const ownerType = row.ownerType === "PROSPECT" ? "PROSPECT" : "CLIENT";
  return {
    id: Number(row.id),
    clientId: Number(row.clientId),
    title: address,
    subtitle: [identity, clientName].filter(Boolean).join(" · "),
    kind: ownerType === "PROSPECT" ? "Prospect property" : "Property",
    ownerType,
  };
}

function personMatch(parsed, alias) {
  const numberCol = Prisma.raw(`${alias}."clientNumber"`);
  const nameCol = Prisma.raw(`${alias}."clientName"`);
  const emailCol = Prisma.raw(`${alias}.email`);
  const phoneCol = Prisma.raw(`${alias}."phoneNumber"`);
  const idCol = Prisma.raw(`${alias}.id`);

  if (parsed.clientNumberOnly) {
    return Prisma.sql`${numberCol} ILIKE ${parsed.prefix} ESCAPE '!'`;
  }

  const ors = [];
  if (parsed.id != null) ors.push(Prisma.sql`${idCol} = ${parsed.id}`);
  if (parsed.useContains) {
    ors.push(like(numberCol, parsed.like));
    ors.push(like(nameCol, parsed.like));
    ors.push(like(emailCol, parsed.like));
    ors.push(like(phoneCol, parsed.like));
  } else {
    ors.push(Prisma.sql`lower(${numberCol}) = ${parsed.term}`);
  }
  if (parsed.strippedLike) ors.push(like(numberCol, parsed.strippedLike));
  return Prisma.join(ors, " OR ");
}

function personOrder(parsed, alias) {
  const idCol = Prisma.raw(`${alias}.id`);
  const numberCol = Prisma.raw(`${alias}."clientNumber"`);
  const nameCol = Prisma.raw(`${alias}."clientName"`);
  const idRank =
    parsed.id == null
      ? Prisma.sql`1`
      : Prisma.sql`CASE WHEN ${idCol} = ${parsed.id} THEN 0 ELSE 1 END`;
  return Prisma.sql`
    ${idRank},
    CASE WHEN lower(${numberCol}) = lower(${parsed.term}) THEN 0 ELSE 1 END,
    CASE WHEN ${nameCol} ILIKE ${parsed.prefix} ESCAPE '!' THEN 0 ELSE 1 END,
    ${nameCol} ASC NULLS LAST,
    ${idCol} ASC
  `;
}

function peopleWhere(parsed, type) {
  return Prisma.sql`
    c."isArchived" = false
    AND c.type = ${type}::"ClientType"
    AND (${personMatch(parsed, "c")})
  `;
}

async function searchPeople(parsed, type) {
  const [countRows, items] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM "Client" c
      WHERE ${peopleWhere(parsed, type)}
    `,
    prisma.$queryRaw`
      SELECT
        c.id,
        c."clientName",
        c."clientNumber",
        (
          SELECT COUNT(*)::int
          FROM "Property" p
          WHERE p."clientId" = c.id AND p."isArchived" = false
        ) AS "propertyCount"
      FROM "Client" c
      WHERE ${peopleWhere(parsed, type)}
      ORDER BY ${personOrder(parsed, "c")}
      LIMIT ${LIMIT}
    `,
  ]);
  return { total: readTotal(countRows), items };
}

function propertyMatch(parsed) {
  if (parsed.clientNumberOnly) {
    return Prisma.sql`p."clientNumber" ILIKE ${parsed.prefix} ESCAPE '!'`;
  }

  const ors = [];
  if (parsed.id != null) ors.push(Prisma.sql`p.id = ${parsed.id}`);
  if (parsed.useContains) {
    ors.push(like(Prisma.raw(`p."accountNumber"`), parsed.like));
    ors.push(like(Prisma.raw(`p."clientNumber"`), parsed.like));
    ors.push(like(Prisma.raw(`p."propertyAddress"`), parsed.like));
    ors.push(like(Prisma.raw(`p."mailingAddress"`), parsed.like));
    ors.push(like(Prisma.raw(`p."nameOnCad"`), parsed.like));
    ors.push(like(Prisma.raw(`c."clientName"`), parsed.like));
  } else {
    ors.push(Prisma.sql`lower(p."accountNumber") = ${parsed.term}`);
    ors.push(Prisma.sql`lower(p."clientNumber") = ${parsed.term}`);
  }
  if (parsed.strippedLike) {
    ors.push(like(Prisma.raw(`p."accountNumber"`), parsed.strippedLike));
    ors.push(like(Prisma.raw(`p."clientNumber"`), parsed.strippedLike));
  }
  return Prisma.join(ors, " OR ");
}

function propertyOrder(parsed) {
  const idRank =
    parsed.id == null
      ? Prisma.sql`1`
      : Prisma.sql`CASE WHEN p.id = ${parsed.id} THEN 0 ELSE 1 END`;
  return Prisma.sql`
    ${idRank},
    CASE WHEN lower(p."accountNumber") = lower(${parsed.term}) THEN 0 ELSE 1 END,
    CASE WHEN lower(p."clientNumber") = lower(${parsed.term}) THEN 0 ELSE 1 END,
    CASE WHEN p."propertyAddress" ILIKE ${parsed.prefix} ESCAPE '!' THEN 0 ELSE 1 END,
    CASE WHEN c."clientName" ILIKE ${parsed.prefix} ESCAPE '!' THEN 0 ELSE 1 END,
    p."propertyAddress" ASC NULLS LAST,
    p.id ASC
  `;
}

function propertiesWhere(parsed) {
  return Prisma.sql`
    p."isArchived" = false
    AND (${propertyMatch(parsed)})
  `;
}

async function searchProperties(parsed) {
  const [countRows, items] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM "Property" p
      JOIN "Client" c ON c.id = p."clientId"
      WHERE ${propertiesWhere(parsed)}
    `,
    prisma.$queryRaw`
      SELECT
        p.id,
        p."clientId",
        p."accountNumber",
        p."propertyAddress",
        p."mailingAddress",
        c."clientName",
        c.type::text AS "ownerType"
      FROM "Property" p
      JOIN "Client" c ON c.id = p."clientId"
      WHERE ${propertiesWhere(parsed)}
      ORDER BY ${propertyOrder(parsed)}
      LIMIT ${LIMIT}
    `,
  ]);
  return { total: readTotal(countRows), items };
}

/**
 * Search clients, properties, and prospects in one round of indexed queries.
 * A number matches row ids and stored numbers. Text matches names and addresses.
 * @param {unknown} rawQuery
 */
export async function searchPortal(rawQuery) {
  const parsed = parseGlobalSearch(rawQuery);
  if (!parsed) return { query: "", sections: [] };

  const [clients, properties, prospects] = await Promise.all([
    searchPeople(parsed, "CLIENT"),
    searchProperties(parsed),
    searchPeople(parsed, "PROSPECT"),
  ]);

  const sections = [
    {
      id: "clients",
      label: "Clients",
      total: clients.total,
      items: clients.items.map((row) => mapPerson(row, "Client")),
    },
    {
      id: "properties",
      label: "Properties",
      total: properties.total,
      items: properties.items.map(mapProperty),
    },
    {
      id: "prospects",
      label: "Prospects",
      total: prospects.total,
      items: prospects.items.map((row) => mapPerson(row, "Prospect")),
    },
  ].filter((section) => section.total > 0);

  return { query: parsed.q, sections };
}
