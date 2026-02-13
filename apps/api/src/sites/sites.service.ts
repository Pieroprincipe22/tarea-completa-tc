import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateSiteDto) {
    // Validación multi-tenant: el customer debe pertenecer a la misma empresa
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
      select: { id: true },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.site.create({
      data: {
        companyId,
        customerId: dto.customerId,
        name: dto.name,
        address: dto.address,
        notes: dto.notes,
      },
    });
  }

  findAll(companyId: string, customerId?: string) {
    return this.prisma.site.findMany({
      where: {
        companyId,
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
