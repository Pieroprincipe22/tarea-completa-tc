import { Container } from "./Container";

export function Footer({
  data,
}: {
  data: { product: string[]; company: string[]; contactEmail: string };
}) {
  return (
    <footer className="border-t border-black/10 py-10">
      <Container>
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="font-semibold">TC Mantenimiento</div>
            <p className="mt-2 text-sm text-slate-600">
              Órdenes, evidencia y PDFs para mantenimiento en campo.
            </p>
          </div>

          <div>
            <div className="font-semibold">Producto</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {data.product.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-semibold">Contacto</div>
            <p className="mt-2 text-sm text-slate-600">{data.contactEmail}</p>
          </div>
        </div>

        <div className="mt-10 text-xs text-slate-500">
          © {new Date().getFullYear()} TC Mantenimiento. Todos los derechos reservados.
        </div>
      </Container>
    </footer>
  );
}