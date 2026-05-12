import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGateway } from './payment.gateway';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private paymentGateway: PaymentGateway,
  ) {}

  async createQR(amount: number) {
    const referenceId = `trx-${Date.now()}`;
    const secretKey = process.env.XENDIT_SECRET_KEY;

    if (!secretKey) {
      throw new Error('XENDIT_SECRET_KEY belum diisi di .env');
    }

    const response = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: referenceId,
        type: 'DYNAMIC',
        currency: 'IDR',
        amount,
      },
      {
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${secretKey}:`).toString('base64'),
          'api-version': '2022-07-31',
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      referenceId,
      qrString: response.data.qr_string,
      status: response.data.status,
      amount: response.data.amount,
    };
  }

  async handleXenditWebhook(data: any) {
    const referenceId = data.reference_id;
    const status = data.status;

    if (!referenceId) {
      throw new Error('reference_id tidak ditemukan');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        paymentReference: referenceId,
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
      throw new Error('Transaksi tidak ditemukan');
    }

    if (transaction.paymentStatus === 'PAID') {
      return {
        message: 'Transaksi sudah PAID',
        transaction,
      };
    }

    if (status !== 'SUCCEEDED' && status !== 'COMPLETED') {
      return {
        message: 'Status belum sukses',
        status,
      };
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { paymentStatus: 'PAID' },
    });

    await Promise.all(
      transaction.items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.qty,
            },
          },
        }),
      ),
    );

    await Promise.all(
      transaction.items.flatMap((item) =>
        item.product.recipes.map((recipe) =>
          this.prisma.rawMaterial.update({
            where: { id: recipe.rawMaterialId },
            data: {
              stock: {
                decrement: recipe.qty * item.qty,
              },
            },
          }),
        ),
      ),
    );

    await this.prisma.cashflow.create({
      data: {
        type: 'IN',
        amount: transaction.total,
        category: 'Penjualan QRIS',
        description: `Transaksi ${transaction.id} (QRIS Xendit)`,
      },
    });

    const updatedTransaction = await this.prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { items: true },
    });

    this.paymentGateway.sendPaymentUpdate({
      transactionId: transaction.id,
      status: 'PAID',
    });

    return {
      message: 'Pembayaran berhasil diproses',
      transaction: updatedTransaction,
    };
  }
}