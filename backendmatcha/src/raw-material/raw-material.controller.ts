import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RawMaterialService } from './raw-material.service';

@Controller('raw-materials')
export class RawMaterialController {
  constructor(private rawMaterialService: RawMaterialService) {}

  @Post()
  create(@Body() body: any) {
    return this.rawMaterialService.create(body);
  }

  @Get()
  findAll() {
    return this.rawMaterialService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.rawMaterialService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rawMaterialService.remove(id);
  }
}