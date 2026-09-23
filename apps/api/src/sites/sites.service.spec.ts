import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { PrismaService } from '../database/prisma.service';
import { PlanLimitsService } from '../common/plan-limits.service';

describe('SitesService', () => {
  let service: SitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        PrismaService,
        { provide: PlanLimitsService, useValue: { assertSiteLimit: jest.fn() } },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
