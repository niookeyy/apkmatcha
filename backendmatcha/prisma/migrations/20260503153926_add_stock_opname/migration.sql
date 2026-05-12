-- CreateTable
CREATE TABLE "StockOpname" (
    "id" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "systemStock" DOUBLE PRECISION NOT NULL,
    "realStock" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockOpname_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StockOpname" ADD CONSTRAINT "StockOpname_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
