-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "quoteId" TEXT,
ADD COLUMN     "storageType" TEXT DEFAULT 'local';

-- CreateIndex
CREATE INDEX "Document_quoteId_idx" ON "Document"("quoteId");

-- CreateIndex
CREATE INDEX "Document_storageType_idx" ON "Document"("storageType");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
