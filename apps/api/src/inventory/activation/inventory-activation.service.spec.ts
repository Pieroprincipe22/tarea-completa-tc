import { InventoryActivationService } from './inventory-activation.service';

describe('InventoryActivationService', () => {
  let prisma: {
    companyProduct: { findUnique: jest.Mock; upsert: jest.Mock; updateMany: jest.Mock };
  };
  let service: InventoryActivationService;

  beforeEach(() => {
    prisma = {
      companyProduct: { findUnique: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
    };
    service = new InventoryActivationService(prisma as never);
  });

  it('status devuelve desactivado si la empresa no tiene el producto', async () => {
    prisma.companyProduct.findUnique.mockResolvedValue(null);

    await expect(service.status('company-a', 'ADMIN')).resolves.toEqual({
      enabled: false,
      plan: null,
      role: 'ADMIN',
    });
    expect(prisma.companyProduct.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId_product: { companyId: 'company-a', product: 'INVENTORY' } },
      }),
    );
  });

  it('status devuelve el plan si está activo', async () => {
    prisma.companyProduct.findUnique.mockResolvedValue({ isActive: true, plan: 'PRO' });

    await expect(service.status('company-a', 'TECHNICIAN')).resolves.toEqual({
      enabled: true,
      plan: 'PRO',
      role: 'TECHNICIAN',
    });
  });

  it('activate hace upsert solo sobre la empresa del tenant', async () => {
    prisma.companyProduct.upsert.mockResolvedValue({ isActive: true, plan: 'BASIC' });

    await service.activate('company-a');

    const call = prisma.companyProduct.upsert.mock.calls[0][0];
    expect(call.where).toEqual({
      companyId_product: { companyId: 'company-a', product: 'INVENTORY' },
    });
    expect(call.create.companyId).toBe('company-a');
  });

  it('deactivate no borra datos, solo marca isActive = false', async () => {
    prisma.companyProduct.updateMany.mockResolvedValue({ count: 1 });

    await service.deactivate('company-a');

    expect(prisma.companyProduct.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'company-a', product: 'INVENTORY' },
      data: { isActive: false },
    });
  });
});
