-- CreateEnum
CREATE TYPE "MaintenanceReportState" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "MaintenanceReportItemStatus" AS ENUM ('PENDING', 'OK', 'NOK', 'NA');

-- CreateTable
CREATE TABLE "MaintenanceReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "templateName" TEXT NOT NULL,
    "templateDesc" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "customerId" TEXT,
    "siteId" TEXT,
    "assetId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "MaintenanceReportState" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "summary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceReportItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "templateItemId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MaintenanceReportItemStatus" NOT NULL DEFAULT 'PENDING',
    "resultNotes" TEXT,
    "resultValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_performedAt_idx" ON "MaintenanceReport"("companyId", "performedAt");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_assetId_idx" ON "MaintenanceReport"("companyId", "assetId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_siteId_idx" ON "MaintenanceReport"("companyId", "siteId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_customerId_idx" ON "MaintenanceReport"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_templateId_idx" ON "MaintenanceReport"("companyId", "templateId");

-- CreateIndex
CREATE INDEX "MaintenanceReportItem_companyId_reportId_idx" ON "MaintenanceReportItem"("companyId", "reportId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReportItem_reportId_sortOrder_key" ON "MaintenanceReportItem"("reportId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReportItem" ADD CONSTRAINT "MaintenanceReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MaintenanceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
