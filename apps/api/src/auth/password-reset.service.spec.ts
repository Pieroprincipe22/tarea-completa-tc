import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PasswordResetService } from './password-reset.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

function makePrisma() {
  const tx = {
    passwordResetToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    user: { findUnique: jest.fn() },
    passwordResetToken: {
      count: jest.fn().mockResolvedValue(0),
      deleteMany: jest.fn().mockReturnValue('deleteMany-op'),
      create: jest.fn().mockReturnValue('create-op'),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : arg,
    ),
  };

  return { prisma, tx };
}

describe('PasswordResetService', () => {
  const mail = { send: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => jest.clearAllMocks());

  describe('requestReset', () => {
    it('no hace nada ni falla si el email no existe', async () => {
      const { prisma } = makePrisma();
      prisma.user.findUnique.mockResolvedValue(null);
      const service = new PasswordResetService(prisma as never, mail as never);

      await expect(service.requestReset('nadie@x.com')).resolves.toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('no envía nada a usuarios desactivados', async () => {
      const { prisma } = makePrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', name: 'Ana', email: 'ana@x.com', isActive: false,
      });
      const service = new PasswordResetService(prisma as never, mail as never);

      await service.requestReset('ana@x.com');
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('guarda solo el hash del token y envía el enlace con el token en claro', async () => {
      const { prisma } = makePrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', name: 'Ana', email: 'ana@x.com', isActive: true,
      });
      const service = new PasswordResetService(prisma as never, mail as never);

      await service.requestReset('ana@x.com');

      const data = prisma.passwordResetToken.create.mock.calls[0][0].data;
      const sent = mail.send.mock.calls[0][0];
      const token = new URL(sent.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token')!;

      expect(data.tokenHash).toBe(sha256(token));
      expect(data.tokenHash).not.toBe(token);
      expect(sent.to).toBe('ana@x.com');
    });

    it('respeta el máximo de enlaces por hora', async () => {
      const { prisma } = makePrisma();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', name: 'Ana', email: 'ana@x.com', isActive: true,
      });
      prisma.passwordResetToken.count.mockResolvedValue(3);
      const service = new PasswordResetService(prisma as never, mail as never);

      await service.requestReset('ana@x.com');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mail.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const valid = {
      id: 't1',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: { isActive: true },
    };

    it('cambia la contraseña con un token válido', async () => {
      const { prisma, tx } = makePrisma();
      prisma.passwordResetToken.findUnique.mockResolvedValue(valid);
      const service = new PasswordResetService(prisma as never, mail as never);

      await service.resetPassword('tok', 'nueva-clave-segura');

      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tokenHash: sha256('tok') } }),
      );
      const hash = tx.user.update.mock.calls[0][0].data.passwordHash as string;
      expect(hash.startsWith('scrypt:')).toBe(true);
      expect(hash).not.toContain('nueva-clave-segura');
    });

    it.each([
      ['inexistente', null],
      ['caducado', { ...valid, expiresAt: new Date(Date.now() - 1) }],
      ['ya usado', { ...valid, usedAt: new Date() }],
      ['usuario desactivado', { ...valid, user: { isActive: false } }],
    ])('rechaza un token %s', async (_label, record) => {
      const { prisma, tx } = makePrisma();
      prisma.passwordResetToken.findUnique.mockResolvedValue(record);
      const service = new PasswordResetService(prisma as never, mail as never);

      await expect(service.resetPassword('tok', 'nueva-clave-segura')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('no cambia nada si otro proceso usó el token a la vez', async () => {
      const { prisma, tx } = makePrisma();
      prisma.passwordResetToken.findUnique.mockResolvedValue(valid);
      tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      const service = new PasswordResetService(prisma as never, mail as never);

      await expect(service.resetPassword('tok', 'nueva-clave-segura')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });
  });
});
