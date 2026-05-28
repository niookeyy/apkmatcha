import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReceiptSettingModule } from './receipt-setting/receipt-setting.module';
import { ProductModule } from './product/product.module';
import { PrismaService } from './prisma/prisma.service';
import { TransactionModule } from './transaction/transaction.module';
import { ReportModule } from './report/report.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RawMaterialModule } from './raw-material/raw-material.module';
import { RecipeModule } from './recipe/recipe.module';
import { StockOpnameModule } from './stock-opname/stock-opname.module';
import { CashflowModule } from './cashflow/cashflow.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 🔥 penting
    }),
    ProductModule,
    TransactionModule,
    ReportModule,
    AuthModule,
    UserModule,
    RawMaterialModule,
    RecipeModule,
    StockOpnameModule,
    CashflowModule,
    PaymentModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}