import { Controller, Get, Post, Body } from '@nestjs/common';
import { CashflowService } from './cashflow.service';

@Controller('cashflow')
export class CashflowController {
  constructor(private cashflowService: CashflowService) {}

  @Post()
  create(@Body() body: any) {
    return this.cashflowService.create(body);
  }

  @Get()
  findAll() {
    return this.cashflowService.findAll();
  }

  @Get('summary')
  summary() {
    return this.cashflowService.summary();
  }
}