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

type RequestWithTenant = {
  headers: Record<string, unknown>;
  tenant?: {
    companyId: string;
    companyName: string;
    userId: string;
    role: string;
    email: string | null;
    name: string | null;
  };
};

function readHeader(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first.trim() : '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

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

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithTenant>();

    const companyId = readHeader(req.headers['x-company-id']);
    if (!companyId) {
      throw new BadRequestException('Missing x-company-id');
    }

    const authHeader = readHeader(req.headers.authorization);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = typeof payload.sub === 'string' ? payload.sub.trim() : '';
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
      companyId: membership.company.id,
      companyName: membership.company.name,
      userId,
      role: membership.role,
      email: payload.email ?? null,
      name: payload.name ?? null,
    };

    return true;
  }
}