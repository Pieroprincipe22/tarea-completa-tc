import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { scryptSync, timingSafeEqual } from 'node:crypto';

function verifyPassword(
  password: string,
  stored: string | null | undefined,
): boolean {
  if (!stored) return false;

  // Compatibilidad temporal con seeds viejas en texto plano.
  if (!stored.startsWith('scrypt:')) {
    return stored === password;
  }

  const [, salt, storedKeyHex] = stored.split(':');
  if (!salt || !storedKeyHex) return false;

  const derivedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(storedKeyHex, 'hex');

  if (derivedKey.length !== storedKey.length) return false;

  return timingSafeEqual(derivedKey, storedKey);
}

type LoginCompany = {
  companyId: string;
  name: string;
  role: UserRole;
};

type ActiveMembership = {
  companyId: string;
  role: UserRole;
  active: boolean;
  company: {
    id: string;
    name: string;
    isActive: boolean;
  };
};

type UserForLogin = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  companyId: string | null;
  role: UserRole | null;
  company: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  memberships: ActiveMembership[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async resolveActiveMemberships(
    user: UserForLogin,
  ): Promise<ActiveMembership[]> {
    const activeMemberships = user.memberships.filter(
      (membership) => membership.active && membership.company.isActive,
    );

    if (activeMemberships.length > 0) {
      return activeMemberships;
    }

    // Puente temporal:
    // si el usuario aún tiene companyId/role legacy pero no tiene UserCompany,
    // la creamos automáticamente una sola vez para no romper el login.
    if (!user.companyId || !user.role || !user.company?.isActive) {
      return [];
    }

    await this.prisma.userCompany.upsert({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: user.companyId,
        },
      },
      create: {
        userId: user.id,
        companyId: user.companyId,
        role: user.role,
        active: true,
      },
      update: {
        role: user.role,
        active: true,
      },
    });

    return this.prisma.userCompany.findMany({
      where: {
        userId: user.id,
        active: true,
        company: {
          isActive: true,
        },
      },
      select: {
        companyId: true,
        role: true,
        active: true,
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const rawPassword = password ?? '';

    const user: UserForLogin | null = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        isActive: true,
        companyId: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        memberships: {
          where: { active: true },
          select: {
            companyId: true,
            role: true,
            active: true,
            company: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (
      !user ||
      !user.isActive ||
      !verifyPassword(rawPassword, user.passwordHash)
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.resolveActiveMemberships(user);

    const companies: LoginCompany[] = memberships.map((membership) => ({
      companyId: membership.company.id,
      name: membership.company.name,
      role: membership.role,
    }));

    if (companies.length === 0) {
      throw new UnauthorizedException('User has no active company membership');
    }

    const primaryCompany = companies[0];

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '12h',
      userId: user.id,
      name: user.name,
      email: user.email,
      companyId: primaryCompany.companyId,
      companyName: primaryCompany.name,
      role: primaryCompany.role,
      companies,
    };
  }
}