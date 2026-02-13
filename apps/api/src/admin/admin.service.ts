import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DevUserDto } from './dto/dev-user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async devUser(dto: DevUserDto) {
    const role = (dto.role ?? 'OWNER').toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // 1) Company (buscamos por name; si tu Company tiene unique slug, mejor usar slug)
      let company = await tx.company.findFirst({
        where: { name: dto.companyName },
      });

      if (!company) {
        company = await tx.company.create({
          data: {
            name: dto.companyName,
            // si tu schema exige algo más (p.ej. legalName), añádelo aquí
          } as any,
        });
      }

      // 2) User (ideal: unique por email)
      let user = await tx.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: dto.email,
            name: dto.userName,
            password: dto.password,
          } as any,
        });
      } else {
        // opcional: mantener user actualizado en dev
        user = await tx.user.update({
          where: { id: user.id },
          data: { name: dto.userName },
        });
      }

      // 3) UserCompany membership (no dependemos de composite unique; findFirst + create)
      const membership = await tx.userCompany.findFirst({
        where: {
          userId: user.id,
          companyId: company.id,
        },
      });

      if (!membership) {
        await tx.userCompany.create({
          data: {
            userId: user.id,
            companyId: company.id,
            role, // string
          } as any,
        });
      }

      // 4) CompanyCounter (asegura secuenciador para WorkOrders)
      const counter = await tx.companyCounter.findUnique({
        where: { companyId: company.id },
      });

      if (!counter) {
        await tx.companyCounter.create({
          data: {
            companyId: company.id,
            workOrderSeq: 0,
          } as any,
        });
      }

      return {
        companyId: company.id,
        userId: user.id,
        role,
      };
    });
  }
}
