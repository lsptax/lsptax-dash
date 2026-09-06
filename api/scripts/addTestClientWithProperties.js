/**
 * Seed a deterministic test CLIENT with exactly 2 properties and populated fields.
 *
 * This is intended for local/dev data to exercise UI screens with realistic records:
 * - 1 Client (type=CLIENT)
 * - 2 Properties (fully populated fields)
 * - Invoices for each property for the last 5 years (filled money/tax/date fields)
 * - 1 CLIENT_CONTRACT + 2 AOA contract rows
 *
 * Usage:
 *   npm run seed-test-client
 *   npm run seed-test-client:dry-run
 *
 * Optional:
 *   node scripts/addTestClientWithProperties.js --clientNumber=TEST-CLIENT-001
 *   node scripts/addTestClientWithProperties.js --dry-run
 */

import "dotenv/config";
import {
  ClientType,
  ContractType,
  ContractStatus,
} from "@prisma/client";
import { HEARING_MANAGEMENT_PHASE_ID } from "../src/config/lifecycleConstants.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { dryRun: false, clientNumber: "TEST-CLIENT-001" };
  for (const a of args) {
    if (a === "--dry-run" || a === "-n") out.dryRun = true;
    if (a.startsWith("--clientNumber=")) out.clientNumber = a.slice("--clientNumber=".length);
  }
  return out;
}

function isoDateYYYYMMDD(year, month1To12, day) {
  // Use UTC to avoid off-by-one date issues around midnight.
  const dt = new Date(Date.UTC(year, month1To12 - 1, day, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function toMoney(n) {
  // Keep it simple: Prisma Decimal can accept JS numbers; ensure a stable 2dp-ish value.
  return Math.round(n * 100) / 100;
}

async function main() {
  const { dryRun, clientNumber } = parseArgs(process.argv);

  if (!dryRun && !process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (or missing from .env).");
    process.exit(1);
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = [];
  for (let y = currentYear - 4; y <= currentYear; y++) years.push(y);

  // Deterministic IDs so you can re-run without exploding the DB.
  const testClientBase = {
    clientNumber,
    clientName: "Test Client (Seed)",
    typeOfAcct: "real",
    email: `seed-test-client-${String(clientNumber).toLowerCase()}@example.com`,
    billingEmail: `seed-test-client-billing-${String(clientNumber).toLowerCase()}@example.com`,
    phoneNumber: "(555) 123-4567",
    billingAddress: "123 Billing St, Dallas, TX 75001",
    nameOnCad: "Seed CAD Name",
    mailingAddress: "123 Mailing St, Dallas, TX 75001",
    mailingAddressCityTxZip: "Dallas, TX 75001",
    // Client money fields are stored as Decimal in DB.
    contingencyFee: toMoney(25.5), // percent
    flatFee: toMoney(2500), // dollars
    envelopeId: "seed-envelope-client-contract-001",
    isArchived: false,
    prospectStatus: null,
  };

  // Ensure we fill every property column (except `id`, `createdAt`, `updatedAt`).
  const propertyDefs = [
    {
      accountNumber: "TEST-ACCOUNT-001",
      clientNumber,
      statusNotes: "Seed: status notes for property #1",
      otherNotes: "Seed: other notes for property #1",
      nameOnCad: "Seed CAD Owner #1",
      mailingAddress: "456 Mailing Ave, Dallas, TX 75001",
      mailingAddressCityTxZip: "Dallas, TX 75001",
      propertyAddress: "456 Property St, Dallas, TX 75001",
      cadMailingAddress: "PO Box 1001, Dallas, TX 75001",
      cadCity: "Dallas",
      cadZipCode: "75001",
      cadCounty: "Dallas County",
      contactOwner: "Contact Owner #1",
      subcontractOwner: "Subcontract Owner #1",
      bppFee: "100.00",
      contingencyFee: "1200.00",
      flatFee: "800.00",
      aoaSigned: isoDateYYYYMMDD(currentYear, 2, 15),
      hearingDate: isoDateYYYYMMDD(currentYear, 6, 20),
      isArchived: false,
      lifecyclePhase: HEARING_MANAGEMENT_PHASE_ID,
      lifecycleStep: "hearingScheduleReceipt",
      lifecycleNotes: "Seed: lifecycle notes for property #1",
    },
    {
      accountNumber: "TEST-ACCOUNT-002",
      clientNumber,
      statusNotes: "Seed: status notes for property #2",
      otherNotes: "Seed: other notes for property #2",
      nameOnCad: "Seed CAD Owner #2",
      mailingAddress: "789 Mailing Rd, Fort Worth, TX 76101",
      mailingAddressCityTxZip: "Fort Worth, TX 76101",
      propertyAddress: "789 Property Blvd, Fort Worth, TX 76101",
      cadMailingAddress: "PO Box 2002, Fort Worth, TX 76101",
      cadCity: "Fort Worth",
      cadZipCode: "76101",
      cadCounty: "Tarrant County",
      contactOwner: "Contact Owner #2",
      subcontractOwner: "Subcontract Owner #2",
      bppFee: "200.00",
      contingencyFee: "1400.00",
      flatFee: "900.00",
      aoaSigned: isoDateYYYYMMDD(currentYear, 3, 10),
      hearingDate: isoDateYYYYMMDD(currentYear, 7, 5),
      isArchived: false,
      lifecyclePhase: HEARING_MANAGEMENT_PHASE_ID,
      lifecycleStep: "calendarIntegration",
      lifecycleNotes: "Seed: lifecycle notes for property #2",
    },
  ];

  const lifecycleHistoryFor = (stepId) => [
    {
      at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      from: { phase: null, step: null },
      to: { phase: HEARING_MANAGEMENT_PHASE_ID, step: stepId },
      notes: "Seed lifecycle start",
    },
    {
      at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      from: { phase: HEARING_MANAGEMENT_PHASE_ID, step: stepId },
      to: { phase: HEARING_MANAGEMENT_PHASE_ID, step: stepId },
      notes: "Seed lifecycle updated",
    },
  ];

  const payload = {
    dryRun,
    client: {
      ...testClientBase,
      // Type is derived below via Prisma enum.
      type: "CLIENT",
    },
    propertyCount: 2,
    years,
  };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const prisma = (await import("../prisma/prismaClient.js")).default;
  const { client, createdProperties, invoicesCreated } = await prisma.$transaction(
    async (tx) => {
      const clientRow = await tx.client.upsert({
        where: { clientNumber },
        update: {
          type: ClientType.CLIENT,
          clientName: testClientBase.clientName,
          email: testClientBase.email,
          billingEmail: testClientBase.billingEmail,
          phoneNumber: testClientBase.phoneNumber,
          billingAddress: testClientBase.billingAddress,
          nameOnCad: testClientBase.nameOnCad,
          mailingAddress: testClientBase.mailingAddress,
          mailingAddressCityTxZip: testClientBase.mailingAddressCityTxZip,
          contingencyFee: testClientBase.contingencyFee,
          flatFee: testClientBase.flatFee,
          envelopeId: testClientBase.envelopeId,
          isArchived: testClientBase.isArchived,
          prospectStatus: testClientBase.prospectStatus,
          typeOfAcct: testClientBase.typeOfAcct,
        },
        create: {
          type: ClientType.CLIENT,
          clientNumber,
          clientName: testClientBase.clientName,
          email: testClientBase.email,
          billingEmail: testClientBase.billingEmail,
          phoneNumber: testClientBase.phoneNumber,
          billingAddress: testClientBase.billingAddress,
          nameOnCad: testClientBase.nameOnCad,
          mailingAddress: testClientBase.mailingAddress,
          mailingAddressCityTxZip: testClientBase.mailingAddressCityTxZip,
          contingencyFee: testClientBase.contingencyFee,
          flatFee: testClientBase.flatFee,
          envelopeId: testClientBase.envelopeId,
          isArchived: testClientBase.isArchived,
          prospectStatus: testClientBase.prospectStatus,
          typeOfAcct: testClientBase.typeOfAcct,
        },
      });

      // Recreate properties for this test client to keep the dataset clean.
      // (Property delete cascades invoices; client delete is NOT performed.)
      await tx.contract.deleteMany({ where: { clientId: clientRow.id } });
      await tx.property.deleteMany({ where: { clientId: clientRow.id } });

      const props = [];
      for (const p of propertyDefs) {
        // Only 2 rows; keep it simple and return ids.
        // Doing this inside one transaction keeps the dataset consistent.
        // (createMany doesn't return ids.)
        // eslint-disable-next-line no-await-in-loop
        const created = await tx.property.create({
          data: {
            clientId: clientRow.id,
            clientNumber: p.clientNumber,
            accountNumber: p.accountNumber,

            statusNotes: p.statusNotes,
            otherNotes: p.otherNotes,
            nameOnCad: p.nameOnCad,
            mailingAddress: p.mailingAddress,
            mailingAddressCityTxZip: p.mailingAddressCityTxZip,

            propertyAddress: p.propertyAddress,
            cadMailingAddress: p.cadMailingAddress,
            cadCity: p.cadCity,
            cadZipCode: p.cadZipCode,
            cadCounty: p.cadCounty,

            contactOwner: p.contactOwner,
            subcontractOwner: p.subcontractOwner,

            bppFee: p.bppFee,
            contingencyFee: p.contingencyFee,
            flatFee: p.flatFee,

            aoaSigned: p.aoaSigned,
            hearingDate: p.hearingDate,

            isArchived: p.isArchived,

            lifecyclePhase: p.lifecyclePhase,
            lifecycleStep: p.lifecycleStep,
            lifecycleHistory: lifecycleHistoryFor(p.lifecycleStep),
            lifecycleCompletedAt: now,
            lifecycleNotes: p.lifecycleNotes,
          },
        });
        props.push(created);
      }

      const invoiceRows = [];
      for (let propIdx = 0; propIdx < props.length; propIdx++) {
        const prop = props[propIdx];
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          const t = year - years[0]; // 0..4

          const base = 100000 + propIdx * 25000 + t * 5000;
          const noticeLandValue = toMoney(base);
          const noticeImprovementValue = toMoney(base * 0.35);
          const noticeMarketValue = toMoney(base * 1.18);
          const noticeAppraisedValue = toMoney(base * 1.08);

          const marketReduction = toMoney(base * 0.06);
          const appraisedReduction = toMoney(base * 0.04);

          const finalLandValue = toMoney(noticeLandValue - marketReduction);
          const finalImprovementValue = toMoney(
            noticeImprovementValue - appraisedReduction
          );
          const finalMarketValue = toMoney(noticeMarketValue - marketReduction);
          const finalAppraisedValue = toMoney(
            noticeAppraisedValue - appraisedReduction
          );

          const taxRate = toMoney(2.5 + propIdx * 0.15); // Decimal(5,2)
          const taxableSavings = toMoney(finalMarketValue * 0.01);
          const contingencyFee = toMoney(1200 + propIdx * 250 + t * 75);
          const invoiceAmount = toMoney(3000 + propIdx * 500 + t * 150);

          invoiceRows.push({
            propertyId: prop.id,
            accountNumber: prop.accountNumber,
            clientNumber: clientRow.clientNumber,
            year,

            protestDate: isoDateYYYYMMDD(year, 1, 25),
            bppRendered: isoDateYYYYMMDD(year, 3, 5),
            bppInvoice: isoDateYYYYMMDD(year, 3, 18),
            bppPaid: i % 2 === 0 ? isoDateYYYYMMDD(year, 4, 30) : "",

            noticeLandValue,
            noticeImprovementValue,
            noticeMarketValue,
            noticeAppraisedValue,

            finalLandValue,
            finalImprovementValue,
            finalMarketValue,
            finalAppraisedValue,

            marketReduction,
            appraisedReduction,

            hearingDate: prop.hearingDate,
            invoiceDate: isoDateYYYYMMDD(year, 5, 10),

            underLitigation: i % 3 === 0,
            underArbitration: propIdx === 1 && i % 2 === 1,

            taxRate,
            taxableSavings,
            contingencyFee,
            invoiceAmount,

            paidDate: i % 2 === 0 ? isoDateYYYYMMDD(year, 6, 30) : "",
            isPaid: i % 2 === 0,
            paymentNotes:
              i % 2 === 0
                ? "Seed: payment received"
                : "Seed: payment pending / placeholder",

            beginningMarket: toMoney(noticeMarketValue * 0.92),
            endingMarket: toMoney(finalMarketValue * 0.95),
            beginningAppraised: toMoney(noticeAppraisedValue * 0.90),
            endingAppraised: toMoney(finalAppraisedValue * 0.94),

            isArchived: false,
          });
        }
      }

      const invRes = await tx.invoice.createMany({ data: invoiceRows });

      await tx.contract.createMany({
        data: [
          {
            type: ContractType.CLIENT_CONTRACT,
            status: ContractStatus.SENT,
            clientId: clientRow.id,
            propertyId: null,
            envelopeId: "seed-envelope-client-contract-001",
            fileUrl: null,
            signedFileUrl: null,
          },
          ...props.map((prop, idx) => ({
            type: ContractType.AOA,
            status: ContractStatus.SENT,
            clientId: clientRow.id,
            propertyId: prop.id,
            envelopeId: `seed-envelope-aoa-${idx + 1}`,
            fileUrl: null,
            signedFileUrl: null,
          })),
        ],
      });

      return { client: clientRow, createdProperties: props, invoicesCreated: invRes.count };
    },
    // Supabase / pooler can be slow on first connect; give it more room.
    { maxWait: 20000, timeout: 60000 }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        clientId: client.id,
        clientNumber: client.clientNumber,
        properties: createdProperties.map((p) => ({
          id: p.id,
          accountNumber: p.accountNumber,
        })),
        invoicesCreated,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

