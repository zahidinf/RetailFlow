-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "description" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "module" TEXT,
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "previousValue" JSONB,
ADD COLUMN     "recordId" TEXT,
ADD COLUMN     "recordIdentifier" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'SUCCESS',
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_recordId_idx" ON "AuditLog"("recordId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
