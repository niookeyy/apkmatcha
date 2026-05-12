import { Test, TestingModule } from '@nestjs/testing';
import { RawMaterialController } from './raw-material.controller';

describe('RawMaterialController', () => {
  let controller: RawMaterialController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RawMaterialController],
    }).compile();

    controller = module.get<RawMaterialController>(RawMaterialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
