/*
  Warnings:

  - A unique constraint covering the columns `[companyId,invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,code]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "WorkOrder_companyId_code_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_companyId_code_key" ON "WorkOrder"("companyId", "code");
