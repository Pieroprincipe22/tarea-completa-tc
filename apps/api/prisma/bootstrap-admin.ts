/**
 * Crea (o reactiva) el primer SUPER_ADMIN en una base de datos de producción,
 * donde el seed de pruebas NO debe ejecutarse.
 *
 * No pide ni guarda contraseñas: imprime un enlace de un solo uso (1 hora)
 * para que el propio usuario elija la suya en /reset-password.
 *
 * Uso dentro del contenedor de la API:
 *   docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod \
 *     exec api ./node_modules/.bin/tsx prisma/bootstrap-admin.ts tu@email.com "Tu Nombre" "AnPi Tech"
 */
// En local lee apps/api/.env; en Docker no hay archivo y usa las variables del contenedor.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

async function main() {
  const [emailArg, nameArg, companyArg] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  const name = nameArg?.trim();
  const companyName = companyArg?.trim() || 'AnPi Tech';

  if (!email || !email.includes('@') || !name) {
    console.error('Uso: tsx prisma/bootstrap-admin.ts <email> "<nombre>" ["<empresa>"]');
    process.exit(1);
  }

  const appUrl = (process.env.APP_URL?.trim() || 'http://localhost:3001').replace(/\/+$/, '');
  const prisma = new PrismaClient();

  try {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await prisma.$transaction(async (tx) => {
      const company =
        (await tx.company.findFirst({ where: { name: companyName } })) ??
        (await tx.company.create({
          data: { name: companyName, plan: 'ENTERPRISE', isActive: true },
        }));

      // Contraseña aleatoria que nadie conoce: se sustituye con el enlace.
      const unusable = `scrypt:${randomBytes(16).toString('hex')}:${randomBytes(64).toString('hex')}`;

      const user = await tx.user.upsert({
        where: { email },
        create: {
          email,
          name,
          passwordHash: unusable,
          role: 'SUPER_ADMIN',
          isActive: true,
          companyId: company.id,
        },
        update: { name, role: 'SUPER_ADMIN', isActive: true, companyId: company.id },
      });

      await tx.userCompany.upsert({
        where: { userId_companyId: { userId: user.id, companyId: company.id } },
        create: { userId: user.id, companyId: company.id, role: 'SUPER_ADMIN', active: true },
        update: { role: 'SUPER_ADMIN', active: true },
      });

      await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
    });

    console.log(`\nSUPER_ADMIN listo: ${email} (${companyName})`);
    console.log('Abre este enlace en la próxima hora para elegir la contraseña:\n');
    console.log(`  ${appUrl}/reset-password?token=${encodeURIComponent(token)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
