import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function main() {
  const companyName = 'Mi Empresa';
  const adminEmail = 'admin@tc.local';
  const adminPasswordPlain = 'admin123'; // MVP
  const adminPasswordHash = sha256(adminPasswordPlain);

  // Company: name NO es unique => no se puede usar upsert por name.
  // Hacemos findFirst + create si no existe.
  let company = await prisma.company.findFirst({
    where: { name: companyName },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName },
    });
  }

  // User: email SÍ es unique => upsert es válido
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      password: adminPasswordHash,
    },
  });

  // UserCompany: tienes @@unique([companyId, userId]) => Prisma genera compound unique
  await prisma.userCompany.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: { role: 'ADMIN' },
    create: {
      companyId: company.id,
      userId: user.id,
      role: 'ADMIN',
    },
  });
  await prisma.workOrder.createMany({
  data: [
    {
      companyId: company.id,
      number: 1,
      status: 'OPEN',
      priority: 2,
      title: 'Revisión preventiva',
      description: 'WO demo (OPEN)',
      customerId: customer1.id,
      siteId: site1.id,
      assetId: asset1.id,
      createdByUserId: adminUser.id,
      assignedToUserId: adminUser.id,
    },
    {
      companyId: company.id,
      number: 2,
      status: 'IN_PROGRESS',
      priority: 3,
      title: 'Cambio de filtro',
      description: 'WO demo (IN_PROGRESS)',
      customerId: customer1.id,
      siteId: site1.id,
      assetId: asset1.id,
      createdByUserId: adminUser.id,
      assignedToUserId: adminUser.id,
    },
    {
      companyId: company.id,
      number: 3,
      status: 'DONE',
      priority: 4,
      title: 'Cierre de incidencia',
      description: 'WO demo (DONE)',
      customerId: customer2.id,
      siteId: site2.id,
      assetId: asset2.id,
      createdByUserId: adminUser.id,
      assignedToUserId: adminUser.id,
    },
     ],
});
  console.log('Seed OK');
  console.log('companyId:', company.id);
  console.log('userId:', user.id);
  console.log('adminEmail:', adminEmail);
  console.log('adminPassword (MVP):', adminPasswordPlain);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
