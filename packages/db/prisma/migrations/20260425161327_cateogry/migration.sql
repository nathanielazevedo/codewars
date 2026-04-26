-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "category" VARCHAR(32) NOT NULL DEFAULT 'arrays_hashing';

-- CreateIndex
CREATE INDEX "problems_category_idx" ON "problems"("category");
