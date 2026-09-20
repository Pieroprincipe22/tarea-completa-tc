import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';

type PrismaMock = {
  company: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
  user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
  userCompany: { count: jest.Mock };
  $transaction: jest.Mock;
};

function makePrisma(): PrismaMock {
  return {
    company: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    userCompany: { count: jest.fn() },
    $transaction: jest.fn(),
  };
}

const ACTIVE_COMPANY = {
  id: 'company-1',
  name: 'Hotel Indigo',
  isActive: true,
  plan: 'BASIC' as const,
};

describe('CompanyUsersService', () => {
  let prisma: PrismaMock;
  let service: CompanyUsersService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CompanyUsersService(prisma as any);
  });

  describe('create()', () => {
    it('rechaza si la empresa no existe o está inactiva', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(
        service.create('company-1', {
          name: 'Juan',
          email: 'juan@x.com',
          password: 'secreto1',
          role: 'TECHNICIAN',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('respeta el límite de técnicos del plan (BASIC = 5)', async () => {
      prisma.company.findUnique.mockResolvedValue(ACTIVE_COMPANY);
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(5); // ya al límite

      await expect(
        service.create('company-1', {
          name: 'Sexto Técnico',
          email: 'sexto@x.com',
          password: 'secreto1',
          role: 'TECHNICIAN',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('permite crear un técnico por debajo del límite del plan', async () => {
      prisma.company.findUnique.mockResolvedValue(ACTIVE_COMPANY);
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(4); // uno libre
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await service.create('company-1', {
        name: 'Quinto Técnico',
        email: 'quinto@x.com',
        password: 'secreto1',
        role: 'TECHNICIAN',
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('no aplica el límite de técnicos al crear un ADMIN', async () => {
      prisma.company.findUnique.mockResolvedValue(ACTIVE_COMPANY);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await service.create('company-1', {
        name: 'Nueva Admin',
        email: 'admin2@x.com',
        password: 'secreto1',
        role: 'ADMIN',
      });

      expect(prisma.company.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.userCompany.count).not.toHaveBeenCalled();
    });

    it('rechaza un email que ya tiene membresía activa en la misma empresa', async () => {
      prisma.company.findUnique.mockResolvedValue(ACTIVE_COMPANY);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-existing',
        email: 'repetido@x.com',
        name: 'Repetido',
        isActive: true,
        memberships: [{ id: 'm1', role: 'ADMIN', active: true }],
      });

      // role: ADMIN a propósito, para aislar el caso de "email duplicado"
      // del chequeo de límite de técnicos (que se prueba aparte).
      await expect(
        service.create('company-1', {
          name: 'Repetido',
          email: 'repetido@x.com',
          password: 'secreto1',
          role: 'ADMIN',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('activate()', () => {
    it('vuelve a comprobar el límite de técnicos al reactivar un técnico', async () => {
      prisma.company.findUnique.mockResolvedValue(ACTIVE_COMPANY);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        memberships: [
          { id: 'm1', companyId: 'company-1', role: 'TECHNICIAN', active: false },
        ],
      });
      prisma.company.findUniqueOrThrow.mockResolvedValue({ plan: 'BASIC' });
      prisma.userCompany.count.mockResolvedValue(5);

      await expect(service.activate('company-1', 'user-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
