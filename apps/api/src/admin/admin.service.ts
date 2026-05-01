import { randomBytes, scryptSync } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DevUserDto } from './dto/dev-user.dto';

type UserRoleValue = 'ADMIN' | 'TECHNICIAN' | 'SUPER_ADMIN';

type DevUserResponse = {
  ok: boolean;
  companyId: string;
  userId: string;
  role: UserRoleValue;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

function resolveRole(input?: string): UserRoleValue {
  const value = (input ?? 'ADMIN').trim().toUpperCase();

  if (value === 'SUPER_ADMIN' || value === 'SUPERADMIN') {
    return 'SUPER_ADMIN';
  }

  if (value === 'OWNER' || value === 'ADMIN') {
    return 'ADMIN';
  }

  if (
    value === 'TECHNICIAN' ||
    value === 'TECH' ||
    value === 'TECNICO' ||
    value === 'TÉCNICO'
  ) {
    return 'TECHNICIAN';
  }

  throw new BadRequestException(
    'role must be SUPER_ADMIN, ADMIN or TECHNICIAN',
  );
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async devUser(dto: DevUserDto): Promise<DevUserResponse> {
    const companyName = (dto.companyName ?? dto.company ?? '').trim();
    const email = (dto.email ?? dto.userEmail ?? '').trim().toLowerCase();
    const name = (dto.name ?? dto.userName ?? 'Dev User').trim();
    const role = resolveRole(dto.role);
    const rawPassword = dto.password?.trim();

    if (!companyName) {
      throw new BadRequestException(
        'DevUserDto must include companyName (or company)',
      );
    }

    if (!email) {
      throw new BadRequestException(
        'DevUserDto must include email (or userEmail)',
      );
    }

    if (!name) {
      throw new BadRequestException('DevUserDto must include a valid name');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const existingCompany = await tx.company.findFirst({
        where: {
          name: companyName,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

      const company = existingCompany
        ? await tx.company.update({
            where: { id: existingCompany.id },
            data: { isActive: true },
            select: { id: true },
          })
        : await tx.company.create({
            data: {
              name: companyName,
              isActive: true,
            },
            select: {
              id: true,
            },
          });

      const createData = {
        company: {
          connect: { id: company.id },
        },
        email,
        name,
        passwordHash: hashPassword(rawPassword || 'dev12345'),
        role,
        isActive: true,
      };

      const updateData: any = {
        company: {
          connect: { id: company.id },
        },
        name,
        role,
        isActive: true,
      };

      if (rawPassword) {
        updateData.passwordHash = hashPassword(rawPassword);
      }

      const user = await tx.user.upsert({
        where: { email },
        create: createData,
        update: updateData,
        select: {
          id: true,
        },
      });

      await tx.userCompany.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        create: {
          userId: user.id,
          companyId: company.id,
          role,
          active: true,
        },
        update: {
          role,
          active: true,
        },
      });

      return {
        ok: true,
        companyId: company.id,
        userId: user.id,
        role,
      };
    });
  }
}
