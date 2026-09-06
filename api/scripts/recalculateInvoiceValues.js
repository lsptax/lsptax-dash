/**
 * Recalculate invoice derived fields in the DB.
 * Reductions, tax savings, and invoice amount are always recomputed from stored inputs.
 *
 * Usage (from repo root):
 *   node scripts/recalculateInvoiceValues.js --dry-run
 *   node scripts/recalculateInvoiceValues.js
 *   node scripts/recalculateInvoiceValues.js --year=2026
 *   node scripts/recalculateInvoiceValues.js --propertyId=1761 --dry-run
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";
import { buildRecalculatedInvoicePatch } from "../src/utils/invoiceYearlyData.js";

function parseArgs(argv) {
  let dryRun = false;
  let year = null;
  let propertyId = null;
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run" || arg === "-n") dryRun = true;
    else if (arg.startsWith("--year=")) {
      year = parseInt(arg.slice("--year=".length), 10);
    } else if (arg.startsWith("--propertyId=")) {
      propertyId = parseInt(arg.slice("--propertyId=".length), 10);
    }
  }
  return { dryRun, year, propertyId };
}

function num(v) {
  return Number(v ?? 0);
}

function patchChanged(before, patch) {
  return (
    num(before.marketReduction) !== num(patch.marketReduction) ||
    num(before.appraisedReduction) !== num(patch.appraisedReduction) ||
    num(before.taxableSavings) !== num(patch.taxableSavings) ||
    num(before.invoiceAmount) !== num(patch.invoiceAmount) ||
    num(before.noticeMarketValue) !== num(patch.noticeMarketValue) ||
    num(before.finalMarketValue) !== num(patch.finalMarketValue) ||
    num(before.contingencyFee) !== num(patch.contingencyFee)
  );
}

async function main() {
  const { dryRun, year, propertyId } = parseArgs(process.argv);

  const where = {};
  if (Number.isFinite(year)) where.year = year;
  if (Number.isFinite(propertyId)) where.propertyId = propertyId;

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      property: {
        select: {
          accountNumber: true,
          client: { select: { contingencyFee: true } },
        },
      },
    },
    orderBy: [{ propertyId: "asc" }, { year: "desc" }],
  });

  console.log(
    `${dryRun ? "[dry-run] " : ""}Recalculating ${invoices.length} invoice row(s)${
      year ? ` for year ${year}` : ""
    }${propertyId ? ` for propertyId ${propertyId}` : ""}...`
  );

  let updated = 0;
  let unchanged = 0;
  const samples = [];

  for (const invoice of invoices) {
    const clientPct =
      invoice.property?.client?.contingencyFee != null
        ? Number(invoice.property.contingencyFee)
        : 25;

    const patch = buildRecalculatedInvoicePatch(invoice, clientPct);
    if (!patchChanged(invoice, patch)) {
      unchanged++;
      continue;
    }

    if (samples.length < 10) {
      samples.push({
        id: invoice.id,
        propertyId: invoice.propertyId,
        accountNumber: invoice.accountNumber ?? invoice.property?.accountNumber,
        year: invoice.year,
        before: {
          marketReduction: num(invoice.marketReduction),
          appraisedReduction: num(invoice.appraisedReduction),
          taxableSavings: num(invoice.taxableSavings),
          invoiceAmount: num(invoice.invoiceAmount),
        },
        after: {
          marketReduction: patch.marketReduction,
          appraisedReduction: patch.appraisedReduction,
          taxableSavings: patch.taxableSavings,
          invoiceAmount: patch.invoiceAmount,
        },
      });
    }

    if (!dryRun) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: patch,
      });
    }
    updated++;
  }

  console.log(
    dryRun
      ? `[dry-run] Would update ${updated} row(s); ${unchanged} unchanged.`
      : `Updated ${updated} row(s); ${unchanged} unchanged.`
  );

  if (samples.length) {
    console.log("\nSample changes:");
    for (const s of samples) {
      console.log(JSON.stringify(s));
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
