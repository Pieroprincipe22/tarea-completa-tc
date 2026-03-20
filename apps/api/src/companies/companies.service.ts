import { randomBytes, scryptSync } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name: dto.companyName.trim() },
        });

        const ownerName = dto.ownerName?.trim() || 'Admin';
        const ownerPassword = dto.ownerPassword?.trim() || 'changeMe123';

        const user = await tx.user.create({
          data: {
            email: dto.ownerEmail.toLowerCase().trim(),
            name: ownerName,
            passwordHash: hashPassword(ownerPassword),
            isActive: true,
          },
        });

        await tx.userCompany.create({
          data: {
            companyId: company.id,
            userId: user.id,
            role: UserRole.ADMIN,
            active: true,
          },
        });

        return { companyId: company.id, ownerUserId: user.id };
      });
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code?: unknown }).code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      if (e instanceof Error) {
        throw new InternalServerErrorException(e.message);
      }

      throw new InternalServerErrorException('Unexpected error');
    }
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

  async findByUser(userId: string) {
    const rows = await this.prisma.userCompany.findMany({
      where: {
        userId,
        active: true,
      },
      include: { company: true },
    });

    return rows.map((r) => r.company);
  }
}