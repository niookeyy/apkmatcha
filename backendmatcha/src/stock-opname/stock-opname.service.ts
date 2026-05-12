import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockOpnameService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { rawMaterialId, realStock, note } = data;

    const material = await this.prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId },
    });

    if (!material) throw new Error('Bahan baku tidak ditemukan');

    const systemStock = material.stock;
    const difference = realStock - systemStock;

    // update stok ke real
    await this.prisma.rawMaterial.update({
      where: { id: rawMaterialId },
      data: {
        stock: realStock,
      },
    });

    // simpan histori
    return this.prisma.stockOpname.create({
      data: {
        rawMaterialId,
        systemStock,
        realStock,
        difference,
        note,
      },
    });
  }

  findAll() {
    return this.prisma.stockOpname.findMany({
      include: {
        rawMaterial: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}