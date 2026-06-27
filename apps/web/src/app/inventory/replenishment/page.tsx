import Link from 'next/link';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const replenishmentRows = [
  {
    material: 'Gas refrigerante R-410A',
    sku: 'GAS-R410A',
    currentStock: '2 unidades',
    minimumStock: '10 unidades',
    suggested: '8 unidades',
    priority: 'CRITICAL',
    reason: 'Stock crítico por debajo del mínimo.',
  },
  {
    material: 'Correa 4PK 1230',
    sku: 'COR-4PK1230',
    currentStock: '8 unidades',
    minimumStock: '15 unidades',
    suggested: '7 unidades',
    priority: 'HIGH',
    reason: 'Material frecuente en órdenes HVAC.',
  },
  {
    material: 'Compresor Copeland ZR57',
    sku: 'COMP-ZR57',
    currentStock: '5 unidades',
    minimumStock: '5 unidades',
    suggested: '2 unidades',
    priority: 'MEDIUM',
    reason: 'Stock justo en el mínimo definido.',
  },
];

const ruleCards = [
  {
    title: 'Stock mínimo',
    description: 'Aviso automático cuando el material baja del mínimo definido.',
    tone: 'amber',
  },
  {
    title: 'Material crítico',
    description: 'Repuestos que no deberían faltar por impacto operativo.',
    tone: 'rose',
  },
  {
    title: 'Consumo histórico',
    description: 'Futura sugerencia basada en uso por órdenes de trabajo.',
    tone: 'sky',
  },
  {
    title: 'Reposición sugerida',
    description: 'Cantidad recomendada para volver a un nivel seguro.',
    tone: 'emerald',
  },
];

function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21 12a9 9 0 0 1-15.2 6.5" />
      <path d="M3 12A9 9 0 0 1 18.2 5.5" />
      <path d="M18 2v4h-4" />
      <path d="M6 22v-4h4" />
    </svg>
  );
}

function AlertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.4 2.8 17.5A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.5L13.7 4.4a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m21 21-4.3-4.3" />
      <path d="M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function priorityBadge(priority: string) {
  if (priority === 'CRITICAL') {
    return (
      <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-300">
        Crítica
      </span>
    );
  }

  if (priority === 'HIGH') {
    return (
      <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
        Alta
      </span>
    );
  }

  return (
    <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-300">
      Media
    </span>
  );
}

function toneClass(tone: string) {
  if (tone === 'emerald') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300';
  if (tone === 'amber') return 'border-amber-400/25 bg-amber-500/10 text-amber-300';
  if (tone === 'rose') return 'border-rose-400/25 bg-rose-500/10 text-rose-300';

  return 'border-sky-400/25 bg-sky-500/10 text-sky-300';
}

function KpiCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'sky' | 'emerald' | 'amber' | 'rose';
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/45 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.13),transparent_34%)]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-4 text-3xl font-black tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${toneClass(tone)}`}>
          <RefreshIcon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

export default function InventoryReplenishmentPage() {
  return (
    <main className="min-h-[calc(100vh-86px)] flex-1 bg-slate-950 px-6 py-8 text-slate-100 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-400/30 bg-rose-500/10 text-rose-300 shadow-[0_0_45px_rgba(244,63,94,0.14)]">
              <RefreshIcon className="h-9 w-9" />
            </div>

            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-rose-300">
                Inventario
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
                Reposición
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Control de mínimos, material crítico y necesidades sugeridas de reposición.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-black text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10"
            >
              Volver a inventario
            </Link>

            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-black text-white opacity-60 shadow-[0_0_35px_rgba(244,63,94,0.20)]"
              title="Se activará cuando conectemos reglas reales de reposición."
            >
              <PlusIcon className="h-4 w-4" />
              Crear reposición
            </button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-4">
          <KpiCard
            label="Reposiciones sugeridas"
            value="3"
            description="Material por debajo del nivel seguro."
            tone="rose"
          />
          <KpiCard
            label="Material crítico"
            value="1"
            description="Elemento con prioridad operativa alta."
            tone="amber"
          />
          <KpiCard
            label="Stock en mínimo"
            value="1"
            description="Material justo en el límite definido."
            tone="sky"
          />
          <KpiCard
            label="Reglas activas"
            value="0"
            description="Pendiente de conectar con backend."
            tone="emerald"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/45 shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
            <div className="flex flex-col gap-4 border-b border-slate-800/90 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Necesidades de reposición</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Vista preparada para calcular reposición según stock mínimo y consumo.
                </p>
              </div>

              <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-400">
                <SearchIcon className="h-4 w-4" />
                Buscar material...
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/90 bg-slate-950/35 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Material</th>
                    <th className="px-5 py-4">Stock actual</th>
                    <th className="px-5 py-4">Stock mínimo</th>
                    <th className="px-5 py-4">Sugerido</th>
                    <th className="px-5 py-4">Prioridad</th>
                    <th className="px-5 py-4">Motivo</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {replenishmentRows.map((row) => (
                    <tr
                      key={row.sku}
                      className="border-b border-slate-800/70 last:border-0 hover:bg-rose-500/[0.04]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-100">{row.material}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.sku}</p>
                      </td>

                      <td className="px-5 py-4 font-black text-white">
                        {row.currentStock}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {row.minimumStock}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                          {row.suggested}
                        </span>
                      </td>

                      <td className="px-5 py-4">{priorityBadge(row.priority)}</td>

                      <td className="px-5 py-4 text-slate-300">{row.reason}</td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled
                          className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-black text-slate-500"
                        >
                          Crear compra
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800/90 p-5">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-sm font-black text-rose-300">
                  Datos visuales temporales
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Esta pantalla será automática cuando exista stock real y reglas de reposición.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800/90 bg-slate-900/45 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
              <h2 className="text-lg font-black text-white">Reglas de reposición</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                El sistema podrá sugerir compras según mínimos, prioridad, consumo y frecuencia de uso.
              </p>

              <div className="mt-6 space-y-3">
                {ruleCards.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClass(item.tone)}`}>
                        <AlertIcon className="h-5 w-5" />
                      </div>
                      <p className="font-black text-slate-100">{item.title}</p>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800/90 bg-slate-900/45 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
              <h2 className="text-lg font-black text-white">Modelo futuro</h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                  <p className="text-sm font-black text-sky-300">
                    ReplenishmentRule
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Reglas por material: mínimo, máximo, prioridad y proveedor preferido.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-black text-emerald-300">
                    Compra sugerida
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Conversión futura de reposición en compra real.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}