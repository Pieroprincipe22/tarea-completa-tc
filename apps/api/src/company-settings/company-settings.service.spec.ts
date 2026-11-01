import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanySettingsService } from './company-settings.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    name: 'Clima Norte',
    legalName: null,
    taxId: null,
    addressLine: null,
    postalCode: null,
    city: null,
    province: null,
    country: 'España',
    phone: null,
    email: null,
    website: null,
    iban: null,
    defaultTaxRate: new Prisma.Decimal(21),
    logoKey: null,
    ...overrides,
  };
}

function setup() {
  const prisma = {
    company: {
      findUnique: jest.fn().mockResolvedValue(row()),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(row(data))),
    },
  };
  const storage = {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest.fn().mockResolvedValue('https://files/logo'),
  };
  const service = new CompanySettingsService(prisma as never, storage as never);
  return { prisma, storage, service };
}

describe('CompanySettingsService', () => {
  it('devuelve el IVA como número y sin la clave interna del logo', async () => {
    const { service } = setup();
    const view = await service.get('c1');
    expect(view.defaultTaxRate).toBe(21);
    expect(view).not.toHaveProperty('logoKey');
    expect(view.logoUrl).toBeNull();
  });

  it('solo cambia los campos que llegan y borra los que llegan a null', async () => {
    const { prisma, service } = setup();
    await service.update('c1', { legalName: 'Clima Norte S.L.', phone: null });
    expect(prisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { legalName: 'Clima Norte S.L.', phone: null },
      }),
    );
  });

  it('ignora un IVA vacío', async () => {
    const { prisma, service } = setup();
    await service.update('c1', { defaultTaxRate: null });
    expect(prisma.company.update.mock.calls[0][0].data).toEqual({});
  });

  it('rechaza un archivo que dice ser PNG pero no lo es', async () => {
    const { service, storage } = setup();
    const fake = { buffer: Buffer.from('<svg onload="alert(1)">'), mimetype: 'image/png' };
    await expect(service.uploadLogo('c1', fake as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('guarda el logo nuevo dentro de la carpeta de su empresa y borra el anterior', async () => {
    const { prisma, service, storage } = setup();
    prisma.company.findUnique.mockResolvedValue({ logoKey: 'companies/c1/branding/viejo.png' });

    const view = await service.uploadLogo('c1', { buffer: PNG, mimetype: 'image/png' } as never);

    const key = storage.putObject.mock.calls[0][0] as string;
    expect(key.startsWith('companies/c1/branding/logo-')).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
    expect(storage.deleteObject).toHaveBeenCalledWith('companies/c1/branding/viejo.png');
    expect(view.logoUrl).toBe('https://files/logo');
  });

  it('no falla si no puede borrar el logo anterior', async () => {
    const { prisma, service, storage } = setup();
    prisma.company.findUnique.mockResolvedValue({ logoKey: 'companies/c1/branding/viejo.png' });
    storage.deleteObject.mockRejectedValue(new Error('S3 caído'));

    await expect(
      service.uploadLogo('c1', { buffer: PNG, mimetype: 'image/png' } as never),
    ).resolves.toBeDefined();
  });
});