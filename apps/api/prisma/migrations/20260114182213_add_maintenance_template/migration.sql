/*
  Warnings:

  - You are about to drop the column `type` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MaintenanceTemplateItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[templateId,sortOrder]` on the table `MaintenanceTemplateItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `label` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sortOrder` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MaintenanceTemplateItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MaintenanceItemType" AS ENUM ('CHECK', 'NUMBER', 'TEXT', 'CHOICE');

-- DropForeignKey
ALTER TABLE "MaintenanceTemplate" DROP CONSTRAINT "MaintenanceTemplate_companyId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTemplateItem" DROP CONSTRAINT "MaintenanceTemplateItem_templateId_fkey";

-- DropIndex
DROP INDEX "MaintenanceTemplateItem_templateId_order_key";

-- AlterTable
ALTER TABLE "MaintenanceTemplate" DROP COLUMN "type",
DROP COLUMN "version",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "intervalDays" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" DROP COLUMN "kind",
DROP COLUMN "order",
DROP COLUMN "title",
ADD COLUMN     "hint" TEXT,
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "sortOrder" INTEGER NOT NULL,
ADD COLUMN     "type" "MaintenanceItemType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_archivedAt_idx" ON "MaintenanceTemplate"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTemplateItem_templateId_sortOrder_key" ON "MaintenanceTemplateItem"("templateId", "sortOrder");

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplateItem" ADD CONSTRAINT "MaintenanceTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
