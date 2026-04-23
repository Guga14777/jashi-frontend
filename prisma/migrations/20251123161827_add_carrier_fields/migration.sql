/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderNumber]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "carrierId" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "orderNumber" INTEGER;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "orderNumber" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "roles" TEXT NOT NULL DEFAULT 'CUSTOMER';

-- DropEnum
DROP TYPE "Role";

-- CreateIndex
CREATE INDEX "Booking_orderNumber_idx" ON "Booking"("orderNumber");

-- CreateIndex
CREATE INDEX "Booking_carrierId_idx" ON "Booking"("carrierId");

-- CreateIndex
CREATE INDEX "Booking_status_carrierId_idx" ON "Booking"("status", "carrierId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_orderNumber_key" ON "Quote"("orderNumber");

-- CreateIndex
CREATE INDEX "Quote_orderNumber_idx" ON "Quote"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_roles_idx" ON "User"("roles");
