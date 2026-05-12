import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Post()
  create(@Body() body: any) {
    return this.transactionService.create(body);
  }

  @Get()
  findAll() {
    return this.transactionService.findAll();
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.transactionService.getStatus(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(id);
  }
  @Get(':id/receipt')
  receipt(@Param('id') id: string) {
    return this.transactionService.receipt(id);
  }
  @Get(':id/receipt-text')
  receiptText(@Param('id') id: string) {
    return this.transactionService.receiptText(id);
  }
}