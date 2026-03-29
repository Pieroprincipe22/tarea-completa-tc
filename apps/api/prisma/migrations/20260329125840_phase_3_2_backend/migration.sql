/*
  Warnings:

  - The values [COMPLETED] on the enum `MaintenanceReportStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ASSIGNED] on the enum `WorkOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `category` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `installationAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `internalCode` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `assetId` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `completedByUserId` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `createdByUserId` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `itemOrder` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `itemOrder` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `valueType` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToUserId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmergencyRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Site` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCompany` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workOrderId]` on the table `MaintenanceReport` will be added. If there are existing duplicate values, this will fail.
  - Made the column `workOrderId` on table `MaintenanceReport` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `label` to the `MaintenanceReportItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `MaintenanceReportItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `MaintenanceTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MaintenanceItemType" AS ENUM ('TEXT', 'LONG_TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'DATE', 'CHECKBOX', 'CHECKLIST', 'PHOTO', 'SIGNATURE');

-- AlterEnum
BEGIN;
CREATE TYPE "MaintenanceReportStatus_new" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."MaintenanceReport" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MaintenanceReport" ALTER COLUMN "status" TYPE "MaintenanceReportStatus_new" USING ("status"::text::"MaintenanceReportStatus_new");
ALTER TYPE "MaintenanceReportStatus" RENAME TO "MaintenanceReportStatus_old";
ALTER TYPE "MaintenanceReportStatus_new" RENAME TO "MaintenanceReportStatus";
DROP TYPE "public"."MaintenanceReportStatus_old";
ALTER TABLE "MaintenanceReport" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
BEGIN;
CREATE TYPE "WorkOrderStatus_new" AS ENUM ('OPEN', 'PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkOrder" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TYPE "WorkOrderStatus" RENAME TO "WorkOrderStatus_old";
ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";
DROP TYPE "public"."WorkOrderStatus_old";
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

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
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_siteId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_assetId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_companyId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_customerId_fkey";

-- DropForeignKey
ALTER TABLE "EmergencyRequest" DROP CONSTRAINT "EmergencyRequest_siteId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_assetId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_completedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_customerId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_siteId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_customerId_fkey";

-- DropForeignKey
ALTER TABLE "UserCompany" DROP CONSTRAINT "UserCompany_companyId_fkey";

-- DropForeignKey
ALTER TABLE "UserCompany" DROP CONSTRAINT "UserCompany_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_assignedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_siteId_fkey";

-- DropIndex
DROP INDEX "Asset_companyId_idx";

-- DropIndex
DROP INDEX "Asset_siteId_idx";

-- DropIndex
DROP INDEX "Customer_companyId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_assetId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_completedByUserId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_createdByUserId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_customerId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_siteId_idx";

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
DROP INDEX "WorkOrder_assignedToUserId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_idx";

-- DropIndex
DROP INDEX "WorkOrder_siteId_idx";

-- DropIndex
DROP INDEX "WorkOrder_status_idx";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "category",
DROP COLUMN "installationAt",
DROP COLUMN "internalCode",
DROP COLUMN "siteId",
DROP COLUMN "status",
ADD COLUMN     "code" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceReport" DROP COLUMN "assetId",
DROP COLUMN "completedAt",
DROP COLUMN "completedByUserId",
DROP COLUMN "createdByUserId",
DROP COLUMN "customerId",
DROP COLUMN "description",
DROP COLUMN "notes",
DROP COLUMN "siteId",
DROP COLUMN "title",
ADD COLUMN     "assignedAt" TIMESTAMP(3),
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
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "technicianNotes" TEXT,
ADD COLUMN     "workPerformed" TEXT,
ALTER COLUMN "workOrderId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceReportItem" DROP COLUMN "description",
DROP COLUMN "itemOrder",
DROP COLUMN "notes",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "value",
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "MaintenanceItemType" NOT NULL,
ADD COLUMN     "valueBoolean" BOOLEAN,
ADD COLUMN     "valueDate" TIMESTAMP(3),
ADD COLUMN     "valueJson" JSONB,
ADD COLUMN     "valueNumber" DOUBLE PRECISION,
ADD COLUMN     "valueText" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTemplate" DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" DROP COLUMN "description",
DROP COLUMN "itemOrder",
DROP COLUMN "title",
DROP COLUMN "unit",
DROP COLUMN "valueType",
ADD COLUMN     "helpText" TEXT,
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "MaintenanceItemType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "assignedToUserId",
DROP COLUMN "scheduledAt",
DROP COLUMN "siteId",
ADD COLUMN     "assignedTechnicianId" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "maintenanceTemplateId" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ALTER COLUMN "customerId" DROP NOT NULL;

-- DropTable
DROP TABLE "Attachment";

-- DropTable
DROP TABLE "Contact";

-- DropTable
DROP TABLE "EmergencyRequest";

-- DropTable
DROP TABLE "Site";

-- DropTable
DROP TABLE "UserCompany";

-- DropEnum
DROP TYPE "AttachmentOwnerType";

-- DropEnum
DROP TYPE "EmergencyRequestStatus";

-- DropEnum
DROP TYPE "MaintenanceItemStatus";

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

-- CreateIndex
CREATE INDEX "MaintenanceReportMaterial_reportId_sortOrder_idx" ON "MaintenanceReportMaterial"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "Asset_companyId_name_idx" ON "Asset"("companyId", "name");

-- CreateIndex
CREATE INDEX "Asset_customerId_idx" ON "Asset"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Customer_companyId_name_idx" ON "Customer"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReport_workOrderId_key" ON "MaintenanceReport"("workOrderId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_status_idx" ON "MaintenanceReport"("companyId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceReport_assignedTechnicianId_status_idx" ON "MaintenanceReport"("assignedTechnicianId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceReportItem_reportId_sortOrder_idx" ON "MaintenanceReportItem"("reportId", "sortOrder");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_companyId_isActive_idx" ON "MaintenanceTemplate"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "MaintenanceTemplateItem_templateId_sortOrder_idx" ON "MaintenanceTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_status_idx" ON "WorkOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedTechnicianId_status_idx" ON "WorkOrder"("assignedTechnicianId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_maintenanceTemplateId_idx" ON "WorkOrder"("maintenanceTemplateId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_code_idx" ON "WorkOrder"("companyId", "code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_maintenanceTemplateId_fkey" FOREIGN KEY ("maintenanceTemplateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
