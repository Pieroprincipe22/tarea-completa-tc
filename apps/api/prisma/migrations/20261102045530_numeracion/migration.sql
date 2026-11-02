-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "quotePrefix" TEXT NOT NULL DEFAULT 'P',
ADD COLUMN     "workOrderPrefix" TEXT NOT NULL DEFAULT 'OT';
