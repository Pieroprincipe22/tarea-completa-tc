import { Container } from "./Container";
import { Button } from "./Button";

export function CTA() {
  return (
    <section className="py-16">
      <Container>
        <div className="rounded-2xl border border-black/10 bg-black p-8 text-white">
          <h2 className="text-3xl font-semibold tracking-tight">
            ¿Listo para ordenar tu mantenimiento?
          </h2>
          <p className="mt-2 text-white/80">
            Agenda una demo y te mostramos el flujo completo (orden → evidencia → PDF).
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="mailto:contacto@tu-dominio.com?subject=Quiero%20una%20demo" variant="secondary">
              Escribir por email
            </Button>
            <Button href="#producto" variant="secondary">
              Ver producto
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}