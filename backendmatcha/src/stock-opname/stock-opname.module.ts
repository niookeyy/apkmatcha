import { Module } from '@nestjs/common';
import { StockOpnameController } from './stock-opname.controller';
import { StockOpnameService } from './stock-opname.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [StockOpnameController],
  providers: [StockOpnameService, PrismaService],
})
export class StockOpnameModule {}