import { Section } from "./Section";

type FAQItem = {
  readonly q: string;
  readonly a: string;
};

export function FAQ({
  items,
}: {
  items: readonly FAQItem[];
}) {
  return (
    <Section title="FAQ" subtitle="Preguntas comunes antes de empezar.">
      <div className="space-y-3">
        {items.map((x) => (
          <details
            key={x.q}
            className="rounded-2xl border border-black/10 p-5"
          >
            <summary className="cursor-pointer font-semibold">{x.q}</summary>
            <p className="mt-2 text-sm text-slate-600">{x.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}