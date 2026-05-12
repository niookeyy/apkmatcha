import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  private generateBaseCode(name: string) {
    return name
      .split(' ')
      .map((word) => word[0]?.toUpperCase())
      .join('');
  }

  async create(data: any) {
    const baseCode = this.generateBaseCode(data.name);

    const existingProducts = await this.prisma.product.findMany({
      where: {
        code: {
          startsWith: baseCode,
        },
      },
    });

    let code = baseCode;

    if (existingProducts.length > 0) {
      code = `${baseCode}${existingProducts.length}`;
    }

    return this.prisma.product.create({
      data: {
        ...data,
        imageUrl: data.imageUrl || null,
        code,
      },
    });
  }

  async createWithRecipe(data: any) {
    const { name, price, imageUrl, ingredients } = data;

    if (!name) {
      throw new Error('Nama produk wajib diisi');
    }

    if (!price || Number(price) <= 0) {
      throw new Error('Harga produk wajib lebih dari 0');
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error('Resep bahan baku wajib diisi');
    }

    let totalCost = 0;

    const rawMaterials = await Promise.all(
      ingredients.map(async (item: any) => {
        if (!item.rawMaterialName || !item.qty || Number(item.qty) <= 0) {
          throw new Error('Nama bahan baku dan qty wajib diisi');
        }

        const rawMaterial = await this.prisma.rawMaterial.findFirst({
          where: {
            name: item.rawMaterialName,
          },
        });

        if (!rawMaterial) {
          throw new Error(`Bahan baku ${item.rawMaterialName} tidak ditemukan`);
        }

        const qty = Number(item.qty);
        const ingredientCost = Math.round(rawMaterial.costPerUnit * qty);

        totalCost += ingredientCost;

        const possibleStock = Math.floor(rawMaterial.stock / qty);

        return {
          rawMaterial,
          qty,
          possibleStock,
        };
      }),
    );

    const stock =
      rawMaterials.length > 0
        ? Math.min(...rawMaterials.map((item) => item.possibleStock))
        : 0;

    const baseCode = this.generateBaseCode(name);

    const existingProducts = await this.prisma.product.findMany({
      where: {
        code: {
          startsWith: baseCode,
        },
      },
    });

    let code = baseCode;

    if (existingProducts.length > 0) {
      code = `${baseCode}${existingProducts.length}`;
    }

    const product = await this.prisma.product.create({
      data: {
        name,
        code,
        price: Number(price),
        cost: totalCost,
        stock,
        imageUrl: imageUrl || null,
        recipes: {
          create: rawMaterials.map((item) => ({
            rawMaterialId: item.rawMaterial.id,
            qty: item.qty,
          })),
        },
      },
      include: {
        recipes: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    return {
      ...product,
      suggestedPrice: totalCost + 6000,
    };
  }

  findAll() {
    return this.prisma.product.findMany({
      include: {
        recipes: {
          include: {
            rawMaterial: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        recipes: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });
  }

  update(id: string, data: any) {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.cost !== undefined) updateData.cost = Number(data.cost);
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}