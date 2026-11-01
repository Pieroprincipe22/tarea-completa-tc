import path from "node:path";
import type { NextConfig } from "next";

// En Docker se compila en modo "standalone" (servidor mínimo sin node_modules completos).
// En local se deja como siempre para que `next dev` y `next start` no cambien.
const standalone = process.env.NEXT_OUTPUT === "standalone";

const nextConfig: NextConfig = {
  ...(standalone
    ? {
        output: "standalone" as const,
        // Raíz del monorepo, para que el trazado de dependencias encuentre todo.
        outputFileTracingRoot: path.join(__dirname, "../../"),
      }
    : {}),
  poweredByHeader: false,
};

export default nextConfig;
