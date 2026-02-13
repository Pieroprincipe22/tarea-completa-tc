import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name: dto.companyName },
        });

        const user = await tx.user.create({
          data: {
            email: dto.ownerEmail.toLowerCase(),
            name: dto.ownerName,
            password: dto.ownerPassword, // luego hash
          },
        });

        await tx.userCompany.create({
          data: {
            companyId: company.id,
            userId: user.id,
            role: 'ADMIN',
          },
        });

        return { companyId: company.id, ownerUserId: user.id };
      });
    } catch (e: unknown) {
      // Prisma unique constraint
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code?: unknown }).code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      // Mantén info razonable si viene un Error normal
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
      where: { userId },
      include: { company: true },
    });

    return rows.map((r) => r.company);
  }
}
