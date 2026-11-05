# Inventorio — plan de la v1

Inventorio es el segundo programa de AnPi Tech. Sirve para saber qué material hay, dónde está y quién lo mueve, y así dejar de comprar lo que ya se tiene. El cliente piloto es el trastero de una instaladora de climatización.

Informe completo (con diagramas): <https://claude.ai/artifact/S7uYVqFP4kMxjQAFwKh21k>
Bocetos de pantallas: <https://claude.ai/artifact/8CNQKJAnhfmD23Ur91zHU4>

## Decisiones tomadas

- Vive en este monorepo: misma API (`apps/api`, módulo `src/inventory/`), misma base de datos, mismo login y mismas empresas que PrinCore.
- Frontend propio en `apps/inventario` (Next.js), móvil primero. Se instalará como PWA en el hito 3.
- Cada empresa activa los programas que contrata en `CompanyProduct` (`MAINTENANCE`, `INVENTORY`), con su plan.
- Roles: se reutilizan los de PrinCore. `ADMIN` y `SUPER_ADMIN` hacen de encargado (catálogo, ubicaciones, ajustes). `TECHNICIAN` busca, saca y traspasa. El rol de oficina se decide más adelante.
- El stock nunca se edita a mano: todo cambio es un movimiento con usuario y fecha.
- Las fotos usan la tabla `Attachment` existente (`ownerType = INVENTORY_PART`) y MinIO.

## Hitos

### Hito 1 · Saber qué hay (55–75 h)

Meta: el trastero cargado, con las piezas dadas de alta y los QR puestos.

- [x] Modelo de datos y migración
- [x] `CompanyProduct` y `InventoryProductGuard`
- [x] Categorías (con las 8 iniciales)
- [x] Ubicaciones: almacén → estantería → balda, y furgonetas
- [x] Etiquetas QR imprimibles por ubicación
- [x] App `apps/inventario` con el login de PrinCore
- [ ] Ficha de pieza: nombre, referencia, marca, categoría, unidad, formato de compra, notas
- [ ] Apodos y códigos de barras por pieza
- [ ] Fotos de pieza (subida comprimida desde el móvil)
- [ ] Stock mínimo y estado OK / Bajo / Agotado
- [ ] Buscador (sin tildes y con errores pequeños)
- [ ] Escáner de códigos de barras y QR (`@zxing/browser`)
- [ ] Alta rápida para la carga inicial, balda a balda
- [ ] Consulta sin señal (catálogo y stock guardados en el móvil)

### Hito 2 · Quién lo mueve (40–55 h)

Meta: los técnicos registran sus salidas con la app.

- [ ] Entradas, salidas, traspasos y ajustes, con usuario y fecha automáticos
- [ ] Historial por pieza, usuario y ubicación
- [ ] "Mi furgoneta"
- [ ] Préstamo de herramientas
- [ ] Registro sin señal con cola y `clientId`
- [ ] Pantalla Revisar para movimientos que no cuadraron al sincronizar

### Hito 3 · Oficina y compras (40–55 h)

Meta: la oficina consulta y pide desde la app.

- [ ] Tabla de inventario con filtros y exportar a Excel (`exceljs`)
- [ ] Lista para pedir (automática por stock mínimo y manual)
- [ ] Aviso al pedir algo que ya hay en stock
- [ ] PWA instalable en Android e iPhone
- [ ] Pruebas con el equipo y despliegue

## Modelo de datos

Todas las tablas llevan `companyId`.

| Modelo | Para qué |
| --- | --- |
| `CompanyProduct` | Programas activos de cada empresa y su plan |
| `InventoryCategory` | Agrupar piezas |
| `InventoryPart` | Pieza del catálogo, con `searchText` para el buscador |
| `InventoryPartAlias` | Otros nombres con los que se busca una pieza |
| `InventoryPartBarcode` | Códigos de barras (únicos por empresa) |
| `InventoryLocation` | Almacén, estantería, balda o furgoneta, con código corto (E1-B2) |
| `InventoryStock` | Cantidad por pieza y ubicación |
| `InventoryMovement` | Entrada, salida, traspaso, ajuste o carga inicial |
| `InventoryPurchaseItem` | Lista para pedir |

## Endpoints disponibles

| Método | Ruta | Quién |
| --- | --- | --- |
| GET | `/inventory/status` | Cualquier usuario de la empresa |
| POST | `/inventory/activation` | `SUPER_ADMIN` |
| DELETE | `/inventory/activation` | `SUPER_ADMIN` |
| GET | `/inventory/categories` | Todos |
| POST | `/inventory/categories` | `ADMIN`, `SUPER_ADMIN` |
| POST | `/inventory/categories/defaults` | `ADMIN`, `SUPER_ADMIN` |
| PATCH | `/inventory/categories/:id` | `ADMIN`, `SUPER_ADMIN` |
| GET | `/inventory/locations` | Todos |
| GET | `/inventory/locations/:id` | Todos |
| GET | `/inventory/locations/by-code/:code` | Todos |
| POST | `/inventory/locations` | `ADMIN`, `SUPER_ADMIN` |
| PATCH | `/inventory/locations/:id` | `ADMIN`, `SUPER_ADMIN` |

## Fuera de la v1

Unión con las órdenes de trabajo de PrinCore, proveedores y pedidos con precios, valor del stock en euros, control de botellas de refrigerante, facturación de Inventorio, avisos por email, datos rellenados desde el código de barras, recuentos guiados, informe de consumo por obra y app nativa.

## Pendiente de decidir

- [ ] Nombre definitivo del producto
- [ ] Rol de oficina: ¿nuevo rol o `ADMIN` con menos permisos?
- [ ] VPS y dominio para el despliegue
- [ ] Cobertura o wifi en el trastero
- [ ] Quién hace la carga inicial y cuándo
