import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InventoryProductGuard } from './inventory-product.guard';

function makeContext(tenant?: { companyId?: string }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ tenant }),
    }),
  } as unknown as ExecutionContext;
}

describe('InventoryProductGuard', () => {
  let prisma: { companyProduct: { findUnique: jest.Mock } };
  let guard: InventoryProductGuard;

  beforeEach(() => {
    prisma = { companyProduct: { findUnique: jest.fn() } };
    guard = new InventoryProductGuard(prisma as never);
  });

  it('deja pasar si la empresa tiene Inventorio activo', async () => {
    prisma.companyProduct.findUnique.mockResolvedValue({ isActive: true });

    await expect(guard.canActivate(makeContext({ companyId: 'company-a' }))).resolves.toBe(true);
    expect(prisma.companyProduct.findUnique).toHaveBeenCalledWith({
      where: { companyId_product: { companyId: 'company-a', product: 'INVENTORY' } },
      select: { isActive: true },
    });
  });

  it('bloquea si la empresa no tiene Inventorio contratado', async () => {
    prisma.companyProduct.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(makeContext({ companyId: 'company-a' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('bloquea si Inventorio está desactivado', async () => {
    prisma.companyProduct.findUnique.mockResolvedValue({ isActive: false });

    await expect(guard.canActivate(makeContext({ companyId: 'company-a' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('bloquea si no hay tenant resuelto', async () => {
    await expect(guard.canActivate(makeContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.companyProduct.findUnique).not.toHaveBeenCalled();
  });
});
