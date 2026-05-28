import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
        isActive: data.isActive ?? true,
      },
    });
  }

  async createWithRecipe(data: any) {
    const { name, price, imageUrl, ingredients } = data;

    if (!name) {
      throw new BadRequestException('Nama produk wajib diisi');
    }

    if (!price || Number(price) <= 0) {
      throw new BadRequestException('Harga produk wajib lebih dari 0');
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      throw new BadRequestException('Resep bahan baku wajib diisi');
    }

    let totalCost = 0;

    const rawMaterials = await Promise.all(
      ingredients.map(async (item: any) => {
        if (!item.rawMaterialName || !item.qty || Number(item.qty) <= 0) {
          throw new BadRequestException('Nama bahan baku dan qty wajib diisi');
        }

        const rawMaterial = await this.prisma.rawMaterial.findFirst({
          where: {
            name: item.rawMaterialName,
          },
        });

        if (!rawMaterial) {
          throw new NotFoundException(
            `Bahan baku ${item.rawMaterialName} tidak ditemukan`,
          );
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
        isActive: true,
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
        _count: {
          select: {
            transactionItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findActive() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
      },
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
        _count: {
          select: {
            transactionItems: true,
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

    if (data.isActive !== undefined) {
      updateData.isActive =
        data.isActive === true ||
        data.isActive === 'true' ||
        data.isActive === 1 ||
        data.isActive === '1';
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async deactivate(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (product.isActive === false) {
      return product;
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async activate(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (product.isActive === true) {
      return product;
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: true,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recipes: true,
            transactionItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (product._count.transactionItems > 0) {
      throw new BadRequestException(
        'Produk tidak bisa dihapus karena sudah pernah dipakai di transaksi. Gunakan fitur Nonaktifkan Produk agar riwayat transaksi dan laporan tetap aman.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.recipe.deleteMany({
        where: {
          productId: id,
        },
      });

      return tx.product.delete({
        where: { id },
      });
    });
  }
}