# AnPi Tech — monorepo

Plataforma SaaS multiempresa de AnPi Tech. Dos programas comparten login, empresas y API:

- **PrinCore** (mantenimiento): clientes, sitios, activos, plantillas, partes, órdenes de trabajo y facturas.
- **Inventorio** (materiales y almacén): en construcción. El plan está en `docs/inventario/PLAN.md`.

## Estructura

| Carpeta | Qué es | Puerto |
| --- | --- | --- |
| `apps/api` | NestJS 11 + Prisma 6 + PostgreSQL. API de los dos programas | 3002 |
| `apps/web` | Next.js 16. Panel de PrinCore | 3001 |
| `apps/inventario` | Next.js 16. App de Inventorio, móvil primero | 3004 |
| `apps/marketing` | Next.js 16. Web pública | 3003 |
| `apps/mobile` | Expo. Lee `apps/mobile/AGENTS.md` antes de tocarla | — |
| `infra/docker-compose.yml` | PostgreSQL (5433), Redis (6379) y MinIO (9000/9001) para desarrollo | — |
| `e2e/` | Pruebas Playwright | — |

## Comandos (desde la raíz)

- `pnpm install`
- `docker compose -f infra/docker-compose.yml up -d`
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`
- `pnpm dev` arranca todas las apps
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (tests unitarios de la API), `pnpm e2e`

`pnpm lint` en `apps/api` ejecuta `eslint --fix`: revisa el diff después de lanzarlo.

CI (`.github/workflows/ci.yml`) ejecuta typecheck, lint, tests y e2e en cada pull request a `main`.

## Reglas

- Toda entidad de negocio lleva `companyId` y se filtra siempre por él.
- El `companyId` sale de `@Tenant()`, que rellena `TenantGuard` (guard global). Nunca del body ni de la query.
- `TenantGuard` exige `x-company-id` y un token (cookie `tc_access` o `Authorization: Bearer`). Un `SUPER_ADMIN` puede entrar en cualquier empresa activa y queda registrado en `AuditLog`.
- Roles en `UserCompany.role`: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`. Para restringir un endpoint: `@UseGuards(RolesGuard)` + `@Roles(...)`.
- Los endpoints de Inventorio pasan además por `InventoryProductGuard`: la empresa necesita el producto `INVENTORY` activo en `CompanyProduct`.
- DTOs con `class-validator`. El `ValidationPipe` global usa `whitelist` y `forbidNonWhitelisted`.
- Textos de la interfaz y mensajes de error para el usuario, en español.
- Nunca edites una migración que ya está en `main`: crea una nueva.
- No subas `.env` ni secretos.
- Cambios pequeños, cada uno en su rama y con pull request a `main`. No rompas los CRUD existentes.
