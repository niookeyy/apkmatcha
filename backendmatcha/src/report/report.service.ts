import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Data di Supabase tersimpan UTC.
   * Pakai Date.UTC() agar tidak terpengaruh timezone server.
   */
  private getDateFrom(range?: string): Date | null {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    if (range === '1d') return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    if (range === '7d') return new Date(Date.UTC(y, m, d - 6, 0, 0, 0, 0));
    if (range === '30d') return new Date(Date.UTC(y, m, d - 29, 0, 0, 0, 0));
    if (range === '3m') return new Date(Date.UTC(y, m - 3, d, 0, 0, 0, 0));
    if (range === '12m') return new Date(Date.UTC(y, m - 12, d, 0, 0, 0, 0));

    return null; // 'all' → tidak ada filter tanggal
  }

  /**
   * Transaksi lama punya subtotal=0 karena field belum ada.
   * Fallback: kalau subtotal=0, pakai total.
   */
  private getSales(trx: { subtotal: number; total: number }): number {
    return trx.subtotal > 0 ? trx.subtotal : trx.total;
  }

  async summary(range?: string) {
    const dateFrom = this.getDateFrom(range);

    console.log(`[summary] range="${range}" dateFrom=${dateFrom?.toISOString() ?? 'null'}`);

    const where: any = { status: { not: 'CANCELLED' } };
    if (dateFrom) where.createdAt = { gte: dateFrom };

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: { items: true },
    });

    console.log(`[summary] found ${transactions.length} transactions`);

    const totalSales = transactions.reduce((sum, trx) => sum + this.getSales(trx), 0);
    const totalProfit = transactions.reduce((sum, trx) =>
      sum + trx.items.reduce((s, item) => s + item.profit, 0), 0);

    return { totalSales, totalProfit, totalTransactions: transactions.length };
  }

  async today() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

    console.log(`[today] start=${start.toISOString()} end=${end.toISOString()}`);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
      include: { items: true },
    });

    console.log(`[today] found ${transactions.length} transactions`);

    const totalSales = transactions.reduce((sum, trx) => sum + this.getSales(trx), 0);
    const totalProfit = transactions.reduce((sum, trx) =>
      sum + trx.items.reduce((s, item) => s + item.profit, 0), 0);

    return {
      date: start.toISOString().split('T')[0],
      totalSales,
      totalProfit,
      totalTransactions: transactions.length,
    };
  }

  async topProducts(range?: string) {
    const dateFrom = this.getDateFrom(range);

    console.log(`[topProducts] range="${range}" dateFrom=${dateFrom?.toISOString() ?? 'null'}`);

    const where: any = { transaction: { status: { not: 'CANCELLED' } } };
    if (dateFrom) {
      where.transaction = { ...where.transaction, createdAt: { gte: dateFrom } };
    }

    const items = await this.prisma.transactionItem.findMany({
      where,
      include: { product: true },
    });

    console.log(`[topProducts] found ${items.length} items`);

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

    return Object.values(map).sort((a: any, b: any) => b.totalQty - a.totalQty);
  }

  async profitLoss(range?: string) {
    const dateFrom = this.getDateFrom(range);

    console.log(`[profitLoss] range="${range}" dateFrom=${dateFrom?.toISOString() ?? 'null'}`);

    const txWhere: any = { status: { not: 'CANCELLED' } };
    const cfWhere: any = {};

    if (dateFrom) {
      txWhere.createdAt = { gte: dateFrom };
      cfWhere.createdAt = { gte: dateFrom };
    }

    const transactions = await this.prisma.transaction.findMany({
      where: txWhere,
      include: { items: true },
    });

    const cashflows = await this.prisma.cashflow.findMany({ where: cfWhere });

    console.log(`[profitLoss] found ${transactions.length} transactions, ${cashflows.length} cashflows`);

    const revenue = transactions.reduce((sum, trx) => sum + this.getSales(trx), 0);

    const cogs = transactions.reduce((sum, trx) =>
      sum + trx.items.reduce((s, item) => s + (item.subtotal - item.profit), 0), 0);

    const grossProfit = revenue - cogs;

    const expenses = cashflows
      .filter((item) => item.type === 'OUT')
      .reduce((sum, item) => sum + item.amount, 0);

    const netProfit = grossProfit - expenses;

    return { revenue, cogs, grossProfit, expenses, netProfit };
  }
}