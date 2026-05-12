import { Test, TestingModule } from '@nestjs/testing';
import { StockOpnameController } from './stock-opname.controller';

describe('StockOpnameController', () => {
  let controller: StockOpnameController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockOpnameController],
    }).compile();

    controller = module.get<StockOpnameController>(StockOpnameController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
