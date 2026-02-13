import Link from 'next/link';

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block rounded-2xl border p-5 shadow-sm hover:shadow transition">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{desc}</div>
    </Link>
  );
}

export default function DashboardCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card title="Clientes" desc="Listado (solo lectura)" href="/customers" />
      <Card title="Sedes" desc="Listado (solo lectura)" href="/sites" />
      <Card title="Equipos" desc="Listado (solo lectura)" href="/assets" />
      <Card title="Plantillas" desc="Listado (solo lectura)" href="/maintenance-templates" />
    </div>
  );
}
