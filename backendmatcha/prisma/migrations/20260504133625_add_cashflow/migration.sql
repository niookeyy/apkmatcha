-- CreateEnum
CREATE TYPE "CashflowType" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "Cashflow" (
    "id" TEXT NOT NULL,
    "type" "CashflowType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cashflow_pkey" PRIMARY KEY ("id")
);
