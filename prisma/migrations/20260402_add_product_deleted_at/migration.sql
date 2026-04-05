-- AlterTable: Add soft-delete support to Product model
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: Index for efficient soft-delete filtering
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
