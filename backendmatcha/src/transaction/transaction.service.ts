import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const {
      items,
      paid,
      paymentMethod = 'CASH',
      discount = 0,
      note = '',
      queueNumber,
    } = data;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Item transaksi wajib diisi');
    }

    let subtotal = 0;

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

        if (!product) {
          throw new NotFoundException('Produk tidak ditemukan');
        }

        const qty = Number(item.qty || 0);

        if (qty <= 0) {
          throw new BadRequestException('Qty produk harus lebih dari 0');
        }

        if (product.stock < qty) {
          throw new BadRequestException(`Stok ${product.name} tidak cukup`);
        }

        for (const recipe of product.recipes) {
          const needed = recipe.qty * qty;

          if (recipe.rawMaterial.stock < needed) {
            throw new BadRequestException(
              `Stok bahan baku ${recipe.rawMaterial.name} tidak cukup`,
            );
          }
        }

        const addOns = Array.isArray(item.addOns) ? item.addOns : [];

        const addOnTotal = addOns.reduce((sum: number, addOn: any) => {
          return sum + Number(addOn.price || 0);
        }, 0);

        const itemPrice = product.price + addOnTotal;
        const itemSubtotal = itemPrice * qty;
        const profit = (itemPrice - product.cost) * qty;

        subtotal += itemSubtotal;

        return {
          product,
          qty,
          price: itemPrice,
          subtotal: itemSubtotal,
          profit,
          note: item.note || null,
          addOns,
        };
      }),
    );

    const finalDiscount = Number(discount || 0);

    if (finalDiscount < 0) {
      throw new BadRequestException('Diskon tidak boleh minus');
    }

    if (finalDiscount > subtotal) {
      throw new BadRequestException('Diskon tidak boleh lebih besar dari subtotal');
    }

    const total = subtotal - finalDiscount;

    let finalPaid = Number(paid || 0);
    let change = 0;
    let paymentStatus = 'PAID';
    let status = 'COMPLETED';
    let paymentGateway: string | null = null;

    if (paymentMethod === 'CASH') {
      if (finalPaid < total) {
        throw new BadRequestException('Uang pembayaran kurang');
      }

      change = finalPaid - total;
    }

    if (paymentMethod === 'QRIS') {
      finalPaid = total;
      change = 0;
      paymentStatus = 'PAID';
      status = 'COMPLETED';
      paymentGateway = 'MANUAL_QRIS';
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await this.prisma.transaction.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const finalQueueNumber = queueNumber ? Number(queueNumber) : todayCount + 1;

    const transaction = await this.prisma.transaction.create({
      data: {
        subtotal,
        discount: finalDiscount,
        total,
        paid: finalPaid,
        change,
        paymentMethod,
        paymentStatus,
        paymentGateway,
        status,
        note,
        queueNumber: finalQueueNumber,
        items: {
          create: products.map((p) => ({
            productId: p.product.id,
            qty: p.qty,
            price: p.price,
            subtotal: p.subtotal,
            profit: p.profit,
            note: p.note,
            addOns: p.addOns,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    await Promise.all(
      products.map((p) =>
        this.prisma.product.update({
          where: {
            id: p.product.id,
          },
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
            where: {
              id: recipe.rawMaterialId,
            },
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
      where: {
        id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async cancel(id: string, reason?: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: {
        id,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                recipes: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    if (transaction.status === 'CANCELLED') {
      throw new BadRequestException('Transaksi sudah dibatalkan');
    }

    await Promise.all(
      transaction.items.map((item) =>
        this.prisma.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: item.qty,
            },
          },
        }),
      ),
    );

    await Promise.all(
      transaction.items.flatMap((item) =>
        item.product.recipes.map((recipe) =>
          this.prisma.rawMaterial.update({
            where: {
              id: recipe.rawMaterialId,
            },
            data: {
              stock: {
                increment: recipe.qty * item.qty,
              },
            },
          }),
        ),
      ),
    );

    await this.prisma.cashflow.create({
      data: {
        type: 'OUT',
        amount: transaction.total,
        category: 'Pembatalan Transaksi',
        description: `Pembatalan transaksi ${transaction.id}. ${reason || ''}`,
      },
    });

    return this.prisma.transaction.update({
      where: {
        id,
      },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'CANCELLED',
        cancelReason: reason || null,
        cancelledAt: new Date(),
      },
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
      where: {
        id,
      },
      select: {
        id: true,
        subtotal: true,
        discount: true,
        total: true,
        paid: true,
        change: true,
        queueNumber: true,
        note: true,
        status: true,
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
      where: {
        id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    const setting = await this.prisma.receiptSetting.findFirst();

    return {
      storeName: setting?.storeName || process.env.STORE_NAME || 'Matchaboy',
      address: setting?.address || '',
      phone: setting?.phone || '',
      cashierName: setting?.cashierName || '',
      footer: setting?.footer || 'Terima kasih sudah membeli 🍵',
      printerWidth: setting?.printerWidth || 32,
      showAddress: setting?.showAddress ?? true,
      showPhone: setting?.showPhone ?? true,
      transactionId: transaction.id,
      queueNumber: transaction.queueNumber,
      date: transaction.createdAt,
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      status: transaction.status,
      note: transaction.note,
      subtotal: transaction.subtotal,
      discount: transaction.discount,
      total: transaction.total,
      paid: transaction.paid,
      change: transaction.change,
      items: transaction.items.map((item) => ({
        name: item.product.name,
        qty: item.qty,
        price: item.price,
        subtotal: item.subtotal,
        note: item.note,
        addOns: item.addOns,
      })),
    };
  }

  async receiptText(id: string) {
    const receipt = await this.receipt(id);
    const lineWidth = Number(receipt.printerWidth || 32);

    const formatRupiah = (value: number) =>
      `Rp${Number(value || 0).toLocaleString('id-ID')}`;

    const center = (text: string) => {
      const clean = text || '';
      const space = Math.max(0, Math.floor((lineWidth - clean.length) / 2));
      return ' '.repeat(space) + clean;
    };

    const formatLine = (left: string, right: string) => {
      const space = lineWidth - left.length - right.length;
      return left + ' '.repeat(Math.max(1, space)) + right;
    };

    const lines = [center(receipt.storeName.toUpperCase())];

    if (receipt.showAddress && receipt.address) {
      lines.push(center(receipt.address));
    }

    if (receipt.showPhone && receipt.phone) {
      lines.push(center(receipt.phone));
    }

    lines.push('-'.repeat(lineWidth));

    if (receipt.queueNumber) {
      lines.push(center(`NO ANTRIAN: ${receipt.queueNumber}`));
      lines.push('-'.repeat(lineWidth));
    }

    lines.push(`ID: ${receipt.transactionId.slice(0, 8)}`);
    lines.push(new Date(receipt.date).toLocaleString('id-ID'));

    if (receipt.cashierName) {
      lines.push(`Kasir: ${receipt.cashierName}`);
    }

    lines.push('-'.repeat(lineWidth));

    for (const item of receipt.items) {
      lines.push(item.name);

      const left = `${item.qty} x ${formatRupiah(item.price)}`;
      const right = formatRupiah(item.subtotal);

      lines.push(formatLine(left, right));

      if (item.note) {
        lines.push(`Catatan: ${item.note}`);
      }

      if (Array.isArray(item.addOns) && item.addOns.length > 0) {
        item.addOns.forEach((addOn: any) => {
          lines.push(`+ ${addOn.name} ${formatRupiah(addOn.price)}`);
        });
      }
    }

    if (receipt.note) {
      lines.push('-'.repeat(lineWidth));
      lines.push(`Note: ${receipt.note}`);
    }

    lines.push('-'.repeat(lineWidth));
    lines.push(formatLine('SUBTOTAL', formatRupiah(receipt.subtotal)));

    if (receipt.discount > 0) {
      lines.push(formatLine('DISKON', `-${formatRupiah(receipt.discount)}`));
    }

    lines.push(formatLine('TOTAL', formatRupiah(receipt.total)));
    lines.push(formatLine('BAYAR', formatRupiah(receipt.paid)));
    lines.push(formatLine('KEMBALI', formatRupiah(receipt.change)));
    lines.push(`${receipt.paymentMethod} - ${receipt.paymentStatus}`);

    if (receipt.status === 'CANCELLED') {
      lines.push('STATUS: CANCELLED');
    }

    lines.push('-'.repeat(lineWidth));
    lines.push(center(receipt.footer));

    return lines.join('\n');
  }
}