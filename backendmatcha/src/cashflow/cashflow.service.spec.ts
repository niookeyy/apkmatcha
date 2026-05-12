import { Test, TestingModule } from '@nestjs/testing';
import { CashflowService } from './cashflow.service';

describe('CashflowService', () => {
  let service: CashflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashflowService],
    }).compile();

    service = module.get<CashflowService>(CashflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
