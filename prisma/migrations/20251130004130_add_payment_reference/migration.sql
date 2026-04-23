-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "reference" TEXT;

-- CreateIndex
CREATE INDEX "PaymentTransaction_reference_idx" ON "PaymentTransaction"("reference");
