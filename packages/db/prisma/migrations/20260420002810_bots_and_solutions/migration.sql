-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "solutions" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bot_persona" VARCHAR(16),
ADD COLUMN     "is_bot" BOOLEAN NOT NULL DEFAULT false;
