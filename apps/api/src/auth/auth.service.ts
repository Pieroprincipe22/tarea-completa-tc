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
      },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.companyId || !user.company) {
      throw new UnauthorizedException('User has no company assigned');
    }

    const company = user.company;

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName: company.name,
      role: user.role,
      companies: [
        {
          companyId: company.id,
          name: company.name,
          role: user.role,
        },
      ],
    };
  }
}