-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AttachmentOwnerType" ADD VALUE 'INVOICE';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "existe" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MaintenanceReport" ADD COLUMN     "laborDays" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "MaintenanceReportMaterial" ADD COLUMN     "billable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pricedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalCost" DECIMAL(10,2),
ADD COLUMN     "unitCost" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "maintenanceReportId" TEXT,
    "invoiceNumber" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "laborAmount" DECIMAL(10,2),
    "materialsAmount" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2),
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "notes" TEXT,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "maintenanceReportMaterialId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(10,2),
    "lineTotal" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workOrderId_key" ON "Invoice"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_maintenanceReportId_key" ON "Invoice"("maintenanceReportId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_companyId_status_idx" ON "Invoice"("companyId", "status");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_sortOrder_idx" ON "InvoiceItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "InvoiceItem_maintenanceReportMaterialId_idx" ON "InvoiceItem"("maintenanceReportMaterialId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_maintenanceReportId_fkey" FOREIGN KEY ("maintenanceReportId") REFERENCES "MaintenanceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_maintenanceReportMaterialId_fkey" FOREIGN KEY ("maintenanceReportMaterialId") REFERENCES "MaintenanceReportMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
