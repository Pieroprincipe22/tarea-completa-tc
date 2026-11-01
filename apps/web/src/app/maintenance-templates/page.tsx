import Link from 'next/link';

type TeamCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function TeamCard({ title, description, href, comingSoon }: TeamCardProps) {
  const content = (
    <div className="rounded-lg border border-line bg-surface p-5 transition hover:bg-surface-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>

        {comingSoon ? (
          <span className="rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
            Próximo
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!href || comingSoon) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default function TeamPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-subtle">
              Módulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-ink">
              Personal
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Gestiona la estructura humana de la empresa: usuarios internos,
              técnicos, responsables, permisos, disponibilidad y organización del
              equipo. Esta base está pensada para crecer sin mezclar operación,
              seguridad y administración.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
            <div className="font-medium text-ink">Foco del módulo</div>
            <div className="mt-1 text-muted">
              Equipo · roles · responsables · planificación futura
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <TeamCard
          title="Usuarios"
          description="Administración de usuarios internos, acceso a módulos, permisos y perfiles operativos."
          href="/users"
          comingSoon
        />

        <TeamCard
          title="Técnicos"
          description="Equipo técnico, especialidades, asignaciones, disponibilidad y rendimiento por operación."
          href="/technicians"
          comingSoon
        />

        <TeamCard
          title="Encargados / responsables"
          description="Responsables de zona, jefes de equipo o coordinadores operativos para escalar la organización."
          href="/team/leads"
          comingSoon
        />

        <TeamCard
          title="Roles y permisos"
          description="Matriz futura de permisos por módulo, alcance por empresa y control de acciones críticas."
          href="/team/roles"
          comingSoon
        />

        <TeamCard
          title="Turnos y disponibilidad"
          description="Calendario futuro para disponibilidad técnica, guardias, ausencias y planificación de personal."
          href="/team/availability"
          comingSoon
        />

        <TeamCard
          title="Estructura del equipo"
          description="Vista de crecimiento para separar técnicos, administrativos, supervisores y perfiles mixtos."
          href="/team/structure"
          comingSoon
        />
      </section>
    </main>
  );
}