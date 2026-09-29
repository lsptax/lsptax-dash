import { sanitizeSearchTerm } from "./search.js";
import { normalizeAccountNumber } from "./accountNumberNormalize.js";

/** Postgres int4 max. Longer digit strings are account numbers, not property ids. */
const MAX_INT4 = 2147483647;

/**
 * Build Prisma OR conditions for property search.
 * - Account number: case-insensitive contains + leading-zero tolerant for numeric terms
 * - Client name, property address, and mailing address: case-insensitive contains
 * - Property id: exact match when the query fits in a 32-bit id
 */
export function buildPropertySearchOrConditions(searchTerm) {
  const q = sanitizeSearchTerm(searchTerm);
  if (!q) return [];

  const contains = { contains: q, mode: "insensitive" };
  const orConditions = [
    { accountNumber: contains },
    { propertyAddress: contains },
    { mailingAddress: contains },
    { client: { clientName: contains } },
  ];

  if (/^\d+$/.test(q)) {
    const stripped = normalizeAccountNumber(q);
    if (stripped && stripped !== q) {
      orConditions.push({
        accountNumber: { contains: stripped, mode: "insensitive" },
      });
      orConditions.push({
        accountNumber: { equals: stripped, mode: "insensitive" },
      });
    }
    // User may search without leading zeros while DB stores padded form
    for (const padLen of [10, 11, 12, 13, 14]) {
      if (q.length > 0 && q.length < padLen) {
        const padded = q.padStart(padLen, "0");
        orConditions.push({
          accountNumber: { equals: padded, mode: "insensitive" },
        });
      }
    }
    if (stripped) {
      orConditions.push({
        accountNumber: { equals: stripped, mode: "insensitive" },
      });
    }
  }

  if (/^\d+$/.test(q)) {
    const idNum = Number(q);
    if (Number.isInteger(idNum) && idNum > 0 && idNum <= MAX_INT4) {
      orConditions.push({ id: idNum });
    }
  }

  return orConditions;
}

export function propertySearchWhere(searchTerm) {
  const orConditions = buildPropertySearchOrConditions(searchTerm);
  if (!orConditions.length) return {};
  return { OR: orConditions };
}
