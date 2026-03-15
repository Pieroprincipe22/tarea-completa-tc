/*
  Warnings:

  - You are about to drop the column `kind` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - The `status` column on the `WorkOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[companyId,number]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - Made the column `siteId` on table `Asset` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `type` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `customerId` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `createdByUserId` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.
  - Made the column `priority` on table `WorkOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `customerId` on table `WorkOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "MaintenanceItemType" AS ENUM ('CHECK', 'NUMBER', 'TEXT', 'CHOICE');

-- CreateEnum
CREATE TYPE "MaintenanceReportState" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "MaintenanceReportItemStatus" AS ENUM ('PENDING', 'OK', 'NOK', 'NA');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_customerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_customerId_fkey";

-- DropIndex
DROP INDEX "Asset_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "Asset_companyId_siteId_idx";

-- DropIndex
DROP INDEX "Contact_companyId_siteId_idx";

-- DropIndex
DROP INDEX "Customer_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "MaintenanceTemplate_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "Site_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "Site_companyId_customerId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_idx";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "criticality" INTEGER,
ADD COLUMN     "installedAt" TIMESTAMP(3),
ADD COLUMN     "lastServiceAt" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTemplate" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "intervalDays" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" DROP COLUMN "kind",
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "type" "MaintenanceItemType" NOT NULL,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "notes" TEXT,
ALTER COLUMN "customerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "assignedToUserId" TEXT,
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "number" INTEGER NOT NULL,
ALTER COLUMN "priority" SET NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 3,
ALTER COLUMN "customerId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "CompanyCounter" (
    "companyId" TEXT NOT NULL,
    "workOrderSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyCounter_pkey" PRIMARY KEY ("companyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserCompany_companyId_idx" ON "UserCompany"("companyId");

-- CreateIndex
CREATE INDEX "UserCompany_userId_idx" ON "UserCompany"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_companyId_userId_key" ON "UserCompany"("companyId", "userId");

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

-- CreateIndex
CREATE INDEX "Asset_siteId_idx" ON "Asset"("siteId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_archivedAt_idx" ON "MaintenanceTemplate"("archivedAt");

-- CreateIndex
CREATE INDEX "Site_customerId_idx" ON "Site"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_status_idx" ON "WorkOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_assignedToUserId_idx" ON "WorkOrder"("companyId", "assignedToUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_companyId_number_key" ON "WorkOrder"("companyId", "number");

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "CompanyCounter" ADD CONSTRAINT "CompanyCounter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
