import { BadRequestException } from '@nestjs/common';
import { PlanLimitsService } from '../common/plan-limits.service';
import { PrismaService } from '../database/prisma.service';
import { CustomersService } from './customers.service';

const NOW = new Date('2026-11-09T09:00:00.000Z');

function customerRow(data: Record<string, unknown>) {
  return {
    id: 'cust-1',
    companyId: 'company-1',
    name: 'Hotel Four Point',
    email: null,
    phone: null,
    address: null,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...data,
  };
}

function setup() {
  const tx = {
    customer: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(customerRow(data)),
      ),
    },
    site: {
      create: jest.fn(({ data }: { data: { name: string } }) =>
        Promise.resolve({ id: 'site-1', name: data.name }),
      ),
    },
  };
  const prisma = {
    $transaction: jest.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
  };
  const planLimits = { assertSiteLimit: jest.fn().mockResolvedValue(undefined) };
  const service = new CustomersService(
    prisma as unknown as PrismaService,
    planLimits as unknown as PlanLimitsService,
  );
  return { service, prisma, tx, planLimits };
}

describe('CustomersService.create', () => {
  it('da de alta solo el cliente cuando no viene hotel', async () => {
    const { service, tx, planLimits } = setup();

    const result = await service.create('company-1', {
      name: 'Hotel Four Point',
      email: 'mantenimiento@fourpoints.es',
      address: 'Av. Diagonal 161, Barcelona',
    });

    expect(planLimits.assertSiteLimit).not.toHaveBeenCalled();
    expect(tx.site.create).not.toHaveBeenCalled();
    expect(tx.customer.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        name: 'Hotel Four Point',
        email: 'mantenimiento@fourpoints.es',
        phone: null,
        address: 'Av. Diagonal 161, Barcelona',
        notes: null,
      },
    });
    expect(result.address).toBe('Av. Diagonal 161, Barcelona');
    expect(result.site).toBeNull();
  });

  it('da de alta el cliente y su primer hotel a la vez', async () => {
    const { service, prisma, tx, planLimits } = setup();

    const result = await service.create('company-1', {
      name: 'Hotel Four Point',
      site: {
        name: 'Four Points by Sheraton Barcelona',
        address: 'Av. Diagonal 161',
        city: 'Barcelona',
      },
    });

    expect(planLimits.assertSiteLimit).toHaveBeenCalledWith('company-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.site.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        customerId: 'cust-1',
        name: 'Four Points by Sheraton Barcelona',
        address: 'Av. Diagonal 161',
        city: 'Barcelona',
        notes: null,
      },
      select: { id: true, name: true },
    });
    expect(result.site).toEqual({ id: 'site-1', name: 'Four Points by Sheraton Barcelona' });
  });

  it('no crea nada si el plan ya no admite más hoteles', async () => {
    const { service, prisma, planLimits } = setup();
    planLimits.assertSiteLimit.mockRejectedValue(
      new BadRequestException('Tu plan FREE permite hasta 1 sedes.'),
    );

    await expect(
      service.create('company-1', { name: 'Hotel Four Point', site: { name: 'Four Points' } }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('exige empresa', async () => {
    const { service } = setup();

    await expect(service.create('  ', { name: 'Hotel Four Point' })).rejects.toThrow(
      BadRequestException,
    );
  });
});