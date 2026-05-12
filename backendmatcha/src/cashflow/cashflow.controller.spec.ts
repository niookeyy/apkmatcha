import { Test, TestingModule } from '@nestjs/testing';
import { CashflowController } from './cashflow.controller';

describe('CashflowController', () => {
  let controller: CashflowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashflowController],
    }).compile();

    controller = module.get<CashflowController>(CashflowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
