import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateSiteDto) {
    // 1) Validar customer pertenece al tenant
    const exists = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Customer not found');

    // 2) Crear Site (scalars directos, sin connect)
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

  async list(companyId: string) {
    return this.prisma.site.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const item = await this.prisma.site.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Site not found');
    return item;
  }
}