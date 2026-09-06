/**
 * Backfill nameOnCad on Client and Property from a client+property CSV export.
 * Matches rows to DB properties via clientNumber + accountNumber (same key as import).
 *
 * Usage (from repo root, DATABASE_URL required):
 *   node scripts/backfillCadNameFromCsv.js
 *   node scripts/backfillCadNameFromCsv.js ./csv/final/Final\ Sheet\ 20\ May\ \ -\ Sheet6\ \(1\).csv
 *   node scripts/backfillCadNameFromCsv.js ./csv/your-file.csv --dry-run
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
  getClientDataFromRow,
} from "../src/config/csvColumnMapping.js";
import { propertyImportIdentityKey } from "../src/utils/propertyImportKey.js";

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

function buildCsvIndex(records) {
  /** @type {Map<string, { cadName: string, clientName?: string }>} */
  const byImportKey = new Map();
  /** @type {Map<string, string>} */
  const cadNameByClientNumber = new Map();

  for (const row of records) {
    const r = normalizeRow(row);
    const clientNumber = getClientNumberFromRow(r);
    if (!clientNumber) continue;

    const propertyRow = getPropertyDataFromRow(r, clientNumber);
    const clientRow = getClientDataFromRow(r);
    const cadName = propertyRow.nameOnCad || clientRow.nameOnCad;
    if (!cadName) continue;

    if (!cadNameByClientNumber.has(clientNumber)) {
      cadNameByClientNumber.set(clientNumber, cadName);
    }

    const importKey = propertyImportIdentityKey(clientNumber, propertyRow);
    if (!propertyRow.accountNumber) continue;
    byImportKey.set(importKey, {
      cadName,
      clientName: clientRow.clientName,
    });
  }

  return { byImportKey, cadNameByClientNumber };
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
  const { byImportKey, cadNameByClientNumber } = buildCsvIndex(records);

  console.log(`CSV: ${csvPath}`);
  console.log(`Rows: ${records.length}`);
  console.log(`CSV rows with CAD name + account: ${byImportKey.size}`);
  console.log(`Unique client numbers with CAD name: ${cadNameByClientNumber.size}`);
  console.log(dryRun ? "Mode: dry-run (no writes)" : "Mode: apply updates");
  console.log("");

  const properties = await prisma.property.findMany({
    where: { client: { type: "CLIENT" } },
    select: {
      id: true,
      accountNumber: true,
      clientNumber: true,
      nameOnCad: true,
      clientId: true,
    },
  });

  const clients = await prisma.client.findMany({
    where: { type: "CLIENT" },
    select: {
      id: true,
      clientNumber: true,
      nameOnCad: true,
    },
  });

  const clientByNumber = new Map(
    clients.filter((c) => c.clientNumber).map((c) => [String(c.clientNumber).trim(), c])
  );

  const stats = {
    propertiesMatched: 0,
    propertiesUpdated: 0,
    propertiesAlreadySet: 0,
    propertiesNoCsvMatch: 0,
    clientsUpdated: 0,
    clientsAlreadySet: 0,
    clientsNoCsvMatch: 0,
  };

  const propertyUpdates = [];

  for (const prop of properties) {
    const importKey = propertyImportIdentityKey(prop.clientNumber, prop);
    const csvRow = byImportKey.get(importKey);
    if (!csvRow) {
      stats.propertiesNoCsvMatch += 1;
      continue;
    }
    stats.propertiesMatched += 1;

    const current = prop.nameOnCad?.trim() ?? "";
    if (current !== "" && current === csvRow.cadName) {
      stats.propertiesAlreadySet += 1;
      continue;
    }
    if (current !== "" && current !== csvRow.cadName) {
      // Keep existing non-empty value; log mismatch for review
      continue;
    }

    propertyUpdates.push({ id: prop.id, nameOnCad: csvRow.cadName });
    stats.propertiesUpdated += 1;
  }

  const clientUpdates = [];
  for (const client of clients) {
    const cn = client.clientNumber?.trim();
    if (!cn) {
      stats.clientsNoCsvMatch += 1;
      continue;
    }
    const cadName = cadNameByClientNumber.get(cn);
    if (!cadName) {
      stats.clientsNoCsvMatch += 1;
      continue;
    }

    const current = client.nameOnCad?.trim() ?? "";
    if (current !== "" && current === cadName) {
      stats.clientsAlreadySet += 1;
      continue;
    }
    if (current !== "" && current !== cadName) continue;

    clientUpdates.push({ id: client.id, nameOnCad: cadName });
    stats.clientsUpdated += 1;
  }

  console.log("Planned updates");
  console.log("---------------");
  console.log(`Properties to update: ${propertyUpdates.length}`);
  console.log(`Clients to update: ${clientUpdates.length}`);
  console.log("");
  console.log("Stats");
  console.log("-----");
  console.log(JSON.stringify(stats, null, 2));

  if (dryRun) {
    console.log("");
    console.log("Dry-run complete. Re-run without --dry-run to apply.");
    return;
  }

  const BATCH = 50;
  for (let i = 0; i < propertyUpdates.length; i += BATCH) {
    const batch = propertyUpdates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(({ id, nameOnCad }) =>
        prisma.property.update({ where: { id }, data: { nameOnCad } })
      )
    );
  }

  for (let i = 0; i < clientUpdates.length; i += BATCH) {
    const batch = clientUpdates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(({ id, nameOnCad }) =>
        prisma.client.update({ where: { id }, data: { nameOnCad } })
      )
    );
  }

  console.log("");
  console.log("Backfill complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
