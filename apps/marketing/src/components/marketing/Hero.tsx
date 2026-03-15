import { Container } from "./Container";
import { Button } from "./Button";

export function Hero({
  data,
}: {
  data: {
    title: string;
    subtitle: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    note?: string;
  };
}) {
  return (
    <section className="py-16">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              {data.title}
            </h1>
            <p className="mt-4 text-lg text-slate-600">{data.subtitle}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button href={data.primaryCta.href} variant="primary">
                {data.primaryCta.label}
              </Button>
              <Button href={data.secondaryCta.href} variant="secondary">
                {data.secondaryCta.label}
              </Button>
            </div>

            {data.note ? (
              <p className="mt-4 text-sm text-slate-500">{data.note}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-black/10 bg-gradient-to-b from-black/5 to-transparent p-6">
            <div className="aspect-[16/10] w-full rounded-xl border border-black/10 bg-white" />
            <p className="mt-3 text-xs text-slate-500">
              (Placeholder) Aquí va screenshot del dashboard/app.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}