import { Container } from "./Container";

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-16">
      <Container>
        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
        </div>
        {children}
      </Container>
    </section>
  );
}