/**
 * Backfill Property.accountNumber (and linked Invoice.accountNumber) to match CSV
 * when the only difference is leading zeros (Excel often drops them on import).
 *
 * Usage (from repo root, DATABASE_URL required):
 *   node scripts/backfillAccountNumberLeadingZeroFromCsv.js
 *   node scripts/backfillAccountNumberLeadingZeroFromCsv.js ./csv/final/Final\ Sheet\ 20\ May\ \ -\ Sheet6\ \(1\).csv
 *   node scripts/backfillAccountNumberLeadingZeroFromCsv.js --dry-run
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";
import {
  normalizeRow,
  getClientNumberFromRow,
  getPropertyDataFromRow,
} from "../src/config/csvColumnMapping.js";
import {
  accountNumbersDifferOnlyByLeadingZeros,
  normalizeAccountNumber,
} from "../src/utils/accountNumberNormalize.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  let dryRun = false;
  const positional = [];
  for (const a of args) {
    if (a === "--dry-run" || a === "-n") dryRun = true;
    else positional.push(a);
  }
  const csvPath =
    positional[0] ||
    path.join(process.cwd(), "csv", "final", "Final Sheet 20 May  - Sheet6 (1).csv");
  return { csvPath: path.resolve(csvPath), dryRun };
}

function normalizedClientAccountKey(clientNumber, accountNumber) {
  const cn = String(clientNumber ?? "").trim();
  const acct = normalizeAccountNumber(accountNumber);
  return acct ? `${cn}|${acct}` : "";
}

function buildCsvAccountIndex(records) {
  /** @type {Map<string, string>} normalizedKey -> CSV account string */
  const byNormalizedKey = new Map();

  for (const row of records) {
    const r = normalizeRow(row);
    const clientNumber = getClientNumberFromRow(r);
    if (!clientNumber) continue;

    const propertyRow = getPropertyDataFromRow(r, clientNumber);
    const csvAccount = propertyRow.accountNumber?.trim();
    if (!csvAccount) continue;

    const key = normalizedClientAccountKey(clientNumber, csvAccount);
    if (!key) continue;

    const existing = byNormalizedKey.get(key);
    if (existing && existing !== csvAccount) {
      throw new Error(
        `CSV has conflicting account formats for ${key}: ${JSON.stringify(existing)} vs ${JSON.stringify(csvAccount)}`
      );
    }
    byNormalizedKey.set(key, csvAccount);
  }

  return byNormalizedKey;
}

async function main() {
  const { csvPath, dryRun } = parseArgs(process.argv);
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const records = parse(fs.readFileSync(csvPath), {
    columns: true,
    trim: true,
    relax_column_count: true,
  });
  const csvByNormalizedKey = buildCsvAccountIndex(records);

  console.log(`CSV: ${csvPath}`);
  console.log(`CSV rows: ${records.length}`);
  console.log(`CSV account index entries: ${csvByNormalizedKey.size}`);
  console.log(dryRun ? "Mode: dry-run (no writes)" : "Mode: apply updates");
  console.log("");

  const properties = await prisma.property.findMany({
    where: { client: { type: "CLIENT" } },
    select: {
      id: true,
      accountNumber: true,
      clientNumber: true,
      client: { select: { clientName: true } },
    },
  });

  const stats = {
    propertiesScanned: properties.length,
    propertiesAlreadyMatchCsv: 0,
    propertiesNoCsvMatch: 0,
    propertiesNonNumericSkipped: 0,
    propertiesUpdated: 0,
    invoicesUpdated: 0,
    oneLeadingZero: 0,
    twoLeadingZeros: 0,
  };

  /** @type {{ id: number, oldAccount: string, newAccount: string, clientNumber: string, clientName: string }[]} */
  const updates = [];

  for (const prop of properties) {
    const dbAccount = String(prop.accountNumber ?? "").trim();
    if (!dbAccount) {
      stats.propertiesNoCsvMatch += 1;
      continue;
    }

    const key = normalizedClientAccountKey(prop.clientNumber, dbAccount);
    const csvAccount = csvByNormalizedKey.get(key);
    if (!csvAccount) {
      stats.propertiesNoCsvMatch += 1;
      continue;
    }

    if (dbAccount === csvAccount) {
      stats.propertiesAlreadyMatchCsv += 1;
      continue;
    }

    if (!accountNumbersDifferOnlyByLeadingZeros(dbAccount, csvAccount)) {
      stats.propertiesNonNumericSkipped += 1;
      continue;
    }

    const leadingZeroCount = csvAccount.length - dbAccount.length;
    if (leadingZeroCount === 1) stats.oneLeadingZero += 1;
    else if (leadingZeroCount === 2) stats.twoLeadingZeros += 1;

    updates.push({
      id: prop.id,
      oldAccount: dbAccount,
      newAccount: csvAccount,
      clientNumber: String(prop.clientNumber ?? "").trim(),
      clientName: prop.client.clientName ?? "",
    });
    stats.propertiesUpdated += 1;
  }

  console.log("Planned property account updates");
  console.log("--------------------------------");
  console.log(`Total: ${updates.length}`);
  console.log("");
  console.log("Sample (up to 15):");
  for (const u of updates.slice(0, 15)) {
    console.log(
      `  id=${u.id}  client=${u.clientNumber}  ${u.oldAccount} -> ${u.newAccount}  (${u.clientName})`
    );
  }
  if (updates.length > 15) console.log(`  ... and ${updates.length - 15} more`);
  console.log("");
  console.log("Stats");
  console.log("-----");
  console.log(JSON.stringify(stats, null, 2));

  if (dryRun) {
    const invoiceCount = updates.length
      ? await prisma.invoice.count({
          where: {
            propertyId: { in: updates.map((u) => u.id) },
          },
        })
      : 0;
    console.log("");
    console.log(`Invoices linked to affected properties: ${invoiceCount} (would be synced on apply)`);
    console.log("Dry-run complete. Re-run without --dry-run to apply.");
    return;
  }

  const BATCH = 25;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ id, oldAccount, newAccount }) => {
        await prisma.property.update({
          where: { id },
          data: { accountNumber: newAccount },
        });
        const invoiceResult = await prisma.invoice.updateMany({
          where: { propertyId: id, accountNumber: oldAccount },
          data: { accountNumber: newAccount },
        });
        stats.invoicesUpdated += invoiceResult.count;
      })
    );
  }

  console.log("");
  console.log(`Backfill complete. Invoices updated: ${stats.invoicesUpdated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
