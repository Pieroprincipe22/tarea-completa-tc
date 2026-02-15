import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

type TenantInfo = { companyId: string; userId: string; role: string };
type TenantRequest = Request & { tenant?: TenantInfo };

function getHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<TenantRequest>();

    const companyId = getHeader(req, 'x-company-id');
    const userId = getHeader(req, 'x-user-id');

    if (!companyId || !userId) {
      throw new ForbiddenException('Missing x-company-id or x-user-id');
    }

    const membership = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this company');
    }

    req.tenant = { companyId, userId, role: String(membership.role) };
    return true;
  }
}
