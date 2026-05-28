import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@Body() body: any) {
    return this.transactionService.create(body);
  }

  @Get()
  findAll() {
    return this.transactionService.findAll();
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: any) {
    return this.transactionService.cancel(id, body?.reason);
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.transactionService.getStatus(id);
  }

  @Get(':id/receipt')
  receipt(@Param('id') id: string) {
    return this.transactionService.receipt(id);
  }

  @Get(':id/receipt-text')
  receiptText(@Param('id') id: string) {
    return this.transactionService.receiptText(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(id);
  }
}