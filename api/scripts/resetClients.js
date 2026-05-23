/**
 * Standalone destructive script: removes all CLIENT-type clients and their contracts,
 * properties, and invoices. Never touches Client.type = PROSPECT or Property rows
 * whose client is a prospect. Aborts the transaction if prospect row counts change.
 * Then syncs each id sequence to MAX(id) (or 1 if a table is empty).
 *
 * Run from repo root with DATABASE_URL set (e.g. via .env):
 *
 *   npm run reset-clients              # execute deletes + sequence sync
 *   npm run reset-clients:dry-run      # counts only, no writes
 *
 * Or directly:
 *
 *   node scripts/resetClients.js
 *   node scripts/resetClients.js --dry-run
 */
import { ClientType } from "@prisma/client";
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

/**
 * Every delete is scoped to converted customers only.
 * `NOT PROSPECT` is redundant with `type: CLIENT` for valid rows but makes the intent unmissable.
 */
const CLIENT_ONLY = {
  AND: [{ type: ClientType.CLIENT }, { NOT: { type: ClientType.PROSPECT } }],
};

async function prospectDataSnapshot(tx) {
  const [prospectClientCount, prospectPropertyCount] = await Promise.all([
    tx.client.count({ where: { type: ClientType.PROSPECT } }),
    tx.property.count({ where: { client: { type: ClientType.PROSPECT } } }),
  ]);
  return { prospectClientCount, prospectPropertyCount };
}

function assertProspectDataUnchanged(before, after) {
  if (
    before.prospectClientCount !== after.prospectClientCount ||
    before.prospectPropertyCount !== after.prospectPropertyCount
  ) {
    throw new Error(
      `Refusing to complete: prospect Client or Property counts changed (${JSON.stringify(before)} -> ${JSON.stringify(after)}).`
    );
  }
}

/**
 * Align PG sequences with current MAX(id) so the next insert never collides.
 * Empty tables: setval(..., 0, true) is invalid (PG rejects 0 for serial sequences);
 * use value 1 with is_called=false so the next nextval() returns 1.
 */
async function syncIdSequencesToMax(db) {
  const quotedTables = ['"Contract"', '"Invoice"', '"Property"', '"Client"'];
  for (const q of quotedTables) {
    await db.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('${q}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${q}), 1),
        (SELECT MAX(id) FROM ${q}) IS NOT NULL
      )
    `);
  }
}

/** Read-only: how many rows would be removed (CLIENT-only scope). */
async function countRowsThatWouldBeDeleted() {
  const [
    prospectSnapshot,
    contracts,
    invoices,
    properties,
    clients,
  ] = await Promise.all([
    prospectDataSnapshot(prisma),
    prisma.contract.count({ where: { client: CLIENT_ONLY } }),
    prisma.invoice.count({ where: { property: { client: CLIENT_ONLY } } }),
    prisma.property.count({ where: { client: CLIENT_ONLY } }),
    prisma.client.count({ where: CLIENT_ONLY }),
  ]);
  return {
    wouldDelete: { contracts, invoices, properties, clients },
    prospectsPreserved: prospectSnapshot,
  };
}

/** Large deletes on a remote DB can exceed Prisma's default 5s interactive transaction limit. */
const RESET_TX_OPTIONS = {
  timeout: 120_000,
  maxWait: 60_000,
};

async function resetClientRowsAndRelated() {
  const deleted = await prisma.$transaction(
    async (tx) => {
      const contracts = await tx.contract.deleteMany({
        where: { client: CLIENT_ONLY },
      });
      const invoices = await tx.invoice.deleteMany({
        where: { property: { client: CLIENT_ONLY } },
      });
      const properties = await tx.property.deleteMany({
        where: { client: CLIENT_ONLY },
      });
      const clients = await tx.client.deleteMany({
        where: CLIENT_ONLY,
      });

      return {
        deletedContracts: contracts.count,
        deletedInvoices: invoices.count,
        deletedProperties: properties.count,
        deletedClients: clients.count,
      };
    },
    RESET_TX_OPTIONS,
  );

  // Run after commit: keeps the transaction short and avoids timeout on setval + count round-trips.
  await syncIdSequencesToMax(prisma);

  return { ...deleted, idSequencesSyncedToMaxId: true };
}

const isDryRun =
  process.argv.includes("--dry-run") || process.argv.includes("-n");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  if (isDryRun) {
    const report = await countRowsThatWouldBeDeleted();
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          message:
            "No data was changed. Run without --dry-run to apply deletes and sync sequences.",
          ...report,
        },
        null,
        2,
      ),
    );
    return;
  }

  const baselineProspects = await prospectDataSnapshot(prisma);
  const counts = await resetClientRowsAndRelated();
  assertProspectDataUnchanged(baselineProspects, await prospectDataSnapshot(prisma));
  console.log(JSON.stringify({ ok: true, deleted: counts }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
