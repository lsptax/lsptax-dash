/**
 * Delete invoice rows whose year is not in the keep list (default: 2025, 2026).
 *
 * Run from repo root with DATABASE_URL set (e.g. via .env):
 *
 *   npm run prune-invoices-by-year              # execute deletes + sync Invoice id sequence
 *   npm run prune-invoices-by-year:dry-run      # counts only, no writes
 *
 * Or directly:
 *
 *   node scripts/pruneInvoicesByYear.js
 *   node scripts/pruneInvoicesByYear.js --dry-run
 *   node scripts/pruneInvoicesByYear.js --keep=2025,2026
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

const DEFAULT_KEEP_YEARS = [2025, 2026];

function parseKeepYears(argv) {
  const keepArg = argv.find((a) => a.startsWith("--keep="));
  if (!keepArg) return DEFAULT_KEEP_YEARS;
  const years = keepArg
    .slice("--keep=".length)
    .split(",")
    .map((y) => parseInt(y.trim(), 10))
    .filter((y) => Number.isFinite(y));
  if (years.length === 0) {
    throw new Error("Invalid --keep= value. Example: --keep=2025,2026");
  }
  return years;
}

async function countByYear(whereExtra = {}) {
  const rows = await prisma.invoice.groupBy({
    by: ["year"],
    where: whereExtra,
    _count: { id: true },
    orderBy: { year: "asc" },
  });
  return rows.map((r) => ({ year: r.year, count: r._count.id }));
}

async function syncInvoiceIdSequence(tx) {
  await tx.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Invoice"', 'id'),
      COALESCE((SELECT MAX(id) FROM "Invoice"), 1),
      (SELECT MAX(id) FROM "Invoice") IS NOT NULL
    )
  `);
}

async function countWouldDelete(keepYears) {
  const [total, kept, byYearAll, byYearRemoved] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.count({ where: { year: { in: keepYears } } }),
    countByYear(),
    countByYear({ year: { notIn: keepYears } }),
  ]);
  return {
    keepYears,
    totalInvoices: total,
    wouldKeep: kept,
    wouldDelete: total - kept,
    breakdownAllYears: byYearAll,
    breakdownDeletedYears: byYearRemoved,
  };
}

async function pruneInvoices(keepYears) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.invoice.deleteMany({
      where: { year: { notIn: keepYears } },
    });
    await syncInvoiceIdSequence(tx);
    const remaining = await tx.invoice.count();
    return {
      deleted: result.count,
      remaining,
      keepYears,
      idSequenceSyncedToMaxId: true,
    };
  });
}

const isDryRun =
  process.argv.includes("--dry-run") || process.argv.includes("-n");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const keepYears = parseKeepYears(process.argv);

  if (isDryRun) {
    const report = await countWouldDelete(keepYears);
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          message:
            "No data was changed. Run without --dry-run to delete invoices outside keepYears.",
          ...report,
        },
        null,
        2,
      ),
    );
    return;
  }

  const before = await countWouldDelete(keepYears);
  const result = await pruneInvoices(keepYears);
  const after = await countWouldDelete(keepYears);

  console.log(
    JSON.stringify(
      {
        ok: true,
        before,
        deleted: result,
        after: {
          totalInvoices: after.totalInvoices,
          breakdownAllYears: after.breakdownAllYears,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
