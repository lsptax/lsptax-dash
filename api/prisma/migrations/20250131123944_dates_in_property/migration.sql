-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "AOASigned" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "HearingDate" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Prospect" (
    "id" SERIAL NOT NULL,
    "ProspectName" TEXT,
    "Email" TEXT,
    "PHONENUMBER" TEXT,
    "MAILINGADDRESS" TEXT,
    "MAILINGADDRESSCITYTXZIP" TEXT,
    "IsArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);
