import { sanitizeSearchTerm } from "./search.js";
import { normalizeAccountNumber } from "./accountNumberNormalize.js";

/** Max digits before a numeric search term is treated as an account number, not property id. */
export const MAX_PROPERTY_ID_SEARCH_LENGTH = 7;

/**
 * Build Prisma OR conditions for property search.
 * - Account number: case-insensitive contains + leading-zero tolerant for numeric terms
 * - Client name: case-insensitive contains
 * - Property id: only for short numeric queries (avoids Harris County account numbers matching as ids)
 */
export function buildPropertySearchOrConditions(searchTerm) {
  const q = sanitizeSearchTerm(searchTerm);
  if (!q) return [];

  const contains = { contains: q, mode: "insensitive" };
  const orConditions = [
    { accountNumber: contains },
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

  // Only match property id for short numeric queries (not long account numbers)
  if (/^\d+$/.test(q) && q.length <= MAX_PROPERTY_ID_SEARCH_LENGTH) {
    const idNum = parseInt(q, 10);
    if (Number.isFinite(idNum) && String(idNum) === String(parseInt(q, 10))) {
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
