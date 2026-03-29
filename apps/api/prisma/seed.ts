import {
  Prisma,
  PrismaClient,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus,
  MaintenanceItemType,
  MaintenanceReportStatus,
} from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

async function main() {
  console.log('🌱 Iniciando seed fase 3.2...');

  const companySlug = 'mi-empresa';
  const companyName = 'Mi Empresa';

  const adminEmail = 'admin@tc.local';
  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';

  const technicianEmail = 'tecnico@tc.local';
  const technicianPasswordPlain =
    process.env.SEED_TECH_PASSWORD ?? 'tecnico123';

  const adminPasswordHash = hashPassword(adminPasswordPlain);
  const technicianPasswordHash = hashPassword(technicianPasswordPlain);

  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: {
      name: companyName,
      isActive: true,
    },
    create: {
      name: companyName,
      slug: companySlug,
      isActive: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      companyId: company.id,
      name: 'Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      companyId: company.id,
      name: 'Admin',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const technicianUser = await prisma.user.upsert({
    where: { email: technicianEmail },
    update: {
      companyId: company.id,
      name: 'Técnico Demo',
      passwordHash: technicianPasswordHash,
      role: UserRole.TECHNICIAN,
      isActive: true,
    },
    create: {
      companyId: company.id,
      name: 'Técnico Demo',
      email: technicianEmail,
      passwordHash: technicianPasswordHash,
      role: UserRole.TECHNICIAN,
      isActive: true,
    },
  });

  const customer1 =
    (await prisma.customer.findFirst({
      where: {
        companyId: company.id,
        name: 'Cliente Demo 1',
      },
    })) ??
    (await prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Cliente Demo 1',
        email: 'cliente1@demo.local',
        phone: '900111111',
        address: 'Dirección demo 1',
        notes: 'Cliente de ejemplo para pruebas',
      },
    }));

  const customer2 =
    (await prisma.customer.findFirst({
      where: {
        companyId: company.id,
        name: 'Cliente Demo 2',
      },
    })) ??
    (await prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Cliente Demo 2',
        email: 'cliente2@demo.local',
        phone: '900222222',
        address: 'Dirección demo 2',
        notes: 'Segundo cliente demo',
      },
    }));

  const asset1 =
    (await prisma.asset.findFirst({
      where: {
        companyId: company.id,
        customerId: customer1.id,
        name: 'Bomba Principal',
      },
    })) ??
    (await prisma.asset.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        name: 'Bomba Principal',
        code: 'ASSET-001',
        brand: 'Grundfos',
        model: 'CR-32',
        serialNumber: 'SN-BOMBA-001',
        location: 'Sala técnica - Cliente Demo 1',
        notes: 'Equipo principal de impulsión',
      },
    }));

  const asset2 =
    (await prisma.asset.findFirst({
      where: {
        companyId: company.id,
        customerId: customer2.id,
        name: 'Tablero Eléctrico',
      },
    })) ??
    (await prisma.asset.create({
      data: {
        companyId: company.id,
        customerId: customer2.id,
        name: 'Tablero Eléctrico',
        code: 'ASSET-002',
        brand: 'Schneider',
        model: 'Panel-X',
        serialNumber: 'SN-TABLERO-001',
        location: 'Cuarto eléctrico - Cliente Demo 2',
        notes: 'Tablero general de distribución',
      },
    }));

  let template = await prisma.maintenanceTemplate.findFirst({
    where: {
      companyId: company.id,
      name: 'Checklist Preventivo Base',
    },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!template) {
    template = await prisma.maintenanceTemplate.create({
      data: {
        companyId: company.id,
        name: 'Checklist Preventivo Base',
        description: 'Template demo para reportes de mantenimiento',
        isActive: true,
        items: {
          create: [
            {
              label: 'Inspección visual general',
              type: MaintenanceItemType.TEXT,
              required: true,
              sortOrder: 1,
              helpText: 'Revisar el estado visible general del equipo',
              placeholder: 'Sin daños visibles / con observaciones',
            },
            {
              label: 'Presión medida',
              type: MaintenanceItemType.NUMBER,
              required: false,
              sortOrder: 2,
              helpText: 'Registrar el valor de presión tomado en campo',
              placeholder: 'Ej. 58',
            },
            {
              label: 'Observaciones técnicas',
              type: MaintenanceItemType.LONG_TEXT,
              required: false,
              sortOrder: 3,
              helpText: 'Anotar hallazgos, recomendaciones o incidencias',
              placeholder: 'Detalle técnico del trabajo realizado',
            },
          ],
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  const workOrder1Existing = await prisma.workOrder.findFirst({
    where: {
      companyId: company.id,
      code: 'WO-1001',
    },
  });

  const workOrder1 =
    workOrder1Existing ??
    (await prisma.workOrder.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        assetId: asset1.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        maintenanceTemplateId: template.id,
        code: 'WO-1001',
        title: 'Revisión preventiva de bomba principal',
        description: 'Orden demo abierta para pruebas del dashboard técnico',
        status: WorkOrderStatus.OPEN,
        priority: WorkOrderPriority.MEDIUM,
      },
    }));

  const workOrder2Existing = await prisma.workOrder.findFirst({
    where: {
      companyId: company.id,
      code: 'WO-1002',
    },
  });

  const workOrder2 =
    workOrder2Existing ??
    (await prisma.workOrder.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        assetId: asset1.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        maintenanceTemplateId: template.id,
        code: 'WO-1002',
        title: 'Mantenimiento correctivo de bomba principal',
        description: 'Orden demo en progreso con reporte asignado al técnico',
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.HIGH,
        startedAt: new Date(),
      },
    }));

  const workOrder3Existing = await prisma.workOrder.findFirst({
    where: {
      companyId: company.id,
      code: 'WO-1003',
    },
  });

  const workOrder3 =
    workOrder3Existing ??
    (await prisma.workOrder.create({
      data: {
        companyId: company.id,
        customerId: customer2.id,
        assetId: asset2.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        maintenanceTemplateId: template.id,
        code: 'WO-1003',
        title: 'Inspección final de tablero eléctrico',
        description: 'Orden demo finalizada con reporte aprobado',
        status: WorkOrderStatus.DONE,
        priority: WorkOrderPriority.URGENT,
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
        completedAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    }));

  const reportForWorkOrder2 = await prisma.maintenanceReport.findUnique({
    where: {
      workOrderId: workOrder2.id,
    },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      materials: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  const report2 =
    reportForWorkOrder2 ??
    (await prisma.maintenanceReport.create({
      data: {
        companyId: company.id,
        workOrderId: workOrder2.id,
        templateId: template.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        status: MaintenanceReportStatus.IN_PROGRESS,
        summary: 'Mantenimiento correctivo en ejecución',
        diagnosis: 'Se detectó caída de presión por desgaste en componentes.',
        workPerformed:
          'Desmontaje parcial, inspección interna y preparación para reemplazo.',
        recommendations:
          'Sustituir sello y revisar ajuste de conexiones en próxima visita.',
        observations: 'Equipo operativo de forma provisional.',
        technicianNotes: 'Pendiente cierre definitivo del servicio.',
        assignedAt: new Date(Date.now() - 1000 * 60 * 90),
        startedAt: new Date(Date.now() - 1000 * 60 * 60),
        laborHours: new Prisma.Decimal('1.50'),
        items: {
          create: template.items.map((item) => {
            if (item.sortOrder === 1) {
              return {
                templateItemId: item.id,
                label: item.label,
                type: item.type,
                required: item.required,
                sortOrder: item.sortOrder,
                valueText: 'Inspección completada con desgaste visible en sello',
              };
            }

            if (item.sortOrder === 2) {
              return {
                templateItemId: item.id,
                label: item.label,
                type: item.type,
                required: item.required,
                sortOrder: item.sortOrder,
                valueNumber: 58,
              };
            }

            return {
              templateItemId: item.id,
              label: item.label,
              type: item.type,
              required: item.required,
              sortOrder: item.sortOrder,
              valueText: 'Pendiente sustitución de repuesto para cierre final',
            };
          }),
        },
        materials: {
          create: [
            {
              name: 'Sello mecánico',
              description: 'Repuesto pendiente de sustitución',
              quantity: 1,
              unit: 'ud',
              sortOrder: 1,
              notes: 'Aún no instalado',
            },
            {
              name: 'Lubricante técnico',
              description: 'Aplicado en revisión',
              quantity: 0.5,
              unit: 'L',
              sortOrder: 2,
            },
          ],
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        materials: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }));

  const reportForWorkOrder3 = await prisma.maintenanceReport.findUnique({
    where: {
      workOrderId: workOrder3.id,
    },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      materials: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  const report3 =
    reportForWorkOrder3 ??
    (await prisma.maintenanceReport.create({
      data: {
        companyId: company.id,
        workOrderId: workOrder3.id,
        templateId: template.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        submittedById: technicianUser.id,
        reviewedById: adminUser.id,
        status: MaintenanceReportStatus.APPROVED,
        summary: 'Inspección final completada y aprobada',
        diagnosis: 'Sistema estable, sin anomalías críticas.',
        workPerformed:
          'Revisión visual, verificación de conexiones y comprobación general.',
        recommendations: 'Mantener control preventivo mensual.',
        observations: 'Sin incidencias relevantes.',
        technicianNotes: 'Trabajo completado correctamente.',
        reviewNotes: 'Reporte validado por administración.',
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 30),
        laborHours: new Prisma.Decimal('2.25'),
        items: {
          create: template.items.map((item) => {
            if (item.sortOrder === 1) {
              return {
                templateItemId: item.id,
                label: item.label,
                type: item.type,
                required: item.required,
                sortOrder: item.sortOrder,
                valueText: 'Estado general correcto',
              };
            }

            if (item.sortOrder === 2) {
              return {
                templateItemId: item.id,
                label: item.label,
                type: item.type,
                required: item.required,
                sortOrder: item.sortOrder,
                valueNumber: 61,
              };
            }

            return {
              templateItemId: item.id,
              label: item.label,
              type: item.type,
              required: item.required,
              sortOrder: item.sortOrder,
              valueText: 'Se recomienda seguimiento preventivo estándar',
            };
          }),
        },
        materials: {
          create: [
            {
              name: 'Brida de fijación',
              quantity: 2,
              unit: 'ud',
              sortOrder: 1,
              notes: 'Instaladas correctamente',
            },
            {
              name: 'Tornillería',
              quantity: 6,
              unit: 'ud',
              sortOrder: 2,
            },
          ],
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        materials: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }));

  console.log('✅ Seed OK fase 3.2');
  console.log('companyId:', company.id);
  console.log('adminUserId:', adminUser.id);
  console.log('technicianUserId:', technicianUser.id);
  console.log('customer1Id:', customer1.id);
  console.log('customer2Id:', customer2.id);
  console.log('asset1Id:', asset1.id);
  console.log('asset2Id:', asset2.id);
  console.log('templateId:', template.id);
  console.log('workOrder1Id:', workOrder1.id);
  console.log('workOrder2Id:', workOrder2.id);
  console.log('workOrder3Id:', workOrder3.id);
  console.log('report2Id:', report2.id);
  console.log('report3Id:', report3.id);
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