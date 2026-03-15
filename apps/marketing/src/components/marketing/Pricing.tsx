import { Section } from "./Section";
import { Button } from "./Button";

export function Pricing({
  plans,
}: {
  plans: {
    name: string;
    price: string;
    period: string;
    features: string[];
    cta: string;
    highlight?: boolean;
  }[];
}) {
  return (
    <Section title="Precios" subtitle="Planes claros, sin complicaciones.">
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl border p-6 ${
              p.highlight ? "border-black" : "border-black/10"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              {p.highlight ? (
                <span className="rounded-full bg-black px-2 py-1 text-xs text-white">
                  Recomendado
                </span>
              ) : null}
            </div>

            <div className="mt-4 text-3xl font-semibold">
              {p.price} <span className="text-sm font-normal text-slate-500">{p.period}</span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

            <div className="mt-6">
              <Button href="#demo" variant={p.highlight ? "primary" : "secondary"}>
                {p.cta}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}