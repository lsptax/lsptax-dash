import prisma from "../../prisma/prismaClient.js";
import {
  DERIVED_INVOICE_FIELDS,
  derivedInvoicePatch,
  normalizeContingencyPercent,
  INVOICE_DATE_STRING_FIELDS,
  normalizeInvoiceDateString,
  todayInvoiceDateString,
} from "./invoiceYearlyData.js";

/** Fields safe to set on bulk generate without wiping user-entered invoice data. */
const GENERATE_METADATA_FIELDS = new Set([
  "invoiceDate",
  "dueDate",
  "generatedDate",
  "protestDate",
  "hearingDate",
  "bppRendered",
  "bppInvoice",
  "bppPaid",
  "paidDate",
  "isPaid",
  "paymentNotes",
  "underLitigation",
  "underArbitration",
]);

function pickGenerateDefaults(invoiceDefaults) {
  if (!invoiceDefaults || typeof invoiceDefaults !== "object") return {};
  const picked = Object.fromEntries(
    Object.entries(invoiceDefaults)
      .filter(([k]) => GENERATE_METADATA_FIELDS.has(k))
      .map(([k, v]) => [
        k,
        INVOICE_DATE_STRING_FIELDS.has(k) ? normalizeInvoiceDateString(v) : v,
      ])
  );

  // Keep bulk-send paymentStatus (isPaid) in sync with generate metadata.
  if (Object.prototype.hasOwnProperty.call(picked, "isPaid")) {
    picked.isPaid = picked.isPaid === true || String(picked.isPaid).toLowerCase() === "true";
    if (!picked.isPaid) picked.paidDate = "";
    else if (!String(picked.paidDate || "").trim()) {
      picked.paidDate = todayInvoiceDateString();
    }
  } else if (Object.prototype.hasOwnProperty.call(picked, "paidDate")) {
    picked.isPaid = Boolean(String(picked.paidDate || "").trim());
  }

  return picked;
}

function hasStoredDerivedValue(value) {
  if (value == null) return false;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0;
}

function getStoredDerivedFields(existingInvoice) {
  return new Set(
    [...DERIVED_INVOICE_FIELDS].filter((field) =>
      hasStoredDerivedValue(existingInvoice?.[field])
    )
  );
}

/**
 * Generate invoices for selected clients and properties (by clientId).
 * Preserves existing financial fields on update; new rows start at zero.
 */
export async function generateInvoices(options) {
  const {
    clientIds,
    propertyAccountNumbers = null,
    years = [new Date().getFullYear()],
    invoiceDefaults = {},
  } = options;

  try {
    if (!clientIds || clientIds.length === 0) {
      throw new Error("At least one client ID is required");
    }
    if (!years || years.length === 0) {
      throw new Error("At least one year is required");
    }

    let properties;
    if (propertyAccountNumbers && propertyAccountNumbers.length > 0) {
      properties = await prisma.property.findMany({
        where: {
          accountNumber: { in: propertyAccountNumbers },
          clientId: { in: clientIds },
          isArchived: false,
        },
        include: { client: { select: { contingencyFee: true } } },
      });
    } else {
      properties = await prisma.property.findMany({
        where: {
          clientId: { in: clientIds },
          isArchived: false,
        },
        include: { client: { select: { contingencyFee: true } } },
      });
    }

    const existingInvoices = await prisma.invoice.findMany({
      where: {
        propertyId: { in: properties.map((p) => p.id) },
        year: { in: years },
      },
    });

    const existingByKey = new Map(
      existingInvoices.map((inv) => [`${inv.propertyId}-${inv.year}`, inv])
    );

    const metadataDefaults = pickGenerateDefaults(invoiceDefaults);
    const today = todayInvoiceDateString();

    const invoiceData = [];
    const updateData = [];
    const createdInvoices = [];
    const updatedInvoices = [];

    for (const property of properties) {
      const clientPct = normalizeContingencyPercent(
        null,
        property.client?.contingencyFee != null
          ? Number(property.client.contingencyFee)
          : 25
      );

      for (const year of years) {
        const invoiceKey = `${property.id}-${year}`;
        const existing = existingByKey.get(invoiceKey);

        if (existing) {
          const merged = {
            ...existing,
            ...metadataDefaults,
            invoiceDate: metadataDefaults.invoiceDate ?? today,
          };
          const derived = derivedInvoicePatch(merged, clientPct, {
            preserveDerivedFields: getStoredDerivedFields(existing),
          });

          updateData.push({
            id: existing.id,
            data: {
              ...metadataDefaults,
              invoiceDate: metadataDefaults.invoiceDate ?? today,
              ...derived,
            },
          });
          updatedInvoices.push({
            accountNumber: property.accountNumber,
            clientNumber: property.clientNumber,
            year,
            reason: "Updated invoice metadata and recalculated amounts from stored values",
          });
        } else {
          const shell = {
            propertyId: property.id,
            accountNumber: property.accountNumber,
            clientNumber: property.clientNumber,
            year,
            invoiceDate: metadataDefaults.invoiceDate ?? today,
            contingencyFee: clientPct,
            ...metadataDefaults,
          };
          invoiceData.push(shell);
          createdInvoices.push({
            accountNumber: property.accountNumber,
            clientNumber: property.clientNumber,
            year,
            reason: "Created new invoice",
          });
        }
      }
    }

    if (invoiceData.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < invoiceData.length; i += batchSize) {
        const batch = invoiceData.slice(i, i + batchSize);
        await prisma.invoice.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }
    }

    if (updateData.length > 0) {
      for (const updateItem of updateData) {
        await prisma.invoice.update({
          where: { id: updateItem.id },
          data: updateItem.data,
        });
      }
    }

    return {
      success: true,
      createdInvoices: invoiceData.length,
      updatedInvoices: updateData.length,
      totalProperties: properties.length,
      totalYears: years.length,
      details: {
        created: createdInvoices,
        updated: updatedInvoices,
      },
    };
  } catch (error) {
    console.error("Error generating invoices:", error);
    throw error;
  }
}

/**
 * Get existing invoices for properties
 * @param {string[]} propertyAccountNumbers - Array of property account numbers
 * @param {number[]} years - Array of years to check (optional)
 * @returns {Promise<Array>} - Array of existing invoices
 */
export async function getExistingInvoices(propertyAccountNumbers, years = null) {
  try {
    const whereClause = {
      accountNumber: {
        in: propertyAccountNumbers,
      },
    };

    if (years && years.length > 0) {
      whereClause.year = {
        in: years,
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: [{ propertyId: "asc" }, { year: "desc" }],
    });

    return invoices;
  } catch (error) {
    console.error("Error getting existing invoices:", error);
    throw error;
  }
}
