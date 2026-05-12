import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const transactions = await this.prisma.transaction.findMany({
      include: {
        items: true,
      },
    });

    const totalSales = transactions.reduce((sum, trx) => sum + trx.total, 0);

    const totalProfit = transactions.reduce((sum, trx) => {
      const trxProfit = trx.items.reduce(
        (itemSum, item) => itemSum + item.profit,
        0,
      );
      return sum + trxProfit;
    }, 0);

    return {
      totalSales,
      totalProfit,
      totalTransactions: transactions.length,
    };
  }

  async today() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    });

    const totalSales = transactions.reduce((sum, trx) => sum + trx.total, 0);

    const totalProfit = transactions.reduce((sum, trx) => {
      const trxProfit = trx.items.reduce(
        (itemSum, item) => itemSum + item.profit,
        0,
      );
      return sum + trxProfit;
    }, 0);

    return {
      date: start.toISOString().split('T')[0],
      totalSales,
      totalProfit,
      totalTransactions: transactions.length,
    };
  }

  async topProducts() {
    const items = await this.prisma.transactionItem.findMany({
      include: {
        product: true,
      },
    });

    const map: any = {};

    items.forEach((item) => {
      if (!map[item.productId]) {
        map[item.productId] = {
          productId: item.productId,
          name: item.product.name,
          totalQty: 0,
          totalRevenue: 0,
        };
      }

      map[item.productId].totalQty += item.qty;
      map[item.productId].totalRevenue += item.subtotal;
    });

    return Object.values(map).sort(
      (a: any, b: any) => b.totalQty - a.totalQty,
    );
  }

  // 🔥 INI YANG DIPERBAIKI (MASUK KE DALAM CLASS)
  async profitLoss() {
    const transactions = await this.prisma.transaction.findMany({
      include: {
        items: true,
      },
    });

    const cashflows = await this.prisma.cashflow.findMany();

    const revenue = transactions.reduce((sum, trx) => sum + trx.total, 0);

    const cogs = transactions.reduce((sum, trx) => {
      const trxCogs = trx.items.reduce(
        (itemSum, item) =>
          itemSum + (item.subtotal - item.profit),
        0,
      );
      return sum + trxCogs;
    }, 0);

    const grossProfit = revenue - cogs;

    const expenses = cashflows
      .filter((item) => item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount, 0);

    const netProfit = grossProfit - expenses;

    return {
      revenue,
      cogs,
      grossProfit,
      expenses,
      netProfit,
    };
  }
}