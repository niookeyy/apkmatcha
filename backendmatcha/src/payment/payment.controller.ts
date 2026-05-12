import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('qris')
  createQR(@Body() body: any) {
    return this.paymentService.createQR(body.amount);
  }

  @Post('xendit/webhook')
  handleWebhook(@Body() body: any) {
    return this.paymentService.handleXenditWebhook(body);
  }
  
}