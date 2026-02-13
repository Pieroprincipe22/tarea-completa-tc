import Link from 'next/link';
import { Container } from '@/components/Container';
import { ButtonLink } from '@/components/ButtonLink';
import { PricingCards } from '@/components/PricingCards';
import { FAQ } from '@/components/FAQ';

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="border-b border-neutral-200 bg-white">
        <Container>
          <div className="grid gap-10 py-14 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Mantenimiento claro, ordenado y medible para pymes
              </h1>
              <p className="mt-4 text-neutral-600">
                Centraliza plantillas, reportes y órdenes de trabajo por empresa (multi-tenant),
                con trazabilidad por cliente/sede/activo.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/trial">Probar 7 días</ButtonLink>
                <ButtonLink href="/demo" variant="secondary">
                  Ver demo
                </ButtonLink>
                <ButtonLink href="/contact" variant="secondary">
                  Contacto
                </ButtonLink>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-neutral-600">
                <span className="rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
                  Multi-empresa (tenant)
                </span>
                <span className="rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
                  Reportes (DRAFT/FINAL)
                </span>
                <span className="rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
                  OT numeradas por empresa
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="text-sm font-semibold">Qué resuelve</div>
              <ul className="mt-3 space-y-3 text-sm text-neutral-700">
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black" />
                  <span>Evita trabajos “sin historial” y pérdidas de información.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black" />
                  <span>Checklist estandarizado: mismo criterio para todo el equipo.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black" />
                  <span>Seguimiento por estados en órdenes de trabajo.</span>
                </li>
              </ul>

              <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
                <div className="text-xs text-neutral-500">Roadmap cercano</div>
                <div className="mt-1 text-sm text-neutral-700">
                  Evidencias (fotos/firmas), PDFs y automatización de mantenimiento.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-14">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Cómo funciona</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Flujo simple para que el equipo opere sin fricción.
              </p>
            </div>
            <Link href="/features" className="text-sm text-neutral-700 hover:text-black">
              Ver funcionalidades →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                t: '1) Plantillas',
                d: 'Crea checklists reutilizables (por tipo de mantenimiento).',
              },
              {
                t: '2) Reportes',
                d: 'Genera reportes con snapshot del checklist (DRAFT → FINAL).',
              },
              {
                t: '3) Órdenes de trabajo',
                d: 'Crea OT numeradas por empresa y gestiona por estados.',
              },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold">{c.t}</div>
                <div className="mt-2 text-sm text-neutral-600">{c.d}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PRICING PREVIEW */}
      <section className="border-t border-neutral-200 bg-white py-14">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Planes simples</h2>
              <p className="mt-2 text-sm text-neutral-600">
                Empieza con la prueba, valida el flujo y luego eliges plan.
              </p>
            </div>
            <Link href="/pricing" className="text-sm text-neutral-700 hover:text-black">
              Ver precios →
            </Link>
          </div>

          <div className="mt-6">
            <PricingCards />
          </div>
        </Container>
      </section>

      {/* SECURITY TEASER */}
      <section className="py-14">
        <Container>
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Seguridad y aislamiento</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Diseñado para multiempresa: el backend aplica filtros tenant-aware para evitar fugas
              entre compañías, y nos preparamos para roles y auditoría.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/security" variant="secondary">
                Ver seguridad
              </ButtonLink>
              <ButtonLink href="/contact">Hablar con nosotros</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ + CTA */}
      <section className="border-t border-neutral-200 bg-white py-14">
        <Container>
          <h2 className="text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Lo esencial para entender el trial y cómo operamos.
          </p>
          <div className="mt-6">
            <FAQ />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href="/trial">Probar 7 días</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Contacto
            </ButtonLink>
          </div>
        </Container>
      </section>
    </div>
  );
}
