import Link from "next/link";
import { Container } from "./Container";
import { Button } from "./Button";

export function Header({
  nav,
}: {
  nav: { label: string; href: string }[];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            TC Mantenimiento
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-slate-700 hover:text-black">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button href="#demo" variant="primary">Pedir demo</Button>
          </div>
        </div>
      </Container>
    </header>
  );
}