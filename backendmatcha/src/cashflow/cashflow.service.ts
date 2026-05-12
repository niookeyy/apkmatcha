import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashflowService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.cashflow.create({
      data,
    });
  }

  findAll() {
    return this.prisma.cashflow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async summary() {
    const cashflows = await this.prisma.cashflow.findMany();

    const totalIn = cashflows
      .filter((item) => item.type === 'IN')
      .reduce((sum, item) => sum + item.amount, 0);

    const totalOut = cashflows
      .filter((item) => item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    };
  }
}