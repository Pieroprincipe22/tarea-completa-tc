import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceTemplatesController } from './maintenance-templates.controller';
import { MaintenanceTemplatesService } from './maintenance-templates.service';

describe('MaintenanceTemplatesController', () => {
  let controller: MaintenanceTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceTemplatesController],
      providers: [{ provide: MaintenanceTemplatesService, useValue: {} }],
    }).compile();

    controller = module.get<MaintenanceTemplatesController>(
      MaintenanceTemplatesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
