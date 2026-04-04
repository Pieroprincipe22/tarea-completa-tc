import { randomBytes, scryptSync } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DevUserDto } from './dto/dev-user.dto';

type DevUserResponse = {
  ok: true;
  companyId: string;
  userId: string;
  role: UserRole;
};

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

function resolveRole(input?: string): UserRole {
  const value = (input ?? 'ADMIN').trim().toUpperCase();

  if (value === 'ADMIN' || value === 'OWNER') return UserRole.ADMIN;
  if (value === 'TECHNICIAN' || value === 'TECNICO' || value === 'TÉCNICO') {
    return UserRole.TECHNICIAN;
  }

  throw new BadRequestException('role must be ADMIN or TECHNICIAN');
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async devUser(dto: DevUserDto): Promise<DevUserResponse> {
    const companyName = (dto.companyName ?? dto.company)?.trim();
    const email = (dto.email ?? dto.userEmail)?.trim().toLowerCase();
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

    return this.prisma.$transaction(async (tx) => {
      const existingCompany = await tx.company.findFirst({
        where: { name: companyName },
        select: { id: true },
      });

      const company =
        existingCompany ??
        (await tx.company.create({
          data: { name: companyName, isActive: true },
          select: { id: true },
        }));

      const createData: Prisma.UserCreateInput = {
        company: { connect: { id: company.id } },
        email,
        name,
        passwordHash: hashPassword(rawPassword || 'dev12345'),
        role,
        isActive: true,
      };

      const updateData: Prisma.UserUpdateInput = {
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
        select: { id: true },
      });

      await tx.userCompany.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        update: {
          role,
          active: true,
        },
        create: {
          userId: user.id,
          companyId: company.id,
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