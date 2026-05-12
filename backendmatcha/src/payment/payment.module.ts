import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGateway } from './payment.gateway';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, PrismaService, PaymentGateway],
  exports: [PaymentService],
})

export class PaymentModule {}