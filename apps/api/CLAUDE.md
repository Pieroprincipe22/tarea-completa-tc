# API (NestJS)

## Convenciones

- Un módulo por recurso en `src/<recurso>/`: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` y los `*.spec.ts` junto a cada archivo.
- `PrismaService` se importa de `src/database/prisma.service` (módulo global). `src/prisma/` es un duplicado antiguo: no lo uses.
- Los servicios reciben `companyId` como primer argumento y lo ponen en cada `where`.
- Para leer por id: `findFirst({ where: { id, companyId } })`. Nunca `findUnique({ where: { id } })` sin empresa.
- Límites de plan: `src/common/plan-limits.ts` y `PlanLimitsService`.
- Tests con Jest y `PrismaService` simulado. Cada servicio nuevo incluye un test que demuestra que no lee ni modifica datos de otra empresa.

## Inventorio (`src/inventory/`)

- `InventoryProductGuard` se aplica a todos los controllers de Inventorio salvo `GET /inventory/status`.
- Escrituras de catálogo y ubicaciones: `ADMIN` y `SUPER_ADMIN`. Lectura: todos los roles.
- El stock (`InventoryStock`) solo cambia a través de un `InventoryMovement`, dentro de la misma `$transaction`.
- Cantidades en `Decimal(12,3)`: el cobre va en metros y el gas en kilos.
- `InventoryMovement.clientId` es único por empresa. Lo genera el móvil para no duplicar movimientos al sincronizar sin señal.
- Piezas y ubicaciones con historial no se borran: se archivan (`isArchived` / `isActive`).
- `InventoryPart.searchText` se recalcula en el servicio con `buildSearchText()` (minúsculas, sin tildes) a partir de nombre, referencia, marca y apodos. Tiene un índice GIN de trigramas (`pg_trgm`).
- Jerarquía de ubicaciones: `WAREHOUSE` → `RACK` → `SHELF`. `VAN` va suelta y puede tener un técnico asignado.
- Las fotos de piezas usan `Attachment` con `ownerType = INVENTORY_PART`.

## Prisma

- `pnpm --filter api db:migrate` crea y aplica migraciones en local (necesita la base de datos de `infra/`).
- La migración que activa `pg_trgm` la crea con `CREATE EXTENSION IF NOT EXISTS`.
