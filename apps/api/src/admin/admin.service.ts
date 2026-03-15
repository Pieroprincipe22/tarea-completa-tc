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
      throw new BadRequestException('DevUserDto must include companyName (or company)');
    }
    if (!email) {
      throw new BadRequestException('DevUserDto must include email (or userEmail)');
    }

    // ✅ En tu schema role no es enum exportado: tratamos como string
    const role: string = (dto.role ?? 'OWNER').trim();

    // ✅ si tu UserCreateInput exige password obligatorio
    const password = (dto.password ?? 'dev12345').trim();

    return this.prisma.$transaction(async (tx) => {
      const company =
        (await tx.company.findFirst({
          where: { name: companyName },
          select: { id: true },
        })) ??
        (await tx.company.create({
          data: { name: companyName },
          select: { id: true },
        }));

      const user = await tx.user.upsert({
        where: { email },
        create: {
          email,
          name,
          password,
        } satisfies Prisma.UserCreateInput,
        update: {
          name,
        },
        select: { id: true },
      });

      const existing = await tx.userCompany.findFirst({
        where: { companyId: company.id, userId: user.id },
        select: { id: true },
      });

      if (!existing) {
        await tx.userCompany.create({
          data: {
            companyId: company.id,
            userId: user.id,
            role, // string
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
        role,
      };
    });
  }
}
