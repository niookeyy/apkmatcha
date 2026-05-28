import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceiptSettingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting() {
    const existing = await this.prisma.receiptSetting.findFirst();

    if (existing) {
      return existing;
    }

    return this.prisma.receiptSetting.create({
      data: {
        storeName: 'Matchaboy',
        address: '',
        phone: '',
        cashierName: '',
        footer: 'Terima kasih sudah membeli ??',
        printerWidth: 32,
        showLogo: true,
        showAddress: true,
        showPhone: true,
      },
    });
  }

  async updateSetting(data: any) {
    const existing = await this.prisma.receiptSetting.findFirst();

    const payload = {
      storeName: data.storeName || 'Matchaboy',
      address: data.address || '',
      phone: data.phone || '',
      cashierName: data.cashierName || '',
      footer: data.footer || 'Terima kasih sudah membeli ??',
      printerWidth: Number(data.printerWidth || 32),
      showLogo: data.showLogo === false ? false : true,
      showAddress: data.showAddress === false ? false : true,
      showPhone: data.showPhone === false ? false : true,
    };

    if (!existing) {
      return this.prisma.receiptSetting.create({
        data: payload,
      });
    }

    return this.prisma.receiptSetting.update({
      where: {
        id: existing.id,
      },
      data: payload,
    });
  }
}
