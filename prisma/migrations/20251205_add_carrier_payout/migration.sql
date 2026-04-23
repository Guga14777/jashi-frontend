-- CreateTable: CarrierPayout
-- This table stores payout records for carriers
-- Run this migration with: npx prisma migrate deploy

CREATE TABLE "CarrierPayout" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PAYOUT',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "methodType" TEXT NOT NULL DEFAULT 'ach',
    "methodLabel" TEXT,
    "methodLast4" TEXT,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique reference
CREATE UNIQUE INDEX "CarrierPayout_reference_key" ON "CarrierPayout"("reference");

-- CreateIndex: carrierId for fast lookups
CREATE INDEX "CarrierPayout_carrierId_idx" ON "CarrierPayout"("carrierId");

-- CreateIndex: bookingId for joining with bookings
CREATE INDEX "CarrierPayout_bookingId_idx" ON "CarrierPayout"("bookingId");

-- CreateIndex: status for filtering
CREATE INDEX "CarrierPayout_status_idx" ON "CarrierPayout"("status");

-- CreateIndex: createdAt for sorting
CREATE INDEX "CarrierPayout_createdAt_idx" ON "CarrierPayout"("createdAt");

-- CreateIndex: reference for lookups
CREATE INDEX "CarrierPayout_reference_idx" ON "CarrierPayout"("reference");

-- AddForeignKey: Link to User (carrier)
ALTER TABLE "CarrierPayout" ADD CONSTRAINT "CarrierPayout_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Link to Booking (optional)
ALTER TABLE "CarrierPayout" ADD CONSTRAINT "CarrierPayout_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;