/*
  Warnings:

  - A unique constraint covering the columns `[roundStopId]` on the table `MaintenanceReport` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PlanIntervalUnit" AS ENUM ('WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoundStopStatus" AS ENUM ('PENDING', 'DONE', 'NO_ACCESS');

-- AlterTable
ALTER TABLE "MaintenanceReport" ADD COLUMN     "roundStopId" TEXT;

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "every" INTEGER NOT NULL,
    "unit" "PlanIntervalUnit" NOT NULL DEFAULT 'MONTH',
    "startsOn" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "leadDays" INTEGER NOT NULL DEFAULT 7,
    "assignedTechnicianId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRound" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "planId" TEXT,
    "templateId" TEXT,
    "category" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundStop" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "assetId" TEXT,
    "spaceId" TEXT,
    "floorLevel" INTEGER,
    "floorName" TEXT,
    "spaceKind" "SpaceKind",
    "spaceName" TEXT,
    "assetName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "RoundStopStatus" NOT NULL DEFAULT 'PENDING',
    "noAccessReason" TEXT,
    "hasIssue" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenancePlan_companyId_isActive_nextDueAt_idx" ON "MaintenancePlan"("companyId", "isActive", "nextDueAt");

-- CreateIndex
CREATE INDEX "MaintenancePlan_siteId_idx" ON "MaintenancePlan"("siteId");

-- CreateIndex
CREATE INDEX "MaintenancePlan_templateId_idx" ON "MaintenancePlan"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRound_workOrderId_key" ON "MaintenanceRound"("workOrderId");

-- CreateIndex
CREATE INDEX "MaintenanceRound_companyId_status_idx" ON "MaintenanceRound"("companyId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceRound_siteId_dueAt_idx" ON "MaintenanceRound"("siteId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRound_planId_dueAt_key" ON "MaintenanceRound"("planId", "dueAt");

-- CreateIndex
CREATE INDEX "RoundStop_roundId_sortOrder_idx" ON "RoundStop"("roundId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoundStop_assetId_doneAt_idx" ON "RoundStop"("assetId", "doneAt");

-- CreateIndex
CREATE INDEX "RoundStop_companyId_idx" ON "RoundStop"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundStop_roundId_assetId_key" ON "RoundStop"("roundId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceReport_roundStopId_key" ON "MaintenanceReport"("roundStopId");

-- AddForeignKey
ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_roundStopId_fkey" FOREIGN KEY ("roundStopId") REFERENCES "RoundStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStop" ADD CONSTRAINT "RoundStop_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStop" ADD CONSTRAINT "RoundStop_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MaintenanceRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStop" ADD CONSTRAINT "RoundStop_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStop" ADD CONSTRAINT "RoundStop_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStop" ADD CONSTRAINT "RoundStop_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
