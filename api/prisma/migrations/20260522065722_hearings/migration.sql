-- CreateTable
CREATE TABLE "hearings" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hearings_propertyId_idx" ON "hearings"("propertyId");

-- CreateIndex
CREATE INDEX "hearings_date_idx" ON "hearings"("date");

-- AddForeignKey
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
