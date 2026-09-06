/**
 * Nightly Brevo invoice email tracking sync.
 *
 * Pulls delivery/open/bounce status from Brevo for all invoice sends logged in
 * InvoiceDelivery and updates emailLastEvent + syncedAt.
 *
 * Usage (from repo root):
 *   node scripts/syncInvoiceDeliveryTracking.js
 *   node scripts/syncInvoiceDeliveryTracking.js --only-stale
 *
 * Cron — midnight Texas time (America/Chicago, handles CST/CDT):
 *
 *   # Edit crontab: crontab -e
 *   TZ=America/Chicago
 *   0 0 * * * cd /path/to/new-backend && /usr/local/bin/node scripts/syncInvoiceDeliveryTracking.js >> /var/log/lsptax-invoice-sync.log 2>&1
 *
 * Fly.io (SSH into machine or use a scheduled Machine):
 *   TZ=America/Chicago 0 0 * * * cd /app && node scripts/syncInvoiceDeliveryTracking.js >> /tmp/invoice-sync.log 2>&1
 *
 * Requires: DATABASE_URL, BREVO_API_KEY (same as the API server).
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";
import { syncDeliveriesFromBrevo } from "../src/services/invoiceDeliveryService.js";
import { BUSINESS_TZ } from "../src/utils/weekRange.js";

const LOG_PREFIX = "[invoice-delivery-sync]";
const BATCH_SIZE = 100;

function parseArgs(argv) {
  let onlyStale = false;
  for (const arg of argv.slice(2)) {
    if (arg === "--only-stale") onlyStale = true;
  }
  return { onlyStale };
}

async function main() {
  const { onlyStale } = parseArgs(process.argv);
  const startedAt = Date.now();
  const tzNow = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date());

  console.log(`${LOG_PREFIX} starting at ${tzNow} (${BUSINESS_TZ}) onlyStale=${onlyStale}`);

  if (!process.env.BREVO_API_KEY?.trim()) {
    throw new Error("BREVO_API_KEY is not configured");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not configured");
  }

  let offset = 0;
  let totalSynced = 0;
  let totalFailed = 0;
  let totalEligible = 0;
  const allErrors = [];

  while (true) {
    const batch = await syncDeliveriesFromBrevo({
      limit: BATCH_SIZE,
      offset,
      onlyStale,
    });

    totalEligible = batch.totalEligible;
    totalSynced += batch.synced;
    totalFailed += batch.failed;
    allErrors.push(...batch.errors);

    if (!batch.hasMore) break;
    offset = batch.nextOffset;
  }

  const durationMs = Date.now() - startedAt;
  const durationMin = (durationMs / 60000).toFixed(1);

  console.log(
    `${LOG_PREFIX} complete — ${totalSynced}/${totalEligible} synced, ${totalFailed} failed, ${durationMin}m (${durationMs}ms)`
  );

  if (allErrors.length > 0) {
    console.error(
      `${LOG_PREFIX} errors (${allErrors.length} total, showing first 20):`,
      JSON.stringify(allErrors.slice(0, 20), null, 2)
    );
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(`${LOG_PREFIX} fatal:`, err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
