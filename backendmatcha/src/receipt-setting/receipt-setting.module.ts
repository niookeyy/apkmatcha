import { Module } from '@nestjs/common';
import { ReceiptSettingController } from './receipt-setting.controller';
import { ReceiptSettingService } from './receipt-setting.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ReceiptSettingController],
  providers: [ReceiptSettingService, PrismaService],
})
export class ReceiptSettingModule {}
