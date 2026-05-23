import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seeder() {
  try {
    // Update all rows in the Invoice table
    const updatedInvoices = await prisma.invoice.updateMany({
      data: {
        protestDate: "", // Set string fields to empty string
        bppRendered: "",
        bppInvoice: "",
        bppPaid: "",
        hearingDate: "",
        invoiceDate: "",
        paidDate: "",
        paymentNotes: "",
        noticeLandValue: 0, // Set integer fields to 0
        noticeImprovementValue: 0,
        noticeMarketValue: 0,
        noticeAppraisedValue: 0,
        finalLandValue: 0,
        finalImprovementValue: 0,
        finalMarketValue: 0,
        finalAppraisedValue: 0,
        marketReduction: 0,
        appraisedReduction: 0,
        taxRate: 0,
        taxableSavings: 0,
        contingencyFee: 0,
        invoiceAmount: 0,
        beginningMarket: 0,
        endingMarket: 0,
        beginningAppraised: 0,
        endingAppraised: 0,
        underLitigation: false, // Set boolean fields to false
        underArbitration: false,
        isArchived: false,
      },
    });

    console.log(`Updated ${updatedInvoices.count} invoices.`);
  } catch (error) {
    console.error("Error seeding invoices:", error);
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
}

// Run the seeder
seeder();
