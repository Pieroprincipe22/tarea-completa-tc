import Link from "next/link";
import { resolveCoreNavItems } from "@/lib/tc/api";

export default function Page() {
  const items = resolveCoreNavItems();

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.path}
            className="rounded-2xl border p-3 hover:bg-black/5"
          >
            <div className="font-medium">{it.title}</div>
            <div className="text-xs opacity-70">{it.path}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
