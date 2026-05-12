import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.recipe.create({ data });
  }

  findAll() {
    return this.prisma.recipe.findMany({
      include: {
        product: true,
        rawMaterial: true,
      },
    });
  }

  findByProduct(productId: string) {
    return this.prisma.recipe.findMany({
      where: { productId },
      include: {
        product: true,
        rawMaterial: true,
      },
    });
  }

  update(id: string, data: any) {
    return this.prisma.recipe.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.recipe.delete({
      where: { id },
    });
  }
}