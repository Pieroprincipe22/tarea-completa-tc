import {
  PrismaClient,
  UserRole,
  WorkOrderStatus,
  WorkOrderPriority,
} from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

async function main() {
  console.log('🌱 Iniciando seed...');

  const companyName = 'Mi Empresa';
  const adminEmail = 'admin@tc.local';
  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

  const company =
    (await prisma.company.findFirst({
      where: { name: companyName },
    })) ??
    (await prisma.company.create({
      data: { name: companyName },
    }));

  const adminPasswordHash = hashPassword(adminPasswordPlain);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Admin',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: 'Admin',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: adminUser.id,
        companyId: company.id,
      },
    },
    update: {
      role: UserRole.ADMIN,
      active: true,
    },
    create: {
      userId: adminUser.id,
      companyId: company.id,
      role: UserRole.ADMIN,
      active: true,
    },
  });

  const technicianEmail = 'tecnico@tc.local';
  const technicianPasswordPlain =
    process.env.SEED_TECH_PASSWORD ?? 'tecnico123';
  const technicianPasswordHash = hashPassword(technicianPasswordPlain);

  const technicianUser = await prisma.user.upsert({
    where: { email: technicianEmail },
    update: {
      name: 'Técnico Demo',
      passwordHash: technicianPasswordHash,
      isActive: true,
    },
    create: {
      email: technicianEmail,
      name: 'Técnico Demo',
      passwordHash: technicianPasswordHash,
      isActive: true,
    },
  });

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: technicianUser.id,
        companyId: company.id,
      },
    },
    update: {
      role: UserRole.TECHNICIAN,
      active: true,
    },
    create: {
      userId: technicianUser.id,
      companyId: company.id,
      role: UserRole.TECHNICIAN,
      active: true,
    },
  });

  const customer1 =
    (await prisma.customer.findFirst({
      where: { companyId: company.id, name: 'Cliente Demo 1' },
    })) ??
    (await prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Cliente Demo 1',
        email: 'cliente1@demo.local',
        phone: '900111111',
      },
    }));

  const customer2 =
    (await prisma.customer.findFirst({
      where: { companyId: company.id, name: 'Cliente Demo 2' },
    })) ??
    (await prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Cliente Demo 2',
        email: 'cliente2@demo.local',
        phone: '900222222',
      },
    }));

  const site1 =
    (await prisma.site.findFirst({
      where: {
        companyId: company.id,
        customerId: customer1.id,
        name: 'Sede Norte',
      },
    })) ??
    (await prisma.site.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        name: 'Sede Norte',
        address: 'Dirección demo 1',
        city: 'Lima',
        country: 'Perú',
      },
    }));

  const site2 =
    (await prisma.site.findFirst({
      where: {
        companyId: company.id,
        customerId: customer2.id,
        name: 'Sede Sur',
      },
    })) ??
    (await prisma.site.create({
      data: {
        companyId: company.id,
        customerId: customer2.id,
        name: 'Sede Sur',
        address: 'Dirección demo 2',
        city: 'Lima',
        country: 'Perú',
      },
    }));

  const contact1 =
    (await prisma.contact.findFirst({
      where: {
        companyId: company.id,
        siteId: site1.id,
        name: 'Encargado Norte',
      },
    })) ??
    (await prisma.contact.create({
      data: {
        companyId: company.id,
        siteId: site1.id,
        name: 'Encargado Norte',
        email: 'norte@demo.local',
        phone: '911111111',
        isMain: true,
      },
    }));

  const contact2 =
    (await prisma.contact.findFirst({
      where: {
        companyId: company.id,
        siteId: site2.id,
        name: 'Encargado Sur',
      },
    })) ??
    (await prisma.contact.create({
      data: {
        companyId: company.id,
        siteId: site2.id,
        name: 'Encargado Sur',
        email: 'sur@demo.local',
        phone: '922222222',
        isMain: true,
      },
    }));

  const asset1 =
    (await prisma.asset.findFirst({
      where: {
        companyId: company.id,
        siteId: site1.id,
        name: 'Bomba Principal',
      },
    })) ??
    (await prisma.asset.create({
      data: {
        companyId: company.id,
        siteId: site1.id,
        name: 'Bomba Principal',
        category: 'Hidráulico',
        brand: 'Grundfos',
        model: 'CR-32',
        serialNumber: 'SN-BOMBA-001',
        internalCode: 'ASSET-001',
        status: 'ACTIVE',
      },
    }));

  const asset2 =
    (await prisma.asset.findFirst({
      where: {
        companyId: company.id,
        siteId: site2.id,
        name: 'Tablero Eléctrico',
      },
    })) ??
    (await prisma.asset.create({
      data: {
        companyId: company.id,
        siteId: site2.id,
        name: 'Tablero Eléctrico',
        category: 'Eléctrico',
        brand: 'Schneider',
        model: 'Panel-X',
        serialNumber: 'SN-TABLERO-001',
        internalCode: 'ASSET-002',
        status: 'ACTIVE',
      },
    }));

  let maintenanceTemplate = await prisma.maintenanceTemplate.findFirst({
    where: {
      companyId: company.id,
      title: 'Checklist Preventivo Base',
    },
    include: {
      items: {
        orderBy: { itemOrder: 'asc' },
      },
    },
  });

  if (!maintenanceTemplate) {
    maintenanceTemplate = await prisma.maintenanceTemplate.create({
      data: {
        companyId: company.id,
        title: 'Checklist Preventivo Base',
        description: 'Template demo para reportes de mantenimiento',
        items: {
          create: [
            {
              itemOrder: 1,
              title: 'Inspección visual general',
              description: 'Revisar estado visible del equipo',
              valueType: 'text',
              required: true,
            },
            {
              itemOrder: 2,
              title: 'Medición principal',
              description: 'Registrar valor medido',
              valueType: 'number',
              required: false,
              unit: 'psi',
            },
            {
              itemOrder: 3,
              title: 'Observaciones',
              description: 'Anotar hallazgos relevantes',
              valueType: 'text',
              required: false,
            },
          ],
        },
      },
      include: {
        items: {
          orderBy: { itemOrder: 'asc' },
        },
      },
    });
  }

  const existingWorkOrders = await prisma.workOrder.count({
    where: { companyId: company.id },
  });

  if (existingWorkOrders === 0) {
    await prisma.workOrder.createMany({
      data: [
        {
          companyId: company.id,
          customerId: customer1.id,
          siteId: site1.id,
          assetId: asset1.id,
          assignedToUserId: technicianUser.id,
          title: 'Revisión preventiva',
          description: 'WO demo (OPEN)',
          status: WorkOrderStatus.OPEN,
          priority: WorkOrderPriority.MEDIUM,
        },
        {
          companyId: company.id,
          customerId: customer1.id,
          siteId: site1.id,
          assetId: asset1.id,
          assignedToUserId: technicianUser.id,
          title: 'Cambio de filtro',
          description: 'WO demo (IN_PROGRESS)',
          status: WorkOrderStatus.IN_PROGRESS,
          priority: WorkOrderPriority.HIGH,
        },
        {
          companyId: company.id,
          customerId: customer2.id,
          siteId: site2.id,
          assetId: asset2.id,
          assignedToUserId: technicianUser.id,
          title: 'Cierre de incidencia',
          description: 'WO demo (DONE)',
          status: WorkOrderStatus.DONE,
          priority: WorkOrderPriority.URGENT,
        },
      ],
    });
  }

  const existingEmergency = await prisma.emergencyRequest.findFirst({
    where: {
      companyId: company.id,
      title: 'Fuga de agua en sala técnica',
    },
  });

  const emergencyRequest =
    existingEmergency ??
    (await prisma.emergencyRequest.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        siteId: site1.id,
        assetId: asset1.id,
        assignedToUserId: technicianUser.id,
        title: 'Fuga de agua en sala técnica',
        description: 'Se detecta fuga y se requiere atención inmediata.',
        status: 'DISPATCHED',
        priority: WorkOrderPriority.URGENT,
        requestedByName: 'Encargado Norte',
        requestedByPhone: '911111111',
      },
    }));

  const existingReport = await prisma.maintenanceReport.findFirst({
    where: {
      companyId: company.id,
      title: 'Reporte Preventivo Demo',
    },
    include: {
      items: {
        orderBy: { itemOrder: 'asc' },
      },
    },
  });

  let report = existingReport;

  if (!report) {
    report = await prisma.maintenanceReport.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        siteId: site1.id,
        assetId: asset1.id,
        templateId: maintenanceTemplate.id,
        title: 'Reporte Preventivo Demo',
        description: 'Reporte generado por seed',
        notes: 'Todo operativo con observaciones menores.',
        status: 'COMPLETED',
        createdByUserId: technicianUser.id,
        completedByUserId: technicianUser.id,
        completedAt: new Date(),
        items: {
          create: maintenanceTemplate.items.map((item) => ({
            templateItemId: item.id,
            title: item.title,
            description: item.description,
            itemOrder: item.itemOrder,
            status: item.itemOrder === 2 ? 'OK' : 'PENDING',
            value: item.itemOrder === 2 ? '58' : null,
            notes:
              item.itemOrder === 1
                ? 'Sin daños visibles'
                : item.itemOrder === 3
                  ? 'Pendiente limpieza menor'
                  : null,
          })),
        },
      },
      include: {
        items: {
          orderBy: { itemOrder: 'asc' },
        },
      },
    });
  }

  console.log('✅ Seed OK');
  console.log('companyId:', company.id);
  console.log('adminUserId:', adminUser.id);
  console.log('technicianUserId:', technicianUser.id);
  console.log('templateId:', maintenanceTemplate.id);
  console.log('reportId:', report.id);
  console.log('emergencyRequestId:', emergencyRequest.id);
  console.log('customerId:', customer1.id);
  console.log('siteId:', site1.id);
  console.log('assetId:', asset1.id);
  console.log('contactId:', contact1.id);
  console.log('adminEmail:', adminEmail);
  console.log('adminPassword:', adminPasswordPlain);
  console.log('technicianEmail:', technicianEmail);
  console.log('technicianPassword:', technicianPasswordPlain);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });