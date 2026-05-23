import prisma from "../../prisma/prismaClient.js";

/**
 * Generate invoices for selected clients and properties (by clientId).
 * @param {Object} options - Generation options
 * @param {number[]} options.clientIds - Array of client IDs to generate invoices for
 * @param {string[]} options.propertyAccountNumbers - Optional filter by account numbers
 * @param {number[]} options.years - Years to generate for
 * @param {Object} options.invoiceDefaults - Default values for invoice fields
 */
export async function generateInvoices(options) {
  const {
    clientIds,
    propertyAccountNumbers = null,
    years = [new Date().getFullYear()],
    invoiceDefaults = {}
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
          isArchived: false
        }
      });
    } else {
      properties = await prisma.property.findMany({
        where: {
          clientId: { in: clientIds },
          isArchived: false
        }
      });
    }

    const existingInvoices = await prisma.invoice.findMany({
      where: {
        propertyId: { in: properties.map(p => p.id) },
        year: { in: years }
      },
      select: {
        id: true,
        propertyId: true,
        accountNumber: true,
        year: true
      }
    });

    const existingInvoiceKeys = new Set(
      existingInvoices.map(inv => `${inv.propertyId}-${inv.year}`)
    );

    // Prepare invoice data for creation and update
    const invoiceData = [];
    const updateData = [];
    const createdInvoices = [];
    const updatedInvoices = [];

    for (const property of properties) {
      for (const year of years) {
        const invoiceKey = `${property.id}-${year}`;
        let invoiceAmount = 0;

        const invoiceDataItem = {
          propertyId: property.id,
          accountNumber: property.accountNumber,
          clientNumber: property.clientNumber,
          year,
          invoiceAmount,
          invoiceDate: new Date().toISOString().split('T')[0],
          ...invoiceDefaults
        };

        if (existingInvoiceKeys.has(invoiceKey)) {
          const existingInvoice = existingInvoices.find(inv =>
            inv.propertyId === property.id && inv.year === year
          );

          if (existingInvoice) {
            updateData.push({
              id: existingInvoice.id,
              data: invoiceDataItem
            });
            updatedInvoices.push({
              accountNumber: property.accountNumber,
              clientNumber: property.clientNumber,
              year,
              reason: "Updated existing invoice"
            });
          } else {
            invoiceData.push(invoiceDataItem);
            createdInvoices.push({
              accountNumber: property.accountNumber,
              clientNumber: property.clientNumber,
              year,
              reason: "Created new invoice (not found in existing)"
            });
          }
        } else {
          invoiceData.push(invoiceDataItem);
          createdInvoices.push({
            accountNumber: property.accountNumber,
            clientNumber: property.clientNumber,
            year,
            reason: "Created new invoice"
          });
        }
      }
    }

    // Create new invoices in batches
    if (invoiceData.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < invoiceData.length; i += batchSize) {
        const batch = invoiceData.slice(i, i + batchSize);
        await prisma.invoice.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
    }

    // Update existing invoices
    if (updateData.length > 0) {
      for (const updateItem of updateData) {
        await prisma.invoice.update({
          where: { id: updateItem.id },
          data: updateItem.data
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
        updated: updatedInvoices
      }
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
        in: propertyAccountNumbers
      }
    };

    if (years && years.length > 0) {
      whereClause.year = {
        in: years
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      orderBy: [{ propertyId: "asc" }, { year: "desc" }]
    });

    return invoices;

  } catch (error) {
    console.error("Error getting existing invoices:", error);
    throw error;
  }
} 