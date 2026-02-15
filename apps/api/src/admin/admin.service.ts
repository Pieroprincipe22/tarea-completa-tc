import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DevUserDto } from './dto/dev-user.dto';

type DevUserResponse = {
  ok: true;
  companyId: string;
  userId: string;
  role: string;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async devUser(dto: DevUserDto): Promise<DevUserResponse> {
    const companyName = (dto.companyName ?? dto.company)?.trim();
    const email = (dto.email ?? dto.userEmail)?.trim();
    const name = (dto.name ?? dto.userName ?? 'Dev User').trim();

    if (!companyName) {
      throw new BadRequestException(
        'DevUserDto must include companyName (or company)',
      );
    }
    if (!email) {
      throw new BadRequestException('DevUserDto must include email (or userEmail)');
    }

    // Role: lo casteamos al tipo que Prisma espera para UserCompany.role
    const role =
      (dto.role ?? 'OWNER') as unknown as Prisma.UserCompanyCreateInput['role'];

    // ✅ password obligatorio en tu schema: si no mandas, ponemos uno dev
    const password = (dto.password ?? 'dev12345').trim();

    return this.prisma.$transaction(async (tx) => {
      // 1) Company: buscar por nombre o crear
      const company =
        (await tx.company.findFirst({
          where: { name: companyName },
          select: { id: true },
        })) ??
        (await tx.company.create({
          data: { name: companyName },
          select: { id: true },
        }));

      // 2) User: upsert por email (con password en create)
      const user = await tx.user.upsert({
        where: { email },
        create: {
          email,
          name,
          password, // ✅ requerido por tu UserCreateInput
        },
        update: {
          name,
        },
        select: { id: true },
      });

      // 3) UserCompany: asegurar membresía
      const existing = await tx.userCompany.findFirst({
        where: { companyId: company.id, userId: user.id },
        select: { id: true },
      });

      if (!existing) {
        await tx.userCompany.create({
          data: {
            companyId: company.id,
            userId: user.id,
            role,
          },
        });
      } else {
        await tx.userCompany.update({
          where: { id: existing.id },
          data: { role },
        });
      }

      return {
        ok: true as const,
        companyId: company.id,
        userId: user.id,
        role: String(role),
      };
    });
  }
}
