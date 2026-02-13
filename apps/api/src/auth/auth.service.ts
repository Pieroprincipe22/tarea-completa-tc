import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.prisma.userCompany.findMany({
      where: { userId: user.id },
      include: { company: true },
    });

    return {
      userId: user.id,
      companies: memberships.map((m) => ({
        companyId: m.companyId,
        name: m.company.name,
        role: m.role,
      })),
    };
  }
}
