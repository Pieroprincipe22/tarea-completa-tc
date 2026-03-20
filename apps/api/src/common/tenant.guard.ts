import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

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

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    const rawCompanyId = req.headers['x-company-id'];
    const rawUserId = req.headers['x-user-id'];

    const companyId = Array.isArray(rawCompanyId) ? rawCompanyId[0] : rawCompanyId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!companyId || !userId) {
      throw new BadRequestException('Missing x-company-id or x-user-id');
    }

    const membership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      select: {
        role: true,
        active: true,
      },
    });

    if (!membership || !membership.active) {
      throw new UnauthorizedException('No active membership for company');
    }

    req.tenant = {
      companyId,
      userId,
      role: membership.role,
    };

    return true;
  }
}