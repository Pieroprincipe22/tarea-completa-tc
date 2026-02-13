import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceTemplatesService } from './maintenance-templates.service';
import { PrismaService } from '../database/prisma.service';

describe('MaintenanceTemplatesService', () => {
  let service: MaintenanceTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceTemplatesService,
        {
          provide: PrismaService,
          useValue: {
            maintenanceTemplate: {},
          },
        },
      ],
    }).compile();

    service = module.get<MaintenanceTemplatesService>(
      MaintenanceTemplatesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
