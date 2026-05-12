import { Test, TestingModule } from '@nestjs/testing';
import { StockOpnameService } from './stock-opname.service';

describe('StockOpnameService', () => {
  let service: StockOpnameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StockOpnameService],
    }).compile();

    service = module.get<StockOpnameService>(StockOpnameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
