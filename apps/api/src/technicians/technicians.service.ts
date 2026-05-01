import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type UserRoleValue = 'ADMIN' | 'TECHNICIAN' | 'SUPER_ADMIN';
const TECHNICIAN_ROLE: UserRoleValue = 'TECHNICIAN';

type TechnicianMembershipRow = {
  id: string;
  companyId: string;
  userId: string;
  role: UserRoleValue;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRoleValue | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCompanyId(companyId?: string): string {
    const normalized = companyId?.trim();

    if (!normalized) {
      throw new BadRequestException('Falta x-company-id');
    }

    return normalized;
  }

  private serializeTechnician(row: TechnicianMembershipRow) {
    return {
      id: row.user.id,
      userId: row.user.id,
      membershipId: row.id,
      companyId: row.companyId,
      name: row.user.name?.trim() || row.user.email,
      email: row.user.email,
      role: row.role,
      userRole: row.user.role,
      isActive: row.user.isActive,
      createdAt: row.user.createdAt,
      updatedAt: row.user.updatedAt,
    };
  }

  async list(companyId: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);

    const memberships = await this.prisma.userCompany.findMany({
      where: {
        companyId: normalizedCompanyId,
        role: TECHNICIAN_ROLE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const items = memberships
      .filter((membership) => membership.user.isActive)
      .map((membership) =>
        this.serializeTechnician(membership as TechnicianMembershipRow),
      )
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return {
      items,
      count: items.length,
    };
  }

  async get(companyId: string, id: string) {
    const normalizedCompanyId = this.ensureCompanyId(companyId);
    const normalizedId = id?.trim();

    if (!normalizedId) {
      throw new BadRequestException('ID de técnico inválido');
    }

    const membership = await this.prisma.userCompany.findFirst({
      where: {
        companyId: normalizedCompanyId,
        userId: normalizedId,
        role: TECHNICIAN_ROLE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!membership || !membership.user.isActive) {
      throw new NotFoundException('Técnico no encontrado para esta empresa.');
    }

    return this.serializeTechnician(membership as TechnicianMembershipRow);
  }
}
