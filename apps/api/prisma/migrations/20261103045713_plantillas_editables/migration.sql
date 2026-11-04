-- AlterTable
ALTER TABLE "MaintenanceTemplate" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTemplateItem" ADD COLUMN     "maxValue" DOUBLE PRECISION,
ADD COLUMN     "minValue" DOUBLE PRECISION,
ADD COLUMN     "section" TEXT;
