import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function revertClientIds() {
  // First, create a temporary sequence
  await prisma.$executeRaw`
    CREATE SEQUENCE temp_client_id_seq START 1
  `;

  // Update all client IDs with new sequential values
  await prisma.$executeRaw`
    UPDATE "Client" 
    SET id = nextval('temp_client_id_seq')
  `;

  // Reset the original sequence
  await prisma.$executeRaw`
    SELECT setval('"Client_id_seq"', (SELECT MAX(id) FROM "Client"))
  `;

  // Clean up by dropping temporary sequence
  await prisma.$executeRaw`
    DROP SEQUENCE temp_client_id_seq
  `;
}

async function main() {
  console.log("Starting ID restoration...");
  await revertClientIds();
  console.log("Client IDs successfully restored to auto-increment sequence!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
