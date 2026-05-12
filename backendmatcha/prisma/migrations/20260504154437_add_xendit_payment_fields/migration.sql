-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "paymentGateway" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
ADD COLUMN     "qrString" TEXT;
