import { Controller, Post, Body, Get } from '@nestjs/common';
import { StockOpnameService } from './stock-opname.service';

@Controller('stock-opname')
export class StockOpnameController {
  constructor(private service: StockOpnameService) {}

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}