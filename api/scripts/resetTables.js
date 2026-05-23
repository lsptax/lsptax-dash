import 'dotenv/config';
import { PrismaClient, ClientType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/** Deletes only apply to converted customers — never PROSPECT clients or their properties. */
const CLIENT_ONLY = { type: ClientType.CLIENT };

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
            `Refusing to complete: prospect Client or Property counts changed (${JSON.stringify(before)} -> ${JSON.stringify(after)}).`,
        );
    }
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Check your .env file.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getSerialSequenceName(tableIdent) {
    const rows = await prisma.$queryRaw`
        SELECT pg_get_serial_sequence(${tableIdent}, 'id') AS seq
    `;
    return rows?.[0]?.seq ?? null;
}

async function resetIdSequence({ modelName, tableIdents, maxId }) {
    for (const tableIdent of tableIdents) {
        const seq = await getSerialSequenceName(tableIdent);
        if (!seq) continue;
        // Empty table: maxId 0 — setval(..., 0, true) is invalid for serial sequences.
        const seqValue = maxId > 0 ? maxId : 1;
        const isCalled = maxId > 0;
        await prisma.$executeRaw`SELECT setval(${seq}::regclass, ${seqValue}, ${isCalled})`;
        console.log(`✓ ${modelName} sequence reset (${seq})`);
        return true;
    }
    console.log(`⚠️ ${modelName} sequence not found (skipped)`);
    return false;
}

async function resetTables() {
    try {
        console.log('Starting table reset...');
        const sequenceResults = { Client: false, Property: false, Invoice: false };

        // "Prospects" are Client rows where type = PROSPECT.
        // Only delete real clients (type = CLIENT) and their related data — never prospect rows.
        let deletedInvoices;
        let deletedProperties;
        let deletedClients;

        await prisma.$transaction(async (tx) => {
            const beforeProspects = await prospectDataSnapshot(tx);

            console.log('Deleting Invoice data for CLIENTs...');
            deletedInvoices = await tx.invoice.deleteMany({
                where: { property: { client: CLIENT_ONLY } },
            });
            console.log(`✓ Invoice data deleted (${deletedInvoices.count})`);

            console.log('Deleting Property data for CLIENTs...');
            deletedProperties = await tx.property.deleteMany({
                where: { client: CLIENT_ONLY },
            });
            console.log(`✓ Property data deleted (${deletedProperties.count})`);

            console.log('Deleting Client data (type=CLIENT only)...');
            deletedClients = await tx.client.deleteMany({
                where: CLIENT_ONLY,
            });
            console.log(`✓ Client data deleted (${deletedClients.count})`);

            assertProspectDataUnchanged(beforeProspects, await prospectDataSnapshot(tx));
        });

        // Reset auto-increment sequences for PostgreSQL
        console.log('Resetting auto-increment sequences...');
        try {
            // Preserve prospects, so don't RESTART WITH 1 (could collide).
            // Set each sequence to MAX(id) so nextval() becomes MAX(id)+1.
            const [clientAgg, propertyAgg, invoiceAgg] = await Promise.all([
                prisma.client.aggregate({ _max: { id: true } }),
                prisma.property.aggregate({ _max: { id: true } }),
                prisma.invoice.aggregate({ _max: { id: true } }),
            ]);

            const clientMax = clientAgg._max.id ?? 0;
            const propertyMax = propertyAgg._max.id ?? 0;
            const invoiceMax = invoiceAgg._max.id ?? 0;

            // Try both Prisma-default quoted table names and lowercase variants.
            sequenceResults.Client = await resetIdSequence({
                modelName: 'Client',
                tableIdents: ['"Client"', 'client'],
                maxId: clientMax,
            });
            sequenceResults.Property = await resetIdSequence({
                modelName: 'Property',
                tableIdents: ['"Property"', 'property'],
                maxId: propertyMax,
            });
            sequenceResults.Invoice = await resetIdSequence({
                modelName: 'Invoice',
                tableIdents: ['"Invoice"', 'invoice'],
                maxId: invoiceMax,
            });
        } catch (seqError) {
            console.log('⚠️ Could not reset sequences automatically. You may need to reset them manually.');
            console.log(String(seqError?.message ?? seqError));
        }

        console.log('\n✅ Table reset completed successfully!');
        console.log('📊 Summary:');
        console.log('   - Client data (type=CLIENT): Deleted');
        console.log('   - Property data (for CLIENTs): Deleted');
        console.log('   - Invoice data (for CLIENTs): Deleted');
        console.log('   - Prospect data: Preserved');
        const sequencesReset = Object.values(sequenceResults).some(Boolean);
        console.log(`   - Auto-increment indexes: ${sequencesReset ? 'Reset (some/all)' : 'Not reset'}`);

    } catch (error) {
        console.error('❌ Error during table reset:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

// Run the script if called directly
resetTables()
    .then(() => {
        console.log('Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });

export { resetTables }; 