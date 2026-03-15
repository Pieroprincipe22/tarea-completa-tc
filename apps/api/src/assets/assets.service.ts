import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateAssetDto) {
    const site = await this.prisma.site.findFirst({
      where: { id: dto.siteId, companyId },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('Site not found');

    return this.prisma.asset.create({
      data: {
        companyId,
        siteId: dto.siteId,
        name: dto.name,
        location: dto.location,
        brand: dto.brand,
        model: dto.model,
        serial: dto.serial,
        notes: dto.notes,
      },
    });
  }
}