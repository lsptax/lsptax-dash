import fs from "fs";
import path from "path";
import { writeToPath } from "fast-csv";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // Install this if not already installed: npm install node-fetch

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import prisma from "../../prisma/prismaClient.js";

// Function to upload CSV to Supabase using fetch
async function uploadToSupabase(bucketName, filePath, tableName) {
  const fileStream = fs.createReadStream(filePath);
  const fileName = `${tableName}/${path.basename(filePath)}`;

  const response = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      body: fileStream,
      duplex: "half", // Explicitly set the duplex option
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to upload ${fileName}:`, errorText);
    throw new Error(`Failed to upload ${fileName}: ${response.statusText}`);
  }

}

// Function to fetch data and save as CSV
async function backupTable(tableName, dataFetcher) {
  const data = await dataFetcher();
  const filePath = path.join(__dirname, `${tableName}-${Date.now()}.csv`);

  // Write data to CSV
  await new Promise((resolve, reject) => {
    writeToPath(filePath, data, { headers: true })
      .on("finish", resolve)
      .on("error", reject);
  });

  // Upload CSV to Supabase
  await uploadToSupabase("backups", filePath, tableName);

  // Delete local file
  fs.unlinkSync(filePath);
}

// Backup all tables
async function backupAllTables() {
  try {
    await backupTable("Client", () => prisma.client.findMany());
    await backupTable("Prospect", () =>
      prisma.client.findMany({ where: { type: "PROSPECT" } })
    );
    await backupTable("Property", () => prisma.property.findMany());
    await backupTable("Invoice", () => prisma.invoice.findMany());
    await backupTable("User", () => prisma.user.findMany());
  } catch (error) {
    console.error("Error during backup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backup
backupAllTables();
