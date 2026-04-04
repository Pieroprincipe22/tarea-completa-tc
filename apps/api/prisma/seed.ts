import {
  MaintenanceItemStatus,
  MaintenanceItemType,
  MaintenanceReportState,
  MaintenanceReportStatus,
  Prisma,
  PrismaClient,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

async function ensureUserMembership(
  userId: string,
  companyId: string,
  role: UserRole,
) {
  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    update: {
      role,
      active: true,
    },
    create: {
      userId,
      companyId,
      role,
      active: true,
    },
  });
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

  await ensureUserMembership(adminUser.id, company.id, UserRole.ADMIN);
  await ensureUserMembership(technicianUser.id, company.id, UserRole.TECHNICIAN);

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

  const site1 =
    (await prisma.site.findFirst({
      where: {
        companyId: company.id,
        customerId: customer1.id,
        name: 'Sala Técnica Cliente 1',
      },
    })) ??
    (await prisma.site.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        name: 'Sala Técnica Cliente 1',
        address: 'Dirección demo 1',
        city: 'Madrid',
        country: 'España',
        notes: 'Site principal de pruebas del cliente 1',
        isActive: true,
      },
    }));

  const site2 =
    (await prisma.site.findFirst({
      where: {
        companyId: company.id,
        customerId: customer2.id,
        name: 'Cuarto Eléctrico Cliente 2',
      },
    })) ??
    (await prisma.site.create({
      data: {
        companyId: company.id,
        customerId: customer2.id,
        name: 'Cuarto Eléctrico Cliente 2',
        address: 'Dirección demo 2',
        city: 'Barcelona',
        country: 'España',
        notes: 'Site principal de pruebas del cliente 2',
        isActive: true,
      },
    }));

  await prisma.contact.upsert({
    where: {
      id:
        (
          await prisma.contact.findFirst({
            where: {
              companyId: company.id,
              siteId: site1.id,
              email: 'mantenimiento.cliente1@demo.local',
            },
            select: { id: true },
          })
        )?.id ?? 'missing-contact-1',
    },
    update: {
      name: 'Encargado Cliente 1',
      phone: '600111111',
      isMain: true,
      notes: 'Contacto principal cliente 1',
    },
    create: {
      companyId: company.id,
      siteId: site1.id,
      name: 'Encargado Cliente 1',
      email: 'mantenimiento.cliente1@demo.local',
      phone: '600111111',
      role: 'Responsable de mantenimiento',
      isMain: true,
      notes: 'Contacto principal cliente 1',
    },
  }).catch(async () => {
    const existing = await prisma.contact.findFirst({
      where: {
        companyId: company.id,
        siteId: site1.id,
        email: 'mantenimiento.cliente1@demo.local',
      },
    });

    if (!existing) throw new Error('No se pudo asegurar el contacto 1');
  });

  await prisma.contact.upsert({
    where: {
      id:
        (
          await prisma.contact.findFirst({
            where: {
              companyId: company.id,
              siteId: site2.id,
              email: 'mantenimiento.cliente2@demo.local',
            },
            select: { id: true },
          })
        )?.id ?? 'missing-contact-2',
    },
    update: {
      name: 'Encargado Cliente 2',
      phone: '600222222',
      isMain: true,
      notes: 'Contacto principal cliente 2',
    },
    create: {
      companyId: company.id,
      siteId: site2.id,
      name: 'Encargado Cliente 2',
      email: 'mantenimiento.cliente2@demo.local',
      phone: '600222222',
      role: 'Responsable de mantenimiento',
      isMain: true,
      notes: 'Contacto principal cliente 2',
    },
  }).catch(async () => {
    const existing = await prisma.contact.findFirst({
      where: {
        companyId: company.id,
        siteId: site2.id,
        email: 'mantenimiento.cliente2@demo.local',
      },
    });

    if (!existing) throw new Error('No se pudo asegurar el contacto 2');
  });

  const asset1 =
    (await prisma.asset.findFirst({
      where: {
        companyId: company.id,
        customerId: customer1.id,
        siteId: site1.id,
        name: 'Bomba Principal',
      },
    })) ??
    (await prisma.asset.create({
      data: {
        companyId: company.id,
        customerId: customer1.id,
        siteId: site1.id,
        name: 'Bomba Principal',
        code: 'ASSET-001',
        internalCode: 'INT-BOMBA-001',
        category: 'Bombas',
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
        siteId: site2.id,
        name: 'Tablero Eléctrico',
      },
    })) ??
    (await prisma.asset.create({
      data: {
        companyId: company.id,
        customerId: customer2.id,
        siteId: site2.id,
        name: 'Tablero Eléctrico',
        code: 'ASSET-002',
        internalCode: 'INT-TABLERO-001',
        category: 'Electricidad',
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
        title: 'Checklist Preventivo Base',
        description: 'Template demo para reportes de mantenimiento',
        isActive: true,
        items: {
          create: [
            {
              label: 'Inspección visual general',
              title: 'Inspección visual general',
              type: MaintenanceItemType.TEXT,
              valueType: 'TEXT',
              required: true,
              sortOrder: 1,
              itemOrder: 1,
              helpText: 'Revisar el estado visible general del equipo',
              placeholder: 'Sin daños visibles / con observaciones',
            },
            {
              label: 'Presión medida',
              title: 'Presión medida',
              type: MaintenanceItemType.NUMBER,
              valueType: 'NUMBER',
              required: false,
              sortOrder: 2,
              itemOrder: 2,
              helpText: 'Registrar el valor de presión tomado en campo',
              placeholder: 'Ej. 58',
            },
            {
              label: 'Observaciones técnicas',
              title: 'Observaciones técnicas',
              type: MaintenanceItemType.LONG_TEXT,
              valueType: 'LONG_TEXT',
              required: false,
              sortOrder: 3,
              itemOrder: 3,
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
        siteId: site1.id,
        assetId: asset1.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        assignedToUserId: technicianUser.id,
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
        siteId: site1.id,
        assetId: asset1.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        assignedToUserId: technicianUser.id,
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
        siteId: site2.id,
        assetId: asset2.id,
        createdById: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        assignedToUserId: technicianUser.id,
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
        customerId: customer1.id,
        siteId: site1.id,
        assetId: asset1.id,
        createdById: adminUser.id,
        createdByUserId: adminUser.id,
        assignedTechnicianId: technicianUser.id,
        status: MaintenanceReportStatus.IN_PROGRESS,
        state: MaintenanceReportState.DRAFT,
        title: 'Parte correctivo bomba principal',
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
                title: item.title,
                description: item.description,
                type: item.type,
                valueType: item.valueType,
                required: item.required,
                sortOrder: item.sortOrder,
                itemOrder: item.itemOrder,
                unit: item.unit,
                status: MaintenanceItemStatus.OK,
                valueText: 'Inspección completada con desgaste visible en sello',
                value: 'Inspección completada con desgaste visible en sello',
              };
            }

            if (item.sortOrder === 2) {
              return {
                templateItemId: item.id,
                label: item.label,
                title: item.title,
                description: item.description,
                type: item.type,
                valueType: item.valueType,
                required: item.required,
                sortOrder: item.sortOrder,
                itemOrder: item.itemOrder,
                unit: item.unit,
                status: MaintenanceItemStatus.OK,
                valueNumber: 58,
                value: '58',
              };
            }

            return {
              templateItemId: item.id,
              label: item.label,
              title: item.title,
              description: item.description,
              type: item.type,
              valueType: item.valueType,
              required: item.required,
              sortOrder: item.sortOrder,
              itemOrder: item.itemOrder,
              unit: item.unit,
              status: MaintenanceItemStatus.PENDING,
              valueText: 'Pendiente sustitución de repuesto para cierre final',
              value: 'Pendiente sustitución de repuesto para cierre final',
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
        customerId: customer2.id,
        siteId: site2.id,
        assetId: asset2.id,
        createdById: adminUser.id,
        createdByUserId: adminUser.id,
        completedByUserId: technicianUser.id,
        assignedTechnicianId: technicianUser.id,
        submittedById: technicianUser.id,
        reviewedById: adminUser.id,
        status: MaintenanceReportStatus.APPROVED,
        state: MaintenanceReportState.FINAL,
        title: 'Parte final tablero eléctrico',
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
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        reviewedAt: new Date(Date.now() - 1000 * 60 * 30),
        laborHours: new Prisma.Decimal('2.25'),
        items: {
          create: template.items.map((item) => {
            if (item.sortOrder === 1) {
              return {
                templateItemId: item.id,
                label: item.label,
                title: item.title,
                description: item.description,
                type: item.type,
                valueType: item.valueType,
                required: item.required,
                sortOrder: item.sortOrder,
                itemOrder: item.itemOrder,
                unit: item.unit,
                status: MaintenanceItemStatus.OK,
                valueText: 'Estado general correcto',
                value: 'Estado general correcto',
              };
            }

            if (item.sortOrder === 2) {
              return {
                templateItemId: item.id,
                label: item.label,
                title: item.title,
                description: item.description,
                type: item.type,
                valueType: item.valueType,
                required: item.required,
                sortOrder: item.sortOrder,
                itemOrder: item.itemOrder,
                unit: item.unit,
                status: MaintenanceItemStatus.OK,
                valueNumber: 61,
                value: '61',
              };
            }

            return {
              templateItemId: item.id,
              label: item.label,
              title: item.title,
              description: item.description,
              type: item.type,
              valueType: item.valueType,
              required: item.required,
              sortOrder: item.sortOrder,
              itemOrder: item.itemOrder,
              unit: item.unit,
              status: MaintenanceItemStatus.OK,
              valueText: 'Se recomienda seguimiento preventivo estándar',
              value: 'Se recomienda seguimiento preventivo estándar',
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
  console.log('site1Id:', site1.id);
  console.log('site2Id:', site2.id);
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