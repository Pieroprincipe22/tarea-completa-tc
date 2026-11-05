# Inventorio (Next.js)

App de Inventorio: la usan los técnicos y el encargado en el móvil, y la oficina en el PC.

- Next.js 16 (App Router) + React 18 + Tailwind 3, igual que `apps/web`. Puerto 3004.
- `NEXT_PUBLIC_API_BASE` apunta a la API (por defecto `http://localhost:3002`). Ver `.env.example`.
- Móvil primero: diseña a 390 px de ancho y comprueba también en PC. Botones y zonas táctiles de al menos 44 px (`min-h-11`).
- Todas las llamadas a la API pasan por `apiFetch()` en `src/lib/api.ts`: añade `x-company-id`, `Authorization` y `credentials: 'include'`, y vuelve al login si la sesión caduca.
- La sesión (mismo login que PrinCore, `POST /auth/login`) se guarda con `src/lib/session.ts`.
- `InventoryProvider` comprueba la sesión y `GET /inventory/status` antes de mostrar cualquier pantalla. Dentro de una pantalla, usa `useInventory()` para la sesión y `canEdit`.
- Pantallas en `src/app/`, piezas reutilizables en `src/components/ui.tsx`, tipos y utilidades de dominio en `src/lib/inventory.ts`.
- Los tipos de `src/lib/inventory.ts` reflejan las respuestas de `apps/api/src/inventory/`: si cambias una, cambia la otra.
- Los QR de las etiquetas abren `/l/<código>`, que redirige a la ficha de la ubicación.
- Textos en español. Sin emojis en la interfaz.
- Para páginas cliente que leen la URL, usa `useParams()`; evita `useSearchParams()` sin `<Suspense>` (rompe el build).
