import { ButtonLink } from './ButtonLink';

type Plan = {
  name: string;
  price: string;
  note: string;
  features: string[];
  cta: { label: string; href: string; variant?: 'primary' | 'secondary' };
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: 'Starter',
    price: '$0',
    note: 'Para evaluar el flujo.',
    features: [
      'Plantillas de mantenimiento',
      'Reportes (DRAFT/FINAL)',
      'Órdenes de trabajo básicas',
      'Multi-tenant por empresa',
    ],
    cta: { label: 'Probar 7 días', href: '/trial', variant: 'secondary' },
  },
  {
    name: 'Pro',
    price: '$—',
    note: 'Ideal para operación diaria.',
    features: [
      'Evidencias (fotos/firmas)',
      'PDF de reportes/OT',
      'Roles (RBAC simple)',
      'Historial por activo',
      'Soporte prioritario',
    ],
    cta: { label: 'Empezar trial', href: '/trial', variant: 'primary' },
    highlight: true,
  },
  {
    name: 'Business',
    price: '$—',
    note: 'Para equipos y control.',
    features: [
      'Inventario y consumo de partes',
      'Automatización (programación)',
      'Integraciones (webhooks/API)',
      'Auditoría avanzada',
    ],
    cta: { label: 'Hablar con ventas', href: '/trial', variant: 'secondary' },
  },
];

export function PricingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.name}
          className={[
            'rounded-2xl border bg-white p-6 shadow-sm',
            p.highlight ? 'border-neutral-900' : 'border-neutral-200',
          ].join(' ')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="mt-2 text-3xl font-semibold">{p.price}</div>
              <div className="mt-1 text-sm text-neutral-500">{p.note}</div>
            </div>
            {p.highlight ? (
              <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                Recomendado
              </span>
            ) : null}
          </div>

          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <ButtonLink href={p.cta.href} variant={p.cta.variant ?? 'primary'}>
              {p.cta.label}
            </ButtonLink>
          </div>
        </div>
      ))}
    </div>
  );
}
