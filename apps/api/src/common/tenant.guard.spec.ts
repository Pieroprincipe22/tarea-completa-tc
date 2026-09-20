import { BadRequestException, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { TenantGuard } from './tenant.guard';

type MockRequest = {
  method: string;
  url: string;
  headers: Record<string, unknown>;
  cookies?: Record<string, unknown>;
  tenant?: unknown;
};

function makeContext(req: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    method: 'GET',
    url: '/customers',
    headers: {
      'x-company-id': 'company-target',
      authorization: 'Bearer valid-token',
    },
    ...overrides,
  };
}

describe('TenantGuard', () => {
  let prisma: {
    userCompany: { findUnique: jest.Mock; findFirst: jest.Mock };
    company: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let reflector: { getAllAndOverride: jest.Mock };
  let jwt: { verifyAsync: jest.Mock };
  let guard: TenantGuard;

  beforeEach(() => {
    prisma = {
      userCompany: { findUnique: jest.fn(), findFirst: jest.fn() },
      company: { findUnique: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1' }) };

    guard = new TenantGuard(
      prisma as any,
      reflector as unknown as Reflector,
      jwt as unknown as JwtService,
    );
  });

  it('deja pasar rutas marcadas @Public() sin comprobar nada más', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const req = makeRequest({ headers: {} });

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(prisma.userCompany.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza si falta x-company-id', async () => {
    const req = makeRequest({ headers: { authorization: 'Bearer x' } });

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza si no hay token', async () => {
    const req = makeRequest({ headers: { 'x-company-id': 'company-target' } });

    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('camino normal: usuario con membresía activa en la empresa pedida', async () => {
    prisma.userCompany.findUnique.mockResolvedValue({
      active: true,
      role: 'ADMIN',
      company: { id: 'company-target', name: 'Hotel Indigo', isActive: true },
    });

    const req = makeRequest();
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);

    expect(req.tenant).toMatchObject({
      companyId: 'company-target',
      role: 'ADMIN',
      userId: 'user-1',
    });
    expect(prisma.userCompany.findFirst).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('bypass: SUPER_ADMIN sin membresía en la empresa pedida puede entrar y queda auditado', async () => {
    prisma.userCompany.findUnique.mockResolvedValue(null);
    prisma.userCompany.findFirst.mockResolvedValue({ id: 'membership-super' });
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-target',
      name: 'Hotel Indigo',
      isActive: true,
    });

    const req = makeRequest();
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);

    expect(req.tenant).toMatchObject({
      companyId: 'company-target',
      role: 'SUPER_ADMIN',
      userId: 'user-1',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create.mock.calls[0][0]).toMatchObject({
      data: {
        actorUserId: 'user-1',
        action: 'SUPER_ADMIN_BYPASS',
        companyId: 'company-target',
      },
    });
  });

  it('rechaza el bypass si la empresa destino está inactiva', async () => {
    prisma.userCompany.findUnique.mockResolvedValue(null);
    prisma.userCompany.findFirst.mockResolvedValue({ id: 'membership-super' });
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-target',
      name: 'Empresa dada de baja',
      isActive: false,
    });

    const req = makeRequest();
    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('rechaza a un usuario sin membresía y sin ser SUPER_ADMIN en ningún lado', async () => {
    prisma.userCompany.findUnique.mockResolvedValue(null);
    prisma.userCompany.findFirst.mockResolvedValue(null);

    const req = makeRequest();
    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.company.findUnique).not.toHaveBeenCalled();
  });

  it('un fallo al escribir el AuditLog no bloquea el acceso del super-admin', async () => {
    prisma.userCompany.findUnique.mockResolvedValue(null);
    prisma.userCompany.findFirst.mockResolvedValue({ id: 'membership-super' });
    prisma.company.findUnique.mockResolvedValue({
      id: 'company-target',
      name: 'Hotel Indigo',
      isActive: true,
    });
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));

    const req = makeRequest();
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
  });
});
