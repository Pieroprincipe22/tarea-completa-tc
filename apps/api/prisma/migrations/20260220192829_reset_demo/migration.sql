/*
  Warnings:

  - You are about to drop the column `brand` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `criticality` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `installedAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `lastServiceAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `isMain` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `archivedAt` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `intervalDays` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `hint` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToUserId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `createdByUserId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `dueAt` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `WorkOrder` table. All the data in the column will be lost.
  - The `status` column on the `WorkOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `CompanyCounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaintenanceReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaintenanceReportItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCompany` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `kind` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_siteId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyCounter" DROP CONSTRAINT "CompanyCounter_companyId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_assetId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_companyId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_customerId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_siteId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReportItem" DROP CONSTRAINT "MaintenanceReportItem_reportId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_customerId_fkey";

-- DropForeignKey
ALTER TABLE "UserCompany" DROP CONSTRAINT "UserCompany_companyId_fkey";

-- DropForeignKey
ALTER TABLE "UserCompany" DROP CONSTRAINT "UserCompany_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_customerId_fkey";

-- DropIndex
DROP INDEX "Asset_siteId_idx";

-- DropIndex
DROP INDEX "MaintenanceTemplate_archivedAt_idx";

-- DropIndex
DROP INDEX "Site_customerId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_assignedToUserId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_number_key";

-- DropIndex
DROP INDEX "WorkOrder_companyId_status_idx";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "brand",
DROP COLUMN "criticality",
DROP COLUMN "installedAt",
DROP COLUMN "lastServiceAt",
DROP COLUMN "location",
DROP COLUMN "model",
DROP COLUMN "notes",
ALTER COLUMN "siteId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "isMain",
DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "MaintenanceTemplate" DROP COLUMN "archivedAt",
DROP COLUMN "intervalDays",
DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" DROP COLUMN "hint",
DROP COLUMN "options",
DROP COLUMN "type",
DROP COLUMN "unit",
DROP COLUMN "updatedAt",
ADD COLUMN     "kind" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "notes",
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "assignedToUserId",
DROP COLUMN "createdByUserId",
DROP COLUMN "dueAt",
DROP COLUMN "number",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "priority" DROP NOT NULL,
ALTER COLUMN "priority" DROP DEFAULT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- DropTable
DROP TABLE "CompanyCounter";

-- DropTable
DROP TABLE "MaintenanceReport";

-- DropTable
DROP TABLE "MaintenanceReportItem";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserCompany";

-- DropEnum
DROP TYPE "MaintenanceItemType";

-- DropEnum
DROP TYPE "MaintenanceReportItemStatus";

-- DropEnum
DROP TYPE "MaintenanceReportState";

-- DropEnum
DROP TYPE "WorkOrderStatus";

-- CreateIndex
CREATE INDEX "Asset_companyId_siteId_idx" ON "Asset"("companyId", "siteId");

-- CreateIndex
CREATE INDEX "Asset_companyId_createdAt_idx" ON "Asset"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_companyId_siteId_idx" ON "Contact"("companyId", "siteId");

-- CreateIndex
CREATE INDEX "Customer_companyId_createdAt_idx" ON "Customer"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_companyId_createdAt_idx" ON "MaintenanceTemplate"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Site_companyId_customerId_idx" ON "Site"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "Site_companyId_createdAt_idx" ON "Site"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_idx" ON "WorkOrder"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_createdAt_idx" ON "WorkOrder"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
