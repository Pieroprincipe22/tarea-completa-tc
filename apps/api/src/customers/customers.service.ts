import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        company: { connect: { id: companyId } },
        name: dto.name,
      },
    });
  }

  async list(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(companyId: string, id: string) {
    const item = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Customer not found');
    return item;
  }
}