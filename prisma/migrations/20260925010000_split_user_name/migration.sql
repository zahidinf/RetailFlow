-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "name";
-- migrations were applied manually via direct SQL to split firstName/lastName
