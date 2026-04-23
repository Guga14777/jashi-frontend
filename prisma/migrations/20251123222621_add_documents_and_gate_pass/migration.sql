-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dropoffGatePassId" TEXT,
ADD COLUMN     "pickupGatePassId" TEXT;

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "dropoffGatePassId" TEXT,
ADD COLUMN     "pickupGatePassId" TEXT;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_bookingId_idx" ON "Document"("bookingId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_pickupGatePassId_idx" ON "Booking"("pickupGatePassId");

-- CreateIndex
CREATE INDEX "Booking_dropoffGatePassId_idx" ON "Booking"("dropoffGatePassId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pickupGatePassId_fkey" FOREIGN KEY ("pickupGatePassId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dropoffGatePassId_fkey" FOREIGN KEY ("dropoffGatePassId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
