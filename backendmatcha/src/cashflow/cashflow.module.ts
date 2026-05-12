import { Module } from '@nestjs/common';
import { CashflowController } from './cashflow.controller';
import { CashflowService } from './cashflow.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CashflowController],
  providers: [CashflowService, PrismaService],
})
export class CashflowModule {}