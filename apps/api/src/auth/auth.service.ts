import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { scryptSync, timingSafeEqual } from 'node:crypto';

function verifyPassword(password: string, stored: string): boolean {
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async ensureMemberships(user: {
    id: string;
    companyId: string | null;
    role: UserRole | null;
    company: { id: string; name: string } | null;
    memberships: Array<{
      companyId: string;
      role: UserRole;
      company: { id: string; name: string };
    }>;
  }) {
    if (user.memberships.length > 0) {
      return user.memberships;
    }

    if (!user.companyId || !user.role || !user.company) {
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
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        memberships: {
          where: { active: true },
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.ensureMemberships(user);

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