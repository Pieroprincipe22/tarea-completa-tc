import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceTemplatesController } from './maintenance-templates.controller';

describe('MaintenanceTemplatesController', () => {
  let controller: MaintenanceTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceTemplatesController],
    }).compile();

    controller = module.get<MaintenanceTemplatesController>(
      MaintenanceTemplatesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
