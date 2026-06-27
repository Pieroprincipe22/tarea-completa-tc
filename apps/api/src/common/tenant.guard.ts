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

const ACCESS_COOKIE = 'tc_access';

type AccessTokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
};

type RequestWithTenant = {
  headers: Record<string, unknown>;
  cookies?: Record<string, unknown>;
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

// Lee una cookie directamente de la cabecera Cookie, sin depender de cookie-parser.
function readCookieFromHeader(cookieHeader: unknown, name: string): string {
  const raw = readHeader(cookieHeader);
  if (!raw) return '';

  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;

    const key = part.slice(0, eq).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }

  return '';
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

    // 1º cookie httpOnly (leída directo de la cabecera, sin depender de cookie-parser);
    // 2º req.cookies (si cookie-parser está activo); 3º header Authorization (compatibilidad).
    let token = readCookieFromHeader(req.headers.cookie, ACCESS_COOKIE);

    if (!token) {
      const cookieToken = req.cookies?.[ACCESS_COOKIE];
      if (typeof cookieToken === 'string') {
        token = cookieToken.trim();
      }
    }

    if (!token) {
      const authHeader = readHeader(req.headers.authorization);
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice('Bearer '.length).trim();
      }
    }

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