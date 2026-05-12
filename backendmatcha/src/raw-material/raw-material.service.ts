import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RawMaterialService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { name, unit, stock, cost } = data;

    if (stock <= 0) {
      throw new Error('Stock harus lebih dari 0');
    }

    const existing = await this.prisma.rawMaterial.findFirst({
      where: { name },
    });

    if (existing) {
      const newStock = existing.stock + stock;
      const newCost = existing.cost + cost;
      const newCostPerUnit = newCost / newStock;

      return this.prisma.rawMaterial.update({
        where: { id: existing.id },
        data: {
          stock: newStock,
          cost: newCost,
          costPerUnit: newCostPerUnit,
        },
      });
    }

    const costPerUnit = cost / stock;

    return this.prisma.rawMaterial.create({
      data: {
        name,
        unit,
        stock,
        cost,
        costPerUnit,
      },
    });
  }

  findAll() {
    return this.prisma.rawMaterial.findMany();
  }

  update(id: string, data: any) {
    const updateData: any = { ...data };

    if (data.cost !== undefined && data.stock !== undefined) {
      if (data.stock <= 0) {
        throw new Error('Stock harus lebih dari 0');
      }

      updateData.costPerUnit = data.cost / data.stock;
    }

    return this.prisma.rawMaterial.update({
      where: { id },
      data: updateData,
    });
  }

  remove(id: string) {
    return this.prisma.rawMaterial.delete({
      where: { id },
    });
  }
}