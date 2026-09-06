/**
 * Create missing Invoice rows for year 2026 (and optionally other years) for all properties.
 *
 *   node scripts/backfill2026Invoices.js
 *   node scripts/backfill2026Invoices.js --dry-run
 *   node scripts/backfill2026Invoices.js --years=2025,2026
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

function parseArgs(argv) {
  let dryRun = false;
  let years = [2026];
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run" || arg === "-n") dryRun = true;
    else if (arg.startsWith("--years=")) {
      years = arg
        .slice("--years=".length)
        .split(",")
        .map((y) => parseInt(y.trim(), 10))
        .filter((y) => Number.isFinite(y));
    }
  }
  return { dryRun, years };
}

async function main() {
  const { dryRun, years } = parseArgs(process.argv);
  if (!years.length) {
    console.error("No valid years. Example: --years=2025,2026");
    process.exit(1);
  }

  const properties = await prisma.property.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      accountNumber: true,
      clientNumber: true,
      client: { select: { contingencyFee: true } },
    },
  });

  let created = 0;
  for (const property of properties) {
    for (const year of years) {
      const existing = await prisma.invoice.findUnique({
        where: { propertyId_year: { propertyId: property.id, year } },
      });
      if (existing) continue;

      const contingencyFee =
        property.client?.contingencyFee != null
          ? Number(property.client.contingencyFee)
          : 25;

      if (!dryRun) {
        await prisma.invoice.create({
          data: {
            propertyId: property.id,
            accountNumber: property.accountNumber,
            clientNumber: property.clientNumber,
            year,
            contingencyFee,
          },
        });
      }
      created += 1;
    }
  }

  console.log(
    dryRun
      ? `[dry-run] Would create ${created} invoice row(s) for years: ${years.join(", ")}`
      : `Created ${created} invoice row(s) for years: ${years.join(", ")}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
