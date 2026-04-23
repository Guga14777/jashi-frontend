-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dropoffAddressId" TEXT,
ADD COLUMN     "pickupAddressId" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "dropoffAddressId" TEXT,
ADD COLUMN     "pickupAddressId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Booking_pickupAddressId_idx" ON "Booking"("pickupAddressId");

-- CreateIndex
CREATE INDEX "Booking_dropoffAddressId_idx" ON "Booking"("dropoffAddressId");

-- CreateIndex
CREATE INDEX "Quote_pickupAddressId_idx" ON "Quote"("pickupAddressId");

-- CreateIndex
CREATE INDEX "Quote_dropoffAddressId_idx" ON "Quote"("dropoffAddressId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_pickupAddressId_fkey" FOREIGN KEY ("pickupAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dropoffAddressId_fkey" FOREIGN KEY ("dropoffAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pickupAddressId_fkey" FOREIGN KEY ("pickupAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dropoffAddressId_fkey" FOREIGN KEY ("dropoffAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
