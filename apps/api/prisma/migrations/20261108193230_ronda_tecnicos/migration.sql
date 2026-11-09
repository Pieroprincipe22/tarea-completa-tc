-- AlterEnum
ALTER TYPE "RoundStatus" ADD VALUE 'SUBMITTED';

-- AlterTable
ALTER TABLE "MaintenanceRound" ADD COLUMN     "returnNote" TEXT,
ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedById" TEXT;

-- AlterTable
ALTER TABLE "RoundStop" ADD COLUMN     "savedAt" TIMESTAMP(3),
ADD COLUMN     "urgent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RoundStopPart" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundStopPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderTechnician" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlanTechnician" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenancePlanTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundStopPart_stopId_sortOrder_idx" ON "RoundStopPart"("stopId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoundStopPart_companyId_idx" ON "RoundStopPart"("companyId");

-- CreateIndex
CREATE INDEX "WorkOrderTechnician_userId_idx" ON "WorkOrderTechnician"("userId");

-- CreateIndex
CREATE INDEX "WorkOrderTechnician_companyId_idx" ON "WorkOrderTechnician"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderTechnician_workOrderId_userId_key" ON "WorkOrderTechnician"("workOrderId", "userId");

-- CreateIndex
CREATE INDEX "MaintenancePlanTechnician_userId_idx" ON "MaintenancePlanTechnician"("userId");

-- CreateIndex
CREATE INDEX "MaintenancePlanTechnician_companyId_idx" ON "MaintenancePlanTechnician"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePlanTechnician_planId_userId_key" ON "MaintenancePlanTechnician"("planId", "userId");

-- AddForeignKey
ALTER TABLE "MaintenanceRound" ADD CONSTRAINT "MaintenanceRound_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStopPart" ADD CONSTRAINT "RoundStopPart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundStopPart" ADD CONSTRAINT "RoundStopPart_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "RoundStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTechnician" ADD CONSTRAINT "WorkOrderTechnician_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTechnician" ADD CONSTRAINT "WorkOrderTechnician_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTechnician" ADD CONSTRAINT "WorkOrderTechnician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlanTechnician" ADD CONSTRAINT "MaintenancePlanTechnician_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlanTechnician" ADD CONSTRAINT "MaintenancePlanTechnician_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlanTechnician" ADD CONSTRAINT "MaintenancePlanTechnician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
