import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

function normalizeNullableString(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serializeCustomer(item: {
    id: string;
    companyId: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      companyId: item.companyId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async create(companyId: string, dto: CreateCustomerDto) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const item = await this.prisma.customer.create({
      data: {
        companyId: normalizedCompanyId,
        name: dto.name.trim(),
        email: normalizeNullableString(dto.email),
        phone: normalizeNullableString(dto.phone),
        notes: normalizeNullableString(dto.notes),
      },
    });

    return this.serializeCustomer(item);
  }

  async list(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const items = await this.prisma.customer.findMany({
      where: { companyId: normalizedCompanyId },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map((item) => this.serializeCustomer(item));
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const item = await this.prisma.customer.findFirst({
      where: { id, companyId: normalizedCompanyId },
    });

    if (!item) {
      throw new NotFoundException('Customer not found');
    }

    return this.serializeCustomer(item);
  }
}