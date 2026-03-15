import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: {
        company: { connect: { id: companyId } },
        site: { connect: { id: dto.siteId } },
        name: dto.name,
      },
    });
  }

  async list(companyId: string) {
    return this.prisma.contact.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const item = await this.prisma.contact.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Contact not found');
    return item;
  }
}