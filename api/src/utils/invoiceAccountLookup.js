/**
 * Invoice CSV account lookup helpers.
 * Supports combined property account numbers like "R477107/R524073" when the CSV
 * row uses a single segment (e.g. "R477107"), and leading-zero differences for
 * numeric accounts (e.g. Harris County: CSV "690250030117" vs DB "0690250030117").
 */

import { normalizeAccountNumber } from "./accountNumberNormalize.js";

const PROPERTY_SELECT = {
  id: true,
  accountNumber: true,
  clientNumber: true,
  client: { select: { contingencyFee: true } },
};

/** Common padded account lengths (Harris County and similar CAD exports). */
const ACCOUNT_PAD_LENGTHS = [10, 11, 12, 13, 14];

export function accountNumberSegments(accountNumber) {
  return String(accountNumber ?? "")
    .trim()
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build Prisma OR conditions to match a CSV account against slash-combined account numbers. */
export function buildCombinedAccountOrConditions(csvAccount) {
  const acct = String(csvAccount ?? "").trim();
  if (!acct) return [];
  return [
    { accountNumber: { startsWith: `${acct}/`, mode: "insensitive" } },
    { accountNumber: { endsWith: `/${acct}`, mode: "insensitive" } },
    { accountNumber: { contains: `/${acct}/`, mode: "insensitive" } },
  ];
}

/**
 * DB account string variants that may match a CSV numeric account (leading zeros).
 */
export function leadingZeroAccountCandidates(accountNumber) {
  const trimmed = String(accountNumber ?? "").trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return [];

  const candidates = new Set([trimmed]);
  const normalized = normalizeAccountNumber(trimmed);
  if (normalized) candidates.add(normalized);

  for (const base of [trimmed, normalized]) {
    for (const len of ACCOUNT_PAD_LENGTHS) {
      if (base.length > 0 && base.length < len) {
        candidates.add(base.padStart(len, "0"));
      }
    }
  }
  return [...candidates];
}

/** Keys used to index/lookup a numeric account (exact, normalized, common paddings). */
export function accountLookupKeys(accountNumber) {
  const trimmed = String(accountNumber ?? "").trim();
  if (!trimmed) return [];
  const keys = new Set([trimmed]);
  if (/^\d+$/.test(trimmed)) {
    keys.add(normalizeAccountNumber(trimmed));
    for (const len of ACCOUNT_PAD_LENGTHS) {
      if (trimmed.length < len) keys.add(trimmed.padStart(len, "0"));
    }
  }
  return [...keys];
}

function propertyMatchesCsvAccount(property, csvAccount) {
  const csv = String(csvAccount ?? "").trim();
  if (!csv) return false;

  const dbAccount = String(property.accountNumber ?? "").trim();
  if (dbAccount.toLowerCase() === csv.toLowerCase()) return true;

  const segments = accountNumberSegments(dbAccount);
  if (segments.some((s) => s.toLowerCase() === csv.toLowerCase())) return true;

  if (/^\d+$/.test(csv)) {
    const csvNorm = normalizeAccountNumber(csv);
    if (/^\d+$/.test(dbAccount) && normalizeAccountNumber(dbAccount) === csvNorm) {
      return true;
    }
    for (const segment of segments) {
      if (/^\d+$/.test(segment) && normalizeAccountNumber(segment) === csvNorm) {
        return true;
      }
    }
  }

  return false;
}

function unresolvedCsvAccounts(csvAccounts, properties) {
  const resolved = new Set();
  for (const acct of csvAccounts) {
    for (const property of properties) {
      if (propertyMatchesCsvAccount(property, acct)) {
        resolved.add(acct.toLowerCase());
        break;
      }
    }
  }
  return csvAccounts.filter((acct) => !resolved.has(acct.toLowerCase()));
}

/**
 * Load properties for invoice CSV rows: exact match, combined-account segment match,
 * and leading-zero tolerant match for numeric accounts.
 */
export async function findPropertiesForInvoiceCsv(prisma, csvAccountNumbers) {
  const trimmed = [
    ...new Set(
      csvAccountNumbers
        .map((a) => String(a ?? "").trim())
        .filter(Boolean)
    ),
  ];
  if (trimmed.length === 0) return [];

  const byId = new Map();
  const addProperties = (properties) => {
    for (const property of properties) {
      byId.set(property.id, property);
    }
  };
  const matchedProperties = () => [...byId.values()];

  const exactMatches = await prisma.property.findMany({
    where: { accountNumber: { in: trimmed } },
    select: PROPERTY_SELECT,
  });
  addProperties(exactMatches);

  let unresolved = unresolvedCsvAccounts(trimmed, matchedProperties());

  if (unresolved.length > 0) {
    const segmentConditions = unresolved.flatMap((acct) =>
      buildCombinedAccountOrConditions(acct)
    );
    const segmentMatches = await prisma.property.findMany({
      where: { OR: segmentConditions },
      select: PROPERTY_SELECT,
    });
    addProperties(segmentMatches);
    unresolved = unresolvedCsvAccounts(trimmed, matchedProperties());
  }

  const numericUnresolved = unresolved.filter((acct) => /^\d+$/.test(acct));
  if (numericUnresolved.length > 0) {
    const candidates = [
      ...new Set(numericUnresolved.flatMap((acct) => leadingZeroAccountCandidates(acct))),
    ];
    const leadingZeroMatches = await prisma.property.findMany({
      where: { accountNumber: { in: candidates } },
      select: PROPERTY_SELECT,
    });
    addProperties(leadingZeroMatches);
  }

  return matchedProperties();
}

/**
 * Index properties by full account number and each slash segment (lowest property.id wins per key).
 * Numeric keys include normalized and common zero-padded forms.
 */
export function buildInvoicePropertyLookupMap(properties) {
  const map = new Map();

  const addKey = (key, property) => {
    const k = String(key ?? "").trim();
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(property);
  };

  const indexAccount = (accountKey, property) => {
    for (const key of accountLookupKeys(accountKey)) {
      addKey(key, property);
    }
  };

  for (const property of properties) {
    const full = String(property.accountNumber ?? "").trim();
    if (!full) continue;
    indexAccount(full, property);
    for (const segment of accountNumberSegments(full)) {
      indexAccount(segment, property);
    }
  }

  for (const arr of map.values()) {
    arr.sort((a, b) => a.id - b.id);
  }
  return map;
}

export function pickPropertyForInvoiceRow(lookupMap, accountNumber) {
  const raw = accountNumber != null ? String(accountNumber).trim() : "";
  if (raw === "") return null;

  for (const key of accountLookupKeys(raw)) {
    const arr = lookupMap.get(key);
    if (arr?.length) return arr[0];
  }
  return null;
}
