import Link from 'next/link';

type UserCardProps = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

function UserCard({
  title,
  description,
  href,
  comingSoon,
}: UserCardProps) {
  const content = (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:bg-slate-800/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {comingSoon ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
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

export default function UsersPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Submódulo
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Usuarios
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Este bloque centraliza la gestión de usuarios internos de la
              empresa: accesos, permisos, estado, rol operativo y trazabilidad.
              Está pensado para crecer luego hacia control de permisos por
              módulo, perfiles mixtos y seguridad por empresa.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Foco del submódulo</div>
            <div className="mt-1 text-slate-400">
              acceso · roles · seguridad · usuarios internos
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <UserCard
          title="Listado de usuarios"
          description="Vista futura para consultar usuarios activos, inactivos, rol, empresa y estado de acceso."
          href="/users/list"
          comingSoon
        />

        <UserCard
          title="Alta de usuario"
          description="Creación futura de usuarios administrativos, técnicos, supervisores o perfiles mixtos."
          href="/users/new"
          comingSoon
        />

        <UserCard
          title="Roles y permisos"
          description="Base futura para definir permisos por módulo, acciones críticas y alcance por tenant."
          href="/users/roles"
          comingSoon
        />

        <UserCard
          title="Estado y activación"
          description="Control futuro de activación, desactivación, bloqueo de acceso y ciclo de vida del usuario."
          href="/users/status"
          comingSoon
        />

        <UserCard
          title="Historial de acceso"
          description="Trazabilidad futura de accesos, actividad y auditoría administrativa."
          href="/users/audit"
          comingSoon
        />

        <UserCard
          title="Perfiles operativos"
          description="Estructura futura para separar administrativos, técnicos, responsables y coordinadores."
          href="/users/profiles"
          comingSoon
        />
      </section>
    </main>
  );
}