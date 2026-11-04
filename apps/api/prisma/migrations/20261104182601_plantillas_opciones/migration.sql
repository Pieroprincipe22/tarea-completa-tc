-- AlterEnum
ALTER TYPE "MaintenanceItemType" ADD VALUE 'CHOICE';

-- AlterTable
ALTER TABLE "MaintenanceReportItem" ADD COLUMN     "maxValue" DOUBLE PRECISION,
ADD COLUMN     "minValue" DOUBLE PRECISION,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" ADD COLUMN     "options" JSONB;
