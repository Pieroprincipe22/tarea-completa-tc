import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { INVENTORY_PRODUCT } from './inventory.constants';

type RequestWithTenant = {
  tenant?: { companyId?: string };
};

/**
 * Deja pasar solo si la empresa del tenant tiene Inventorio activo en
 * CompanyProduct. Corre después de TenantGuard (global), que ya ha
 * comprobado el token y la membresía.
 */
@Injectable()
export class InventoryProductGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithTenant>();
    const companyId = req.tenant?.companyId?.trim();

    if (!companyId) {
      throw new ForbiddenException('No se pudo determinar la empresa.');
    }

    const product = await this.prisma.companyProduct.findUnique({
      where: {
        companyId_product: {
          companyId,
          product: INVENTORY_PRODUCT,
        },
      },
      select: { isActive: true },
    });

    if (!product?.isActive) {
      throw new ForbiddenException('Inventorio no está activado para esta empresa.');
    }

    return true;
  }
}
