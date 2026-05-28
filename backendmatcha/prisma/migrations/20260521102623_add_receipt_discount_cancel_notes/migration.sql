-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "queueNumber" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TransactionItem" ADD COLUMN     "addOns" JSONB,
ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "ReceiptSetting" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT 'Matchaboy',
    "address" TEXT,
    "phone" TEXT,
    "cashierName" TEXT,
    "footer" TEXT NOT NULL DEFAULT 'Terima kasih sudah membeli 🍵',
    "printerWidth" INTEGER NOT NULL DEFAULT 32,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptSetting_pkey" PRIMARY KEY ("id")
);
