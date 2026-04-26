import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';

type CompanyUserRole = 'ADMIN' | 'TECHNICIAN';

type CompanyUserListQuery = {
  role?: string;
  search?: string;
  active?: string;
  page?: number | string;
  pageSize?: number | string;
};

@Injectable()
export class CompanyUsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    companyId: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    memberships: {
      select: {
        id: true,
        companyId: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  } satisfies Prisma.UserSelect;

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64).toString('hex');

    return `scrypt:${salt}:${derivedKey}`;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeRole(role?: string): CompanyUserRole {
    if (!role) {
      return 'TECHNICIAN';
    }

    if (role !== 'ADMIN' && role !== 'TECHNICIAN') {
      throw new BadRequestException(
        'Desde el panel de empresa solo puedes crear usuarios ADMIN o TECHNICIAN',
      );
    }

    return role;
  }

  private parsePositiveInt(
    value: number | string | undefined,
    fallback: number,
    max: number,
  ): number {
    const parsed =
      typeof value === 'number' ? value : Number.parseInt(String(value), 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.min(parsed, max);
  }

  private getTechnicianLimit(): number {
    const rawValue = process.env.TC_MAX_TECHNICIANS_PER_COMPANY;
    const parsed = Number.parseInt(String(rawValue ?? ''), 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return 10;
    }

    return parsed;
  }

  private async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!company || !company.isActive) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    return company;
  }

  private async enforceTechnicianLimit(companyId: string, role: CompanyUserRole) {
    if (role !== 'TECHNICIAN') {
      return;
    }

    const maxTechnicians = this.getTechnicianLimit();

    const currentTechnicians = await this.prisma.userCompany.count({
      where: {
        companyId,
        role: 'TECHNICIAN',
        active: true,
        user: {
          isActive: true,
        },
      },
    });

    if (currentTechnicians >= maxTechnicians) {
      throw new BadRequestException(
        `Tu plan actual permite máximo ${maxTechnicians} técnico(s) activo(s).`,
      );
    }
  }

  private buildListWhere(
    companyId: string,
    query: CompanyUserListQuery,
  ): Prisma.UserWhereInput {
    const membershipFilter: Prisma.UserCompanyWhereInput = {
      companyId,
    };

    if (query.role) {
      membershipFilter.role = this.normalizeRole(query.role);
    }

    if (query.active === 'true') {
      membershipFilter.active = true;
    }

    const where: Prisma.UserWhereInput = {
      memberships: {
        some: membershipFilter,
      },
    };

    if (query.active === 'true') {
      where.isActive = true;
    }

    if (query.active === 'false') {
      where.OR = [
        {
          isActive: false,
        },
        {
          memberships: {
            some: {
              companyId,
              active: false,
              ...(query.role ? { role: this.normalizeRole(query.role) } : {}),
            },
          },
        },
      ];
    }

    if (query.search?.trim()) {
      const search = query.search.trim();

      where.AND = [
        {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        },
      ];
    }

    return where;
  }

  async list(companyId: string, query: CompanyUserListQuery = {}) {
    await this.ensureCompanyExists(companyId);

    const page = this.parsePositiveInt(query.page, 1, 10_000);
    const pageSize = this.parsePositiveInt(query.pageSize, 20, 100);

    const where = this.buildListWhere(companyId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: this.userSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(companyId: string, userId: string) {
    await this.ensureCompanyExists(companyId);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            companyId,
          },
        },
      },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado en esta empresa');
    }

    return user;
  }

  async create(companyId: string, dto: CreateCompanyUserDto) {
    await this.ensureCompanyExists(companyId);

    const email = this.normalizeEmail(dto.email);
    const role = this.normalizeRole(dto.role);
    const isActive = dto.isActive ?? true;

    await this.enforceTechnicianLimit(companyId, role);

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        memberships: {
          where: {
            companyId,
          },
          select: {
            id: true,
            role: true,
            active: true,
          },
        },
      },
    });

    if (existingUser?.memberships.length) {
      throw new ConflictException(
        'Ya existe un usuario con ese email dentro de esta empresa',
      );
    }

    const passwordHash = this.hashPassword(dto.password);

    if (existingUser) {
      return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.user.update({
          where: {
            id: existingUser.id,
          },
          data: {
            name: dto.name.trim(),
            passwordHash,
            role,
            companyId,
            isActive,
          },
        });

        await tx.userCompany.upsert({
          where: {
            userId_companyId: {
              userId: existingUser.id,
              companyId,
            },
          },
          create: {
            userId: existingUser.id,
            companyId,
            role,
            active: isActive,
          },
          update: {
            role,
            active: isActive,
          },
        });

        return tx.user.findUniqueOrThrow({
          where: {
            id: existingUser.id,
          },
          select: this.userSelect,
        });
      });
    }

    return this.prisma.user.create({
      data: {
        companyId,
        name: dto.name.trim(),
        email,
        passwordHash,
        role,
        isActive,
        memberships: {
          create: {
            companyId,
            role,
            active: isActive,
          },
        },
      },
      select: this.userSelect,
    });
  }

  async update(companyId: string, userId: string, dto: UpdateCompanyUserDto) {
    await this.ensureCompanyExists(companyId);

    const current = await this.prisma.user.findFirst({
      where: {
        id: userId,
        memberships: {
          some: {
            companyId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        memberships: {
          where: {
            companyId,
          },
          select: {
            role: true,
            active: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException('Usuario no encontrado en esta empresa');
    }

    const currentMembership = current.memberships[0];

    const nextRole = dto.role ? this.normalizeRole(dto.role) : undefined;
    const nextIsActive = dto.isActive;

    const willBecomeActiveTechnician =
      nextRole === 'TECHNICIAN' &&
      (nextIsActive ?? currentMembership?.active ?? true);

    const wasActiveTechnician =
      currentMembership?.role === 'TECHNICIAN' && currentMembership.active;

    if (willBecomeActiveTechnician && !wasActiveTechnician) {
      await this.enforceTechnicianLimit(companyId, 'TECHNICIAN');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);

      const existingEmailUser = await this.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

      if (existingEmailUser && existingEmailUser.id !== userId) {
        throw new ConflictException('Ya existe otro usuario con ese email');
      }

      data.email = email;
    }

    if (dto.password !== undefined) {
      data.passwordHash = this.hashPassword(dto.password);
    }

    if (nextRole !== undefined) {
      data.role = nextRole;
    }

    if (nextIsActive !== undefined) {
      data.isActive = nextIsActive;
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...data,
          company: {
            connect: {
              id: companyId,
            },
          },
        },
      });

      await tx.userCompany.upsert({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        create: {
          userId,
          companyId,
          role: nextRole ?? currentMembership?.role ?? 'TECHNICIAN',
          active: nextIsActive ?? currentMembership?.active ?? true,
        },
        update: {
          ...(nextRole ? { role: nextRole } : {}),
          ...(nextIsActive !== undefined ? { active: nextIsActive } : {}),
        },
      });

      return tx.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: this.userSelect,
      });
    });
  }

  async deactivate(companyId: string, userId: string) {
    await this.get(companyId, userId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          isActive: false,
        },
      });

      await tx.userCompany.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: {
          active: false,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: this.userSelect,
      });
    });
  }

  async activate(companyId: string, userId: string) {
    const user = await this.get(companyId, userId);

    const membership = user.memberships.find(
      (item) => item.companyId === companyId,
    );

    if (membership?.role === 'TECHNICIAN') {
      await this.enforceTechnicianLimit(companyId, 'TECHNICIAN');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          isActive: true,
        },
      });

      await tx.userCompany.update({
        where: {
          userId_companyId: {
            userId,
            companyId,
          },
        },
        data: {
          active: true,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: this.userSelect,
      });
    });
  }
}