import { ForbiddenException } from '@nestjs/common';
import { MaintenanceReportsService } from './maintenance-reports.service';

// Estas reglas deciden quién puede tocar un parte de mantenimiento: son
// la última barrera antes de que un técnico pueda editar el trabajo de
// otro técnico, o un no-admin pueda aprobar/rechazar un parte. Se
// prueban directamente (casteando a `any`) porque son métodos privados
// de lógica pura, sin I/O — no hace falta mockear Prisma para esto.

type Actor = {
  id: string;
  email: string;
  name: string | null;
  userRole: 'ADMIN' | 'TECHNICIAN' | 'SUPER_ADMIN' | null;
  companyRole: 'ADMIN' | 'TECHNICIAN' | 'SUPER_ADMIN';
};

function makeActor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: 'user-1',
    email: 'tecnico@x.com',
    name: 'Técnico',
    userRole: null,
    companyRole: 'TECHNICIAN',
    ...overrides,
  };
}

describe('MaintenanceReportsService — permisos', () => {
  let service: any;

  beforeEach(() => {
    service = new MaintenanceReportsService({} as any);
  });

  describe('isAdmin()', () => {
    it('es admin si el rol EN LA EMPRESA es ADMIN', () => {
      expect(service.isAdmin(makeActor({ companyRole: 'ADMIN' }))).toBe(true);
    });

    it('es admin si el rol EN LA EMPRESA es SUPER_ADMIN', () => {
      expect(service.isAdmin(makeActor({ companyRole: 'SUPER_ADMIN' }))).toBe(true);
    });

    it('es admin si el rol GLOBAL del usuario es ADMIN aunque en la empresa sea técnico', () => {
      expect(
        service.isAdmin(makeActor({ companyRole: 'TECHNICIAN', userRole: 'ADMIN' })),
      ).toBe(true);
    });

    it('un técnico normal no es admin', () => {
      expect(
        service.isAdmin(makeActor({ companyRole: 'TECHNICIAN', userRole: null })),
      ).toBe(false);
    });
  });

  describe('ensureAssignedTechnicianOrAdmin()', () => {
    it('un admin puede tocar cualquier parte, tenga o no técnico asignado', () => {
      const admin = makeActor({ companyRole: 'ADMIN' });
      expect(() =>
        service.ensureAssignedTechnicianOrAdmin(admin, null),
      ).not.toThrow();
      expect(() =>
        service.ensureAssignedTechnicianOrAdmin(admin, 'otro-tecnico'),
      ).not.toThrow();
    });

    it('rechaza a un técnico si el parte todavía no tiene técnico asignado', () => {
      const tech = makeActor({ id: 'tech-1' });
      expect(() =>
        service.ensureAssignedTechnicianOrAdmin(tech, null),
      ).toThrow(ForbiddenException);
    });

    it('rechaza a un técnico si el parte está asignado a OTRO técnico', () => {
      const tech = makeActor({ id: 'tech-1' });
      expect(() =>
        service.ensureAssignedTechnicianOrAdmin(tech, 'tech-2'),
      ).toThrow(ForbiddenException);
    });

    it('permite al técnico asignado tocar su propio parte', () => {
      const tech = makeActor({ id: 'tech-1' });
      expect(() =>
        service.ensureAssignedTechnicianOrAdmin(tech, 'tech-1'),
      ).not.toThrow();
    });
  });

  describe('ensureAdmin()', () => {
    it('rechaza a un técnico intentando revisar/aprobar un parte', () => {
      const tech = makeActor();
      expect(() => service.ensureAdmin(tech)).toThrow(ForbiddenException);
    });

    it('permite a un admin revisar/aprobar', () => {
      const admin = makeActor({ companyRole: 'ADMIN' });
      expect(() => service.ensureAdmin(admin)).not.toThrow();
    });
  });
});
