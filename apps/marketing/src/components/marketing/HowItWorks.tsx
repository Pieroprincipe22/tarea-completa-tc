import { Section } from "./Section";

export function HowItWorks({
  items,
}: {
  items: { title: string; desc: string }[];
}) {
  return (
    <Section title="Cómo funciona" subtitle="De la orden al PDF en 3 pasos.">
      <ol className="grid gap-4 md:grid-cols-3">
        {items.map((s, idx) => (
          <li key={s.title} className="rounded-2xl border border-black/10 p-6">
            <div className="text-sm font-semibold text-slate-500">
              Paso {idx + 1}
            </div>
            <h3 className="mt-2 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}