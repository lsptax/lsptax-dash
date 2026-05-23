import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function updateClientIds() {
  const clients = await prisma.client.findMany({
    where: {
      CLIENTNumber: {
        not: null
      }
    }
  })
  
  for (const client of clients) {
    const numericId = parseInt(client.CLIENTNumber)
    
    await prisma.$executeRaw`
      UPDATE "Client" 
      SET id = ${numericId} 
      WHERE id = ${client.id}
    `
  }

  // Reset the auto-increment sequence
  await prisma.$executeRaw`
    SELECT setval('"Client_id_seq"', (SELECT MAX(id) FROM "Client"))
  `
}

async function main() {
  console.log('Starting ID update...')
  await updateClientIds()
  console.log('Client IDs updated successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
