/*
  Warnings:

  - The values [REPORT] on the enum `AttachmentOwnerType` will be removed. If these variants are still used in the database, this will fail.
  - The values [RESOLVED] on the enum `EmergencyRequestStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `Asset` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `assetId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyRequestId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `reportId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `workOrderId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchedAt` on the `EmergencyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedAt` on the `EmergencyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedAt` on the `EmergencyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Site` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workOrderId]` on the table `MaintenanceReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserCompany` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "MaintenanceItemType" AS ENUM ('TEXT', 'LONG_TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'DATE', 'CHECKBOX', 'CHECKLIST', 'PHOTO', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "MaintenanceReportState" AS ENUM ('DRAFT', 'FINAL');

-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentOwnerType_new" AS ENUM ('WORK_ORDER', 'MAINTENANCE_REPORT', 'MAINTENANCE_REPORT_ITEM', 'ASSET', 'SITE', 'CUSTOMER', 'MAINTENANCE_TEMPLATE', 'EMERGENCY_REQUEST', 'OTHER');
ALTER TABLE "Attachment" ALTER COLUMN "ownerType" TYPE "AttachmentOwnerType_new" USING ("ownerType"::text::"AttachmentOwnerType_new");
ALTER TYPE "AttachmentOwnerType" RENAME TO "AttachmentOwnerType_old";
ALTER TYPE "AttachmentOwnerType_new" RENAME TO "AttachmentOwnerType";
DROP TYPE "public"."AttachmentOwnerType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EmergencyRequestStatus_new" AS ENUM ('OPEN', 'DISPATCHED', 'IN_PROGRESS', 'DONE', 'CANCELLED');
ALTER TABLE "public"."EmergencyRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EmergencyRequest" ALTER COLUMN "status" TYPE "EmergencyRequestStatus_new" USING ("status"::text::"EmergencyRequestStatus_new");
ALTER TYPE "EmergencyRequestStatus" RENAME TO "EmergencyRequestStatus_old";
ALTER TYPE "EmergencyRequestStatus_new" RENAME TO "EmergencyRequestStatus";
DROP TYPE "public"."EmergencyRequestStatus_old";
ALTER TABLE "EmergencyRequest" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaintenanceReportStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "MaintenanceReportStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "MaintenanceReportStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "MaintenanceReportStatus" ADD VALUE 'APPROVED';
ALTER TYPE "MaintenanceReportStatus" ADD VALUE 'REJECTED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
ALTER TYPE "WorkOrderStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_assetId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_emergencyRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_reportId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_customerId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_siteId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_assetId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_customerId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_siteId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_siteId_fkey";

-- DropIndex
DROP INDEX "Asset_companyId_idx";

-- DropIndex
DROP INDEX "Attachment_assetId_idx";

-- DropIndex
DROP INDEX "Attachment_emergencyRequestId_idx";

-- DropIndex
DROP INDEX "Attachment_reportId_idx";

-- DropIndex
DROP INDEX "Attachment_workOrderId_idx";

-- DropIndex
DROP INDEX "Contact_companyId_idx";

-- DropIndex
DROP INDEX "Contact_siteId_idx";

-- DropIndex
DROP INDEX "Customer_companyId_idx";

-- DropIndex
DROP INDEX "EmergencyRequest_companyId_idx";

-- DropIndex
DROP INDEX "EmergencyRequest_status_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_completedByUserId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_createdByUserId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_workOrderId_idx";

-- DropIndex
DROP INDEX "MaintenanceReportItem_reportId_idx";

-- DropIndex
DROP INDEX "MaintenanceReportItem_reportId_itemOrder_key";

-- DropIndex
DROP INDEX "MaintenanceTemplate_companyId_idx";

-- DropIndex
DROP INDEX "MaintenanceTemplateItem_templateId_idx";

-- DropIndex
DROP INDEX "MaintenanceTemplateItem_templateId_itemOrder_key";

-- DropIndex
DROP INDEX "Site_companyId_idx";

-- DropIndex
DROP INDEX "Site_customerId_idx";

-- DropIndex
DROP INDEX "UserCompany_companyId_idx";

-- DropIndex
DROP INDEX "UserCompany_userId_idx";

-- DropIndex
DROP INDEX "WorkOrder_assignedToUserId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_idx";

-- DropIndex
DROP INDEX "WorkOrder_status_idx";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "code" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "location" TEXT,
ALTER COLUMN "siteId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Attachment" DROP COLUMN "assetId",
DROP COLUMN "emergencyRequestId",
DROP COLUMN "fileUrl",
DROP COLUMN "reportId",
DROP COLUMN "workOrderId",
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "filename" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "path" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploadedByUserId" TEXT,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL,
ALTER COLUMN "fileName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "EmergencyRequest" DROP COLUMN "dispatchedAt",
DROP COLUMN "requestedAt",
DROP COLUMN "resolvedAt",
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "siteId" DROP NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "MaintenanceReport" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedTechnicianId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "diagnosis" TEXT,
ADD COLUMN     "laborHours" DECIMAL(10,2),
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "recommendations" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "state" "MaintenanceReportState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "technicianNotes" TEXT,
ADD COLUMN     "workPerformed" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "siteId" DROP NOT NULL,
ALTER COLUMN "assetId" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceReportItem" ADD COLUMN     "label" TEXT,
ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "MaintenanceItemType",
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "valueBoolean" BOOLEAN,
ADD COLUMN     "valueDate" TIMESTAMP(3),
ADD COLUMN     "valueJson" JSONB,
ADD COLUMN     "valueNumber" DOUBLE PRECISION,
ADD COLUMN     "valueText" TEXT,
ADD COLUMN     "valueType" TEXT,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "itemOrder" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "MaintenanceTemplate" ADD COLUMN     "name" TEXT,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" ADD COLUMN     "helpText" TEXT,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "MaintenanceItemType",
ALTER COLUMN "itemOrder" SET DEFAULT 0,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "postalCode",
DROP COLUMN "state",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "role" "UserRole";

-- AlterTable
ALTER TABLE "UserCompany" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "assignedTechnicianId" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "maintenanceTemplateId" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "siteId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MaintenanceReportMaterial" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceReportMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCounter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceReportMaterial_reportId_sortOrder_idx" ON "MaintenanceReportMaterial"("reportId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCounter_companyId_key_key" ON "CompanyCounter"("companyId", "key");

-- CreateIndex
CREATE INDEX "Asset_companyId_name_idx" ON "Asset"("companyId", "name");

-- CreateIndex
CREATE INDEX "Asset_customerId_idx" ON "Asset"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Contact_companyId_siteId_idx" ON "Contact"("companyId", "siteId");

-- CreateIndex
CREATE INDEX "Customer_companyId_name_idx" ON "Customer"("companyId", "name");

-- CreateIndex
CREATE INDEX "EmergencyRequest_companyId_status_idx" ON "EmergencyRequest"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReport_workOrderId_key" ON "MaintenanceReport"("workOrderId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_status_idx" ON "MaintenanceReport"("companyId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceReport_assignedTechnicianId_status_idx" ON "MaintenanceReport"("assignedTechnicianId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceReportItem_reportId_sortOrder_idx" ON "MaintenanceReportItem"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "MaintenanceReportItem_reportId_itemOrder_idx" ON "MaintenanceReportItem"("reportId", "itemOrder");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_companyId_isActive_idx" ON "MaintenanceTemplate"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_companyId_name_idx" ON "MaintenanceTemplate"("companyId", "name");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_companyId_title_idx" ON "MaintenanceTemplate"("companyId", "title");

-- CreateIndex
CREATE INDEX "MaintenanceTemplateItem_templateId_sortOrder_idx" ON "MaintenanceTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "MaintenanceTemplateItem_templateId_itemOrder_idx" ON "MaintenanceTemplateItem"("templateId", "itemOrder");

-- CreateIndex
CREATE INDEX "Site_companyId_customerId_name_idx" ON "Site"("companyId", "customerId", "name");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");

-- CreateIndex
CREATE INDEX "UserCompany_companyId_role_active_idx" ON "UserCompany"("companyId", "role", "active");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_status_idx" ON "WorkOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedTechnicianId_status_idx" ON "WorkOrder"("assignedTechnicianId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedToUserId_status_idx" ON "WorkOrder"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_maintenanceTemplateId_idx" ON "WorkOrder"("maintenanceTemplateId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_code_idx" ON "WorkOrder"("companyId", "code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_maintenanceTemplateId_fkey" FOREIGN KEY ("maintenanceTemplateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReportMaterial" ADD CONSTRAINT "MaintenanceReportMaterial_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MaintenanceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCounter" ADD CONSTRAINT "CompanyCounter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
