import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssetsService } from './assets.service';

const SPACE = {
  id: 'r204',
  kind: 'ROOM',
  name: '204',
  floor: { name: 'Planta 2' },
};

function setup() {
  const prisma = {
    site: { findFirst: jest.fn().mockResolvedValue({ id: 's1', customerId: 'cu1' }) },
    space: { findFirst: jest.fn().mockResolvedValue(SPACE) },
    asset: {
      findFirst: jest.fn().mockResolvedValue({ id: 'a1', siteId: 's1' }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data })),
    },
  };
  const planLimits = { assertAssetLimit: jest.fn().mockResolvedValue(undefined) };
  const service = new AssetsService(prisma as never, planLimits as never);
  return { prisma, planLimits, service };
}

describe('AssetsService', () => {
  it('crea un equipo dentro de una habitación y guarda su ubicación', async () => {
    const { prisma, service } = setup();

    await service.create('c1', { siteId: 's1', spaceId: 'r204', name: 'Split', category: 'Split' });

    expect(prisma.space.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r204', companyId: 'c1', siteId: 's1' } }),
    );
    expect(prisma.asset.create.mock.calls[0][0].data).toMatchObject({
      companyId: 'c1',
      siteId: 's1',
      spaceId: 'r204',
      location: 'Planta 2 · Hab. 204',
    });
  });

  it('no deja meter un equipo en una habitación de otro sitio', async () => {
    const { prisma, service } = setup();
    prisma.space.findFirst.mockResolvedValue(null);

    await expect(
      service.create('c1', { siteId: 's1', spaceId: 'otra', name: 'Split' }),
    ).rejects.toThrow('La habitación o zona no es de este sitio.');
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });

  it('sin habitación, guarda la ubicación escrita a mano', async () => {
    const { prisma, service } = setup();

    await service.create('c1', { siteId: 's1', name: 'Enfriadora', location: 'Cubierta' });

    expect(prisma.space.findFirst).not.toHaveBeenCalled();
    expect(prisma.asset.create.mock.calls[0][0].data).toMatchObject({
      spaceId: null,
      location: 'Cubierta',
    });
  });

  it('mueve un equipo a otra habitación del mismo sitio', async () => {
    const { prisma, service } = setup();

    await service.update('c1', 'a1', { spaceId: 'r204' });

    expect(prisma.space.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r204', companyId: 'c1', siteId: 's1' } }),
    );
    expect(prisma.asset.update.mock.calls[0][0].data).toEqual({
      spaceId: 'r204',
      location: 'Planta 2 · Hab. 204',
    });
  });

  it('con spaceId null saca el equipo de su habitación', async () => {
    const { prisma, service } = setup();

    await service.update('c1', 'a1', { spaceId: null, brand: ' Daikin ' });

    expect(prisma.asset.update.mock.calls[0][0].data).toEqual({
      brand: 'Daikin',
      spaceId: null,
      location: null,
    });
  });

  it('no deja cambiar equipos de otra empresa', async () => {
    const { prisma, service } = setup();
    prisma.asset.findFirst.mockResolvedValue(null);

    await expect(service.update('c2', 'a1', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.asset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1', companyId: 'c2' } }),
    );
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it('respeta el límite de equipos del plan', async () => {
    const { planLimits, prisma, service } = setup();
    planLimits.assertAssetLimit.mockRejectedValue(
      new BadRequestException('Tu plan BASIC permite hasta 100 activos.'),
    );

    await expect(service.create('c1', { siteId: 's1', name: 'Split' })).rejects.toThrow(
      'Tu plan BASIC permite hasta 100 activos.',
    );
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });
});