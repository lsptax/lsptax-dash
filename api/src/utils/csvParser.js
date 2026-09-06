import fs from "fs";
import { parse } from "csv-parse";
import prisma from "../../prisma/prismaClient.js";
import pLimit from "p-limit";
import {
  normalizeRow,
  getClientNumberFromRow,
  getClientDataFromRow,
  getPropertyDataFromRow,
  getPropertyUpdateDataFromCsv,
} from "../config/csvColumnMapping.js";
import { propertyImportIdentityKey } from "./propertyImportKey.js";

const limit = pLimit(10); // controls concurrency

export async function importCSV(filePath) {
  try {
    const records = [];
    const parser = fs
      .createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }));

    for await (const record of parser) {
      records.push(record);
    }

    const clientsMap = new Map();

    for (const row of records) {
      const r = normalizeRow(row);
      const clientNumber = getClientNumberFromRow(r);
      if (!clientNumber) continue;

      if (!clientsMap.has(clientNumber)) {
        clientsMap.set(clientNumber, {
          ...getClientDataFromRow(r),
          clientNumber,
          properties: [],
        });
      } else {
        const rowClient = getClientDataFromRow(r);
        const entry = clientsMap.get(clientNumber);
        if (entry.flatFee == null && rowClient.flatFee != null) {
          entry.flatFee = rowClient.flatFee;
        }
        if (entry.contingencyFee == null && rowClient.contingencyFee != null) {
          entry.contingencyFee = rowClient.contingencyFee;
        }
      }

      clientsMap.get(clientNumber).properties.push(
        getPropertyDataFromRow(r, clientNumber)
      );
    }

    // ✅ Preload existing clients (id + clientNumber) and property account numbers
    const existingClients = await prisma.client.findMany({
      where: { type: "CLIENT" },
      select: { id: true, clientNumber: true },
    });
    const existingClientNumbers = new Set(
      existingClients.map((c) => c.clientNumber)
    );
    const existingClientById = new Map(
      existingClients.map((c) => [c.clientNumber, c])
    );

    const existingProperties = await prisma.property.findMany({
      select: {
        id: true,
        accountNumber: true,
        clientNumber: true,
      },
    });
    const existingImportKeys = new Set(
      existingProperties.map((p) => propertyImportIdentityKey(p.clientNumber, p))
    );
    const existingPropertyByImportKey = new Map(
      existingProperties.map((p) => [
        propertyImportIdentityKey(p.clientNumber, p),
        p,
      ])
    );

    const tasks = [];
    const stats = {
      clientsCreated: 0,
      clientsSkipped: 0,
      propertiesCreated: 0,
      propertiesUpdated: 0,
    };

    for (const clientData of clientsMap.values()) {
      const { properties, ...clientInfo } = clientData;

      tasks.push(
        limit(async () => {
          const alreadyExists = existingClientNumbers.has(
            clientInfo.clientNumber
          );

          let client;
          if (!alreadyExists) {
            client = await prisma.client.create({ data: clientInfo });
            stats.clientsCreated++;
          } else {
            client = existingClientById.get(clientInfo.clientNumber);
            // Update existing client's contingencyFee when CSV provides it
            if (client && clientInfo.contingencyFee != null) {
              await prisma.client.update({
                where: { id: client.id },
                data: { contingencyFee: clientInfo.contingencyFee },
              });
              client.contingencyFee = clientInfo.contingencyFee;
            }
            if (client && clientInfo.flatFee != null) {
              await prisma.client.update({
                where: { id: client.id },
                data: { flatFee: clientInfo.flatFee },
              });
              client.flatFee = clientInfo.flatFee;
            }
            stats.clientsSkipped++;
          }

          const newProperties = [];
          const propertyUpdatesById = new Map();

          for (const p of properties) {
            const importKey = propertyImportIdentityKey(
              client.clientNumber,
              p
            );
            if (!existingImportKeys.has(importKey)) {
              newProperties.push(p);
              continue;
            }
            const existing = existingPropertyByImportKey.get(importKey);
            const updateData = getPropertyUpdateDataFromCsv(p);
            if (existing && Object.keys(updateData).length > 0) {
              propertyUpdatesById.set(existing.id, updateData);
            }
          }

          if (newProperties.length > 0 && client) {
            const propertyData = newProperties.map((p) => ({
              ...p,
              clientId: client.id,
              clientNumber: client.clientNumber,
            }));

            await prisma.property.createMany({
              data: propertyData,
            });
            stats.propertiesCreated += propertyData.length;
          }

          for (const [id, data] of propertyUpdatesById) {
            await prisma.property.update({ where: { id }, data });
            stats.propertiesUpdated += 1;
          }
        })
      );
    }

    await Promise.all(tasks);
    return stats;
  } catch (error) {
    console.error("CSV import error:", error);
    throw error;
  }
}
