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
  method?: string;
  url?: string;
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

    if (membership && membership.active && membership.company?.isActive) {
      // Camino normal: el usuario tiene membresía activa en la empresa pedida.
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

    // Bypass de plataforma: un SUPER_ADMIN puede operar sobre cualquier
    // empresa activa aunque no tenga membresía en ella.
    //
    // Alcance (decisión explícita): como TenantGuard es un guard GLOBAL
    // (ver main.ts), este bypass aplica a TODOS los endpoints tenant-aware,
    // no solo a los de configuración de empresa. Es decir, un SUPER_ADMIN
    // puede leer y escribir cualquier recurso de cualquier empresa activa
    // con solo poner el header x-company-id, exactamente igual que si
    // fuera ADMIN de esa empresa. Es el mecanismo que usa el panel de
    // super-admin para gestionar empresas ajenas (ver /super-admin).
    //
    // Por el alcance tan amplio, cada vez que se activa queda registrado
    // en AuditLog (ver bloque más abajo) para poder auditar quién entró
    // a qué empresa y cuándo.
    const superAdminMembership = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        role: 'SUPER_ADMIN',
        active: true,
        company: {
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (superAdminMembership) {
      const targetCompany = await this.prisma.company.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

      if (!targetCompany || !targetCompany.isActive) {
        throw new UnauthorizedException('Empresa no encontrada o inactiva');
      }

      req.headers['x-user-id'] = userId;

      req.tenant = {
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        userId,
        role: 'SUPER_ADMIN',
        email: payload.email ?? null,
        name: payload.name ?? null,
      };

      // Fire-and-forget: un fallo al auditar nunca debe bloquear a un
      // super-admin legítimo. No usamos await bloqueante a propósito.
      this.prisma.auditLog
        .create({
          data: {
            actorUserId: userId,
            action: 'SUPER_ADMIN_BYPASS',
            companyId: targetCompany.id,
            targetPath: `${req.method ?? '?'} ${req.url ?? '?'}`,
          },
        })
        .catch(() => {
          // Ignorado a propósito: ver comentario de arriba.
        });

      return true;
    }

    throw new UnauthorizedException('No active membership for company');
  }
}