import { Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

    const companies = user.memberships.map((membership) => ({
      companyId: membership.company.id,
      name: membership.company.name,
      role: membership.role,
    }));

    if (
      companies.length === 0 &&
      user.companyId &&
      user.company &&
      user.role
    ) {
      companies.push({
        companyId: user.company.id,
        name: user.company.name,
        role: user.role,
      });
    }

    if (companies.length === 0) {
      throw new UnauthorizedException('User has no active company membership');
    }

    const primaryCompany = companies[0];

    return {
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