import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { hashPassword } from './password.util';

const TOKEN_TTL_MINUTES = 60;
// Máximo de enlaces por usuario y hora, además del límite por IP del controlador.
const MAX_REQUESTS_PER_HOUR = 3;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private get appUrl(): string {
    const raw = process.env.APP_URL?.trim() || 'http://localhost:3001';
    return raw.replace(/\/+$/, '');
  }

  /**
   * Siempre termina sin error, exista o no el email, para no revelar
   * qué cuentas hay registradas. El email se envía en segundo plano para
   * que el tiempo de respuesta tampoco lo delate.
   */
  async requestReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) return;

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: since } },
    });
    if (recent >= MAX_REQUESTS_PER_HOUR) {
      this.logger.warn(`Límite de enlaces de recuperación alcanzado (usuario ${user.id}).`);
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    // Un enlace nuevo anula los anteriores que no se hayan usado.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt },
      }),
    ]);

    const link = `${this.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const name = user.name?.trim() || user.email;

    void this.mail
      .send({
        to: user.email,
        subject: 'Restablece tu contraseña de AnPi Tech',
        text: [
          `Hola ${name}:`,
          '',
          'Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de AnPi Tech.',
          `Ábrela desde este enlace (caduca en ${TOKEN_TTL_MINUTES} minutos):`,
          link,
          '',
          'Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.',
        ].join('\n'),
        html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0C1220;max-width:480px;margin:0 auto;padding:24px">
  <p style="font-size:16px;font-weight:600;margin:0 0 16px">AnPi Tech</p>
  <p>Hola ${escapeHtml(name)}:</p>
  <p>Hemos recibido una solicitud para cambiar la contraseña de tu cuenta.</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(link)}" style="background:#1F4E8C;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
      Elegir nueva contraseña
    </a>
  </p>
  <p style="color:#4F5868;font-size:14px">El enlace caduca en ${TOKEN_TTL_MINUTES} minutos y solo se puede usar una vez.</p>
  <p style="color:#4F5868;font-size:14px">Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.</p>
</div>`,
      })
      .catch((err: unknown) => {
        this.logger.error(
          `No se pudo enviar el email de recuperación (usuario ${user.id}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const invalid = new BadRequestException(
      'El enlace no es válido o ha caducado. Pide uno nuevo.',
    );

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { isActive: true } },
      },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt.getTime() < Date.now() ||
      !record.user.isActive
    ) {
      throw invalid;
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Marca el token como usado solo si nadie lo ha usado entre medias.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw invalid;

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: hashPassword(newPassword) },
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      });
    });
  }
}
