import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RecipeService } from './recipe.service';

@Controller('recipes')
export class RecipeController {
  constructor(private recipeService: RecipeService) {}

  @Post()
  create(@Body() body: any) {
    return this.recipeService.create(body);
  }

  @Get()
  findAll() {
    return this.recipeService.findAll();
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.recipeService.findByProduct(productId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.recipeService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recipeService.remove(id);
  }
}