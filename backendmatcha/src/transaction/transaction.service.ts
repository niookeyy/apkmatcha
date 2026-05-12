import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { items, paid, paymentMethod = 'CASH' } = data;

    let total = 0;

    const products = await Promise.all(
      items.map(async (item: any) => {
        const product = await this.prisma.product.findFirst({
          where: item.productCode
            ? { code: item.productCode }
            : { id: item.productId },
          include: {
            recipes: {
              include: {
                rawMaterial: true,
              },
            },
          },
        });

        if (!product) throw new Error('Product not found');
        if (product.stock < item.qty) throw new Error('Stock not enough');

        for (const recipe of product.recipes) {
          const needed = recipe.qty * item.qty;

          if (recipe.rawMaterial.stock < needed) {
            throw new Error(
              `Stok bahan baku ${recipe.rawMaterial.name} tidak cukup`,
            );
          }
        }

        const subtotal = product.price * item.qty;
        const profit = (product.price - product.cost) * item.qty;

        total += subtotal;

        return {
          product,
          qty: item.qty,
          price: product.price,
          subtotal,
          profit,
        };
      }),
    );

    let finalPaid = paid ?? 0;
    let change = 0;
    let paymentStatus = 'PAID';
    let paymentGateway: string | null = null;

    if (paymentMethod === 'CASH') {
      if (finalPaid < total) {
        throw new Error('Uang pembayaran kurang');
      }

      change = finalPaid - total;
    }

    if (paymentMethod === 'QRIS') {
      finalPaid = total;
      change = 0;
      paymentStatus = 'PAID';
      paymentGateway = 'MANUAL_QRIS';
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        total,
        paid: finalPaid,
        change,
        paymentMethod,
        paymentStatus,
        paymentGateway,
        items: {
          create: products.map((p) => ({
            productId: p.product.id,
            qty: p.qty,
            price: p.price,
            subtotal: p.subtotal,
            profit: p.profit,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await Promise.all(
      products.map((p) =>
        this.prisma.product.update({
          where: { id: p.product.id },
          data: {
            stock: {
              decrement: p.qty,
            },
          },
        }),
      ),
    );

    await Promise.all(
      products.flatMap((p) =>
        p.product.recipes.map((recipe) =>
          this.prisma.rawMaterial.update({
            where: { id: recipe.rawMaterialId },
            data: {
              stock: {
                decrement: recipe.qty * p.qty,
              },
            },
          }),
        ),
      ),
    );

    await this.prisma.cashflow.create({
      data: {
        type: 'IN',
        amount: total,
        category: 'Penjualan',
        description: `Transaksi ${transaction.id} (${paymentMethod})`,
      },
    });

    return transaction;
  }

  findAll() {
    return this.prisma.transaction.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async getStatus(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        total: true,
        paid: true,
        change: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentReference: true,
        paymentGateway: true,
        qrString: true,
        createdAt: true,
      },
    });
  }

  async receipt(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaksi tidak ditemukan');
    }

    return {
      storeName: process.env.STORE_NAME || 'Matchaboy',
      transactionId: transaction.id,
      date: transaction.createdAt,
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      items: transaction.items.map((item) => ({
        name: item.product.name,
        qty: item.qty,
        price: item.price,
        subtotal: item.subtotal,
      })),
      total: transaction.total,
      paid: transaction.paid,
      change: transaction.change,
      footer: 'Terima kasih sudah membeli 🍵',
    };
  }

  async receiptText(id: string) {
    const receipt = await this.receipt(id);
    const lineWidth = 32;

    const formatRupiah = (value: number) =>
      `Rp${Number(value || 0).toLocaleString('id-ID')}`;

    const formatLine = (left: string, right: string) => {
      const space = lineWidth - left.length - right.length;
      return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const lines = [
      receipt.storeName.toUpperCase(),
      '-'.repeat(lineWidth),
      `ID: ${receipt.transactionId.slice(0, 8)}`,
      new Date(receipt.date).toLocaleString('id-ID'),
      '-'.repeat(lineWidth),
    ];

    for (const item of receipt.items) {
      lines.push(item.name);

      const left = `${item.qty} x ${formatRupiah(item.price)}`;
      const right = formatRupiah(item.subtotal);

      lines.push(formatLine(left, right));
    }

    lines.push('-'.repeat(lineWidth));
    lines.push(formatLine('TOTAL', formatRupiah(receipt.total)));
    lines.push(formatLine('BAYAR', formatRupiah(receipt.paid)));
    lines.push(formatLine('KEMBALI', formatRupiah(receipt.change)));
    lines.push(`${receipt.paymentMethod} - ${receipt.paymentStatus}`);
    lines.push('-'.repeat(lineWidth));
    lines.push(receipt.footer);

    return lines.join('\n');
  }
}