/*
  Warnings:

  - The values [DRAFT] on the enum `WorkOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `criticality` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `installedAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `lastServiceAt` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `serial` on the `Asset` table. All the data in the column will be lost.
  - You are about to drop the column `createdByUserId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `mime` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `objectKey` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `originalName` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `finalizedAt` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `performedAt` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `templateDesc` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `templateName` on the `MaintenanceReport` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `resultNotes` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `resultValue` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `MaintenanceReportItem` table. All the data in the column will be lost.
  - The `status` column on the `MaintenanceReportItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `archivedAt` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `intervalDays` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `hint` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `createdByUserId` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `dueAt` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `WorkOrder` table. All the data in the column will be lost.
  - The `priority` column on the `WorkOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `CompanyCounter` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[reportId,itemOrder]` on the table `MaintenanceReportItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[templateId,itemOrder]` on the table `MaintenanceTemplateItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,companyId]` on the table `UserCompany` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileName` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `MaintenanceReport` table without a default value. This is not possible if the table is not empty.
  - Made the column `customerId` on table `MaintenanceReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `siteId` on table `MaintenanceReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `assetId` on table `MaintenanceReport` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `itemOrder` to the `MaintenanceReportItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `MaintenanceTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemOrder` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `role` on the `UserCompany` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `siteId` on table `WorkOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceReportStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceItemStatus" AS ENUM ('PENDING', 'OK', 'FAIL', 'NA');

-- CreateEnum
CREATE TYPE "EmergencyRequestStatus" AS ENUM ('OPEN', 'DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttachmentOwnerType" AS ENUM ('WORK_ORDER', 'REPORT', 'ASSET', 'EMERGENCY_REQUEST');

-- AlterEnum
BEGIN;
CREATE TYPE "WorkOrderStatus_new" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELLED');
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkOrder" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TYPE "WorkOrderStatus" RENAME TO "WorkOrderStatus_old";
ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";
DROP TYPE "public"."WorkOrderStatus_old";
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyCounter" DROP CONSTRAINT "CompanyCounter_companyId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_assetId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_customerId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceReport" DROP CONSTRAINT "MaintenanceReport_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_customerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_siteId_fkey";

-- DropIndex
DROP INDEX "Attachment_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "Attachment_companyId_entityType_entityId_idx";

-- DropIndex
DROP INDEX "Company_createdAt_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_assetId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_customerId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_performedAt_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_siteId_idx";

-- DropIndex
DROP INDEX "MaintenanceReport_companyId_templateId_idx";

-- DropIndex
DROP INDEX "MaintenanceReportItem_companyId_reportId_idx";

-- DropIndex
DROP INDEX "MaintenanceReportItem_reportId_sortOrder_key";

-- DropIndex
DROP INDEX "MaintenanceTemplate_archivedAt_idx";

-- DropIndex
DROP INDEX "MaintenanceTemplateItem_templateId_sortOrder_key";

-- DropIndex
DROP INDEX "UserCompany_companyId_userId_key";

-- DropIndex
DROP INDEX "WorkOrder_companyId_assetId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_assignedToUserId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_customerId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_number_key";

-- DropIndex
DROP INDEX "WorkOrder_companyId_siteId_idx";

-- DropIndex
DROP INDEX "WorkOrder_companyId_status_idx";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "criticality",
DROP COLUMN "installedAt",
DROP COLUMN "lastServiceAt",
DROP COLUMN "location",
DROP COLUMN "serial",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "installationAt" TIMESTAMP(3),
ADD COLUMN     "internalCode" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "Attachment" DROP COLUMN "createdByUserId",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "mime",
DROP COLUMN "objectKey",
DROP COLUMN "originalName",
DROP COLUMN "size",
DROP COLUMN "updatedAt",
ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "emergencyRequestId" TEXT,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "AttachmentOwnerType" NOT NULL,
ADD COLUMN     "reportId" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "workOrderId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceReport" DROP COLUMN "finalizedAt",
DROP COLUMN "performedAt",
DROP COLUMN "state",
DROP COLUMN "summary",
DROP COLUMN "templateDesc",
DROP COLUMN "templateName",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedByUserId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" "MaintenanceReportStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "workOrderId" TEXT,
ALTER COLUMN "createdByUserId" DROP NOT NULL,
ALTER COLUMN "customerId" SET NOT NULL,
ALTER COLUMN "siteId" SET NOT NULL,
ALTER COLUMN "assetId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceReportItem" DROP COLUMN "companyId",
DROP COLUMN "resultNotes",
DROP COLUMN "resultValue",
DROP COLUMN "sortOrder",
ADD COLUMN     "itemOrder" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "value" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "MaintenanceItemStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "MaintenanceTemplate" DROP COLUMN "archivedAt",
DROP COLUMN "intervalDays",
DROP COLUMN "name",
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" DROP COLUMN "hint",
DROP COLUMN "label",
DROP COLUMN "options",
DROP COLUMN "sortOrder",
DROP COLUMN "type",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "itemOrder" INTEGER NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "valueType" TEXT;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "UserCompany" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrder" DROP COLUMN "createdByUserId",
DROP COLUMN "dueAt",
DROP COLUMN "number",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
DROP COLUMN "priority",
ADD COLUMN     "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
ALTER COLUMN "siteId" SET NOT NULL;

-- DropTable
DROP TABLE "CompanyCounter";

-- DropEnum
DROP TYPE "AttachmentEntityType";

-- DropEnum
DROP TYPE "MaintenanceItemType";

-- DropEnum
DROP TYPE "MaintenanceReportItemStatus";

-- DropEnum
DROP TYPE "MaintenanceReportState";

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "assetId" TEXT,
    "assignedToUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EmergencyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'URGENT',
    "requestedByName" TEXT,
    "requestedByPhone" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyRequest_companyId_idx" ON "EmergencyRequest"("companyId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_customerId_idx" ON "EmergencyRequest"("customerId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_siteId_idx" ON "EmergencyRequest"("siteId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_assetId_idx" ON "EmergencyRequest"("assetId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_assignedToUserId_idx" ON "EmergencyRequest"("assignedToUserId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_status_idx" ON "EmergencyRequest"("status");

-- CreateIndex
CREATE INDEX "Attachment_companyId_idx" ON "Attachment"("companyId");

-- CreateIndex
CREATE INDEX "Attachment_ownerType_ownerId_idx" ON "Attachment"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Attachment_assetId_idx" ON "Attachment"("assetId");

-- CreateIndex
CREATE INDEX "Attachment_reportId_idx" ON "Attachment"("reportId");

-- CreateIndex
CREATE INDEX "Attachment_workOrderId_idx" ON "Attachment"("workOrderId");

-- CreateIndex
CREATE INDEX "Attachment_emergencyRequestId_idx" ON "Attachment"("emergencyRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_companyId_idx" ON "MaintenanceReport"("companyId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_customerId_idx" ON "MaintenanceReport"("customerId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_siteId_idx" ON "MaintenanceReport"("siteId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_assetId_idx" ON "MaintenanceReport"("assetId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_templateId_idx" ON "MaintenanceReport"("templateId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_workOrderId_idx" ON "MaintenanceReport"("workOrderId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_createdByUserId_idx" ON "MaintenanceReport"("createdByUserId");

-- CreateIndex
CREATE INDEX "MaintenanceReport_completedByUserId_idx" ON "MaintenanceReport"("completedByUserId");

-- CreateIndex
CREATE INDEX "MaintenanceReportItem_reportId_idx" ON "MaintenanceReportItem"("reportId");

-- CreateIndex
CREATE INDEX "MaintenanceReportItem_templateItemId_idx" ON "MaintenanceReportItem"("templateItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReportItem_reportId_itemOrder_key" ON "MaintenanceReportItem"("reportId", "itemOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTemplateItem_templateId_itemOrder_key" ON "MaintenanceTemplateItem"("templateId", "itemOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_userId_companyId_key" ON "UserCompany"("userId", "companyId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_idx" ON "WorkOrder"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_siteId_idx" ON "WorkOrder"("siteId");

-- CreateIndex
CREATE INDEX "WorkOrder_assetId_idx" ON "WorkOrder"("assetId");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedToUserId_idx" ON "WorkOrder"("assignedToUserId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceReportItem" ADD CONSTRAINT "MaintenanceReportItem_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "MaintenanceTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MaintenanceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "EmergencyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
