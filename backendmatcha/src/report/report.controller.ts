import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('summary')
  summary(@Query('range') range?: string) {
    return this.reportService.summary(range);
  }

  @Get('today')
  today() {
    return this.reportService.today();
  }

  @Get('top-products')
  topProducts(@Query('range') range?: string) {
    return this.reportService.topProducts(range);
  }

  @Get('profit-loss')
  profitLoss(@Query('range') range?: string) {
    return this.reportService.profitLoss(range);
  }
}