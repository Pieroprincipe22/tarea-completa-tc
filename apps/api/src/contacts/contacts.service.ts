import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateContactDto) {
    // Validar tenant: la site debe ser de la company
    const site = await this.prisma.site.findFirst({
      where: { id: dto.siteId, companyId },
      select: { id: true },
    });

    if (!site) throw new NotFoundException('Site not found');

    return this.prisma.$transaction(async (tx) => {
      // Si viene isMain=true, apagamos el main anterior en esa site
      if (dto.isMain) {
        await tx.contact.updateMany({
          where: { companyId, siteId: dto.siteId, isMain: true },
          data: { isMain: false },
        });
      }

      return tx.contact.create({
        data: {
          companyId,
          siteId: dto.siteId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          isMain: dto.isMain ?? false,
          notes: dto.notes,
        },
      });
    });
  }

  findAll(companyId: string, siteId?: string) {
    return this.prisma.contact.findMany({
      where: {
        companyId,
        ...(siteId ? { siteId } : {}),
      },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
