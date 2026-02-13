import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Tenant, TenantRequest } from './tenant-context';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<TenantRequest>();

    const userId = req.header('x-user-id');
    const companyId = req.header('x-company-id');

    if (!userId || !companyId) {
      throw new ForbiddenException('Missing x-user-id or x-company-id');
    }

    const membership = await this.prisma.userCompany.findFirst({
      where: { userId, companyId },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this company');
    }

    const tenant: Tenant = { userId, companyId, role: membership.role };

    // 1) forma recomendada (un solo objeto)
    req.tenant = tenant;

    // 2) opcional: si ya estabas usando estos campos en algún lado, déjalos
    req.userId = userId;
    req.companyId = companyId;
    req.role = membership.role;

    return true;
  }
}
