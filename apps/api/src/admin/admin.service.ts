import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DevUserDto } from './dto/dev-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async devUser(dto: DevUserDto) {
    const role = (dto.role ?? 'OWNER').trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // 1) Company (no es unique por name, por eso findFirst + create)
      let company = await tx.company.findFirst({
        where: { name: dto.companyName },
      });

      if (!company) {
        company = await tx.company.create({
          data: { name: dto.companyName },
        });
      }

      // 2) User (email es unique => upsert)
      const user = await tx.user.upsert({
        where: { email: dto.email },
        update: { name: dto.userName },
        create: {
          email: dto.email,
          name: dto.userName,
          password: dto.password,
        },
      });

      // 3) Membership (companyId+userId es unique => upsert)
      await tx.userCompany.upsert({
        where: {
          companyId_userId: { companyId: company.id, userId: user.id },
        },
        update: { role },
        create: { companyId: company.id, userId: user.id, role },
      });

      // 4) CompanyCounter (companyId es @id)
      await tx.companyCounter.upsert({
        where: { companyId: company.id },
        update: { workOrderSeq: { increment: 0 } },
        create: { companyId: company.id, workOrderSeq: 0 },
      });

      return { companyId: company.id, userId: user.id, role };
    });
  }
}
