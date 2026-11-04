/**
 * Mark property account types from the type-change sheet.
 * Rows marked BPP are stored as BPP. Every other property is cleared, which the
 * app treats as Real. No new property-type enum value is required.
 *
 * Usage (from api/):
 *   node scripts/markPropertyAccountTypes.js --dry-run
 *   node scripts/markPropertyAccountTypes.js
 *   node scripts/markPropertyAccountTypes.js "/path/to/Type change - Sheet1.csv"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import "dotenv/config";
import { Prisma } from "@prisma/client";
import prisma from "../prisma/prismaClient.js";

const defaultCsv = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/type change data/Type change - Sheet1.csv"
);

function parseArgs(argv) {
  let dryRun = false;
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run" || arg === "-n") dryRun = true;
    else positional.push(arg);
  }
  return { csvPath: path.resolve(positional[0] || defaultCsv), dryRun };
}

function bppIdsFromCsv(csvPath) {
  const records = parse(fs.readFileSync(csvPath), {
    columns: true,
    trim: true,
    relax_column_count: true,
  });
  const ids = [];
  for (const row of records) {
    if (String(row.propertyType || "").trim().toUpperCase() !== "BPP") continue;
    const id = Number(String(row.id || "").trim());
    if (!Number.isInteger(id)) continue;
    ids.push(id);
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

async function dropRealEnumValue() {
  const existing = await prisma.$queryRaw`
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PropertyType' AND e.enumlabel = 'REAL'
  `;
  if (!existing.length) return false;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`ALTER TYPE "PropertyType" RENAME TO "PropertyType_old"`);
    await tx.$executeRawUnsafe(
      `CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'BPP', 'LAND')`
    );
    await tx.$executeRawUnsafe(`
      ALTER TABLE "Property"
      ALTER COLUMN "propertyType" TYPE "PropertyType"
      USING (
        CASE
          WHEN "propertyType"::text = 'REAL' THEN NULL
          ELSE "propertyType"::text::"PropertyType"
        END
      )
    `);
    await tx.$executeRawUnsafe(`DROP TYPE "PropertyType_old"`);
  });
  return true;
}

async function main() {
  const { csvPath, dryRun } = parseArgs(process.argv);
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const bppIds = bppIdsFromCsv(csvPath);
  if (!bppIds.length) {
    console.error("No BPP property ids found in the sheet.");
    process.exit(1);
  }

  const [counts] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE id IN (${Prisma.join(bppIds)}))::int AS matched,
      COUNT(*) FILTER (WHERE id NOT IN (${Prisma.join(bppIds)}))::int AS rest
    FROM "Property"
  `;

  console.log(
    `${dryRun ? "Dry run" : "Updating"}: ${bppIds.length} BPP ids in the sheet, ${counts.matched} matched, ${counts.rest} other properties marked Real.`
  );
  if (counts.matched !== bppIds.length) {
    console.log(`${bppIds.length - counts.matched} sheet ids are not in the database and will be skipped.`);
  }
  if (dryRun) return;

  await prisma.$executeRaw`
    UPDATE "Property"
    SET "propertyType" = 'BPP'
    WHERE id IN (${Prisma.join(bppIds)})
  `;
  await prisma.$executeRaw`
    UPDATE "Property"
    SET "propertyType" = NULL
    WHERE id NOT IN (${Prisma.join(bppIds)})
  `;

  const removedReal = await dropRealEnumValue();
  if (removedReal) console.log("Removed the unused REAL property type.");

  await prisma.$executeRaw`
    DELETE FROM "_prisma_migrations"
    WHERE migration_name IN (
      '20261104120000_property_type_real',
      '20261104120100_mark_properties_real_or_bpp'
    )
  `;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
