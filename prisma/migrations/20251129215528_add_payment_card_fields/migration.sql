/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Made the column `orderNumber` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "orderNumber" SET NOT NULL;

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "cardholderFirstName" TEXT,
ADD COLUMN     "cardholderLastName" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_orderNumber_key" ON "Booking"("orderNumber");

-- CreateIndex
CREATE INDEX "PaymentTransaction_paidAt_idx" ON "PaymentTransaction"("paidAt");

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
