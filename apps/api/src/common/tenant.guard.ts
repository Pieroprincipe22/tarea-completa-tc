import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';

type AccessTokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();

    const rawCompanyId = req.headers['x-company-id'];
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;

    const companyId =
      typeof rawCompanyId === 'string' ? rawCompanyId.trim() : '';

    if (!companyId) {
      throw new BadRequestException('Missing x-company-id');
    }

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(
        authHeader.slice('Bearer '.length),
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload.sub?.trim();

    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const membership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      select: {
        active: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!membership || !membership.active || !membership.company?.isActive) {
      throw new UnauthorizedException('No active membership for company');
    }

    req.headers['x-user-id'] = userId;
    req.tenant = {
      companyId,
      userId,
      role: membership.role,
      companyName: membership.company.name,
      email: payload.email ?? null,
      name: payload.name ?? null,
    };

    return true;
  }
}