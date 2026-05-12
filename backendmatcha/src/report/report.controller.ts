import { Controller, Get } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('summary')
  summary() {
    return this.reportService.summary();
  }

  @Get('today')
  today() {
    return this.reportService.today();
  }

  @Get('top-products')
  topProducts() {
    return this.reportService.topProducts();
  }

  @Get('profit-loss')
  profitLoss() {
    return this.reportService.profitLoss();
  }
}