import { Body, Controller, Get, Put } from '@nestjs/common';
import { ReceiptSettingService } from './receipt-setting.service';

@Controller('receipt-settings')
export class ReceiptSettingController {
  constructor(private readonly service: ReceiptSettingService) {}

  @Get()
  getSetting() {
    return this.service.getSetting();
  }

  @Put()
  updateSetting(@Body() body: any) {
    return this.service.updateSetting(body);
  }
}
