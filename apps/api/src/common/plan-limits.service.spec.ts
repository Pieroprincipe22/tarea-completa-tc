import { BadRequestException } from '@nestjs/common';
import { PlanLimitsService } from './plan-limits.service';

type PrismaMock = {
  company: { findUniqueOrThrow: jest.Mock };
  userCompany: { count: jest.Mock };
  site: { count: jest.Mock };
  asset: { count: jest.Mock };
  attachment: { aggregate: jest.Mock };
};

function makePrisma(): PrismaMock {
  return {
    company: { findUniqueOrThrow: jest.fn() },
    userCompany: { count: jest.fn() },
    site: { count: jest.fn() },
    asset: { count: jest.fn() },
    attachment: { aggregate: jest.fn() },
  };
}

const MB = 1024 * 1024;

describe('PlanLimitsService', () => {
  let prisma: PrismaMock;
  let service: PlanLimitsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PlanLimitsService(prisma as any);
  });

  describe('assertTechnicianLimit()', () => {
    it('rechaza al llegar al límite del plan BASIC (5)', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(5);

      await expect(service.assertTechnicianLimit('company-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('permite por debajo del límite', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(4);

      await expect(service.assertTechnicianLimit('company-1')).resolves.toBeUndefined();
    });

    it('respeta límites más altos en planes superiores', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'ENTERPRISE' });
      prisma.userCompany.count.mockResolvedValue(20);

      await expect(service.assertTechnicianLimit('company-1')).resolves.toBeUndefined();
    });
  });

  describe('assertAdminLimit()', () => {
    it('rechaza al llegar al límite del plan BASIC (2)', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(2);

      await expect(service.assertAdminLimit('company-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('permite por debajo del límite', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(1);

      await expect(service.assertAdminLimit('company-1')).resolves.toBeUndefined();
    });
  });

  describe('assertSiteLimit()', () => {
    it('rechaza al llegar al límite del plan BASIC (10)', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.site.count.mockResolvedValue(10);

      await expect(service.assertSiteLimit('company-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('permite por debajo del límite', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.site.count.mockResolvedValue(9);

      await expect(service.assertSiteLimit('company-1')).resolves.toBeUndefined();
    });
  });

  describe('assertAssetLimit()', () => {
    it('rechaza al llegar al límite del plan BASIC (100)', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.asset.count.mockResolvedValue(100);

      await expect(service.assertAssetLimit('company-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('permite por debajo del límite', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.asset.count.mockResolvedValue(99);

      await expect(service.assertAssetLimit('company-1')).resolves.toBeUndefined();
    });
  });

  describe('assertStorageLimit()', () => {
    it('rechaza si lo ya usado más lo entrante supera el límite del plan BASIC (500MB)', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.attachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: 499 * MB } });

      await expect(
        service.assertStorageLimit('company-1', 2 * MB),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite si cabe dentro del límite', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.attachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: 100 * MB } });

      await expect(
        service.assertStorageLimit('company-1', 50 * MB),
      ).resolves.toBeUndefined();
    });

    it('trata almacenamiento nulo (sin adjuntos aún) como cero', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.attachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: null } });

      await expect(
        service.assertStorageLimit('company-1', 10 * MB),
      ).resolves.toBeUndefined();
    });
  });

  describe('getUsage()', () => {
    it('devuelve el uso agregado y los límites del plan actual', async () => {
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'PRO' });
      prisma.userCompany.count
        .mockResolvedValueOnce(3) // technicians
        .mockResolvedValueOnce(2); // admins
      prisma.site.count.mockResolvedValue(5);
      prisma.asset.count.mockResolvedValue(40);
      prisma.attachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: 10 * MB } });

      const usage = await service.getUsage('company-1');

      expect(usage.plan).toBe('PRO');
      expect(usage.limits.maxTechnicians).toBe(10);
      expect(usage.usage).toEqual({
        technicians: 3,
        admins: 2,
        sites: 5,
        assets: 40,
        storageMb: 10,
      });
    });
  });
});
