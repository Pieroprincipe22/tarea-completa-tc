import { Section } from "./Section";

type FeatureItem = {
  readonly title: string;
  readonly desc: string;
};

export function Features({
  items,
}: {
  items: readonly FeatureItem[];
}) {
  return (
    <Section
      title="Producto"
      subtitle="Lo esencial para operar mantenimiento con trazabilidad y evidencia."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((f) => (
          <div key={f.title} className="rounded-2xl border border-black/10 p-6">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}