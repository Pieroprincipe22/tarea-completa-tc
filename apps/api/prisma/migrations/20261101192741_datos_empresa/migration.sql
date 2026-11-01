-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'España',
ADD COLUMN     "defaultTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 21,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "logoKey" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "website" TEXT;
