import { Module } from '@nestjs/common';
import { RawMaterialController } from './raw-material.controller';
import { RawMaterialService } from './raw-material.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RawMaterialController],
  providers: [RawMaterialService, PrismaService],
})
export class RawMaterialModule {}