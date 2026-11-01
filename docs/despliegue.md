# Despliegue de AnPi Tech en producción

Todo corre con Docker Compose en un único servidor Linux (VPS o el todo-en-uno):
Postgres, API, web, Caddy (HTTPS automático) y un servicio de copias de seguridad.

```
Internet ──► Caddy :443 ──► app.tudominio.com ─► web (Next.js :3001)
                        └─► api.tudominio.com ─► api (NestJS :3002) ─► postgres
                                                                    └─► S3 (MinIO o R2)
```

## 1. Requisitos

- Servidor con Ubuntu 24.04 o 26.04, 2 GB de RAM como mínimo (4 GB recomendado para compilar).
- Docker Engine y el plugin de Compose.
- Puertos 80 y 443 abiertos hacia el servidor.
- Registros DNS tipo A apuntando a la IP pública del servidor:
  `app.tudominio.com`, `api.tudominio.com` y, con MinIO, `files.tudominio.com`. Tienen que ser del **mismo dominio**,
  porque la cookie de sesión funciona entre subdominios del mismo sitio.

## 2. Primera puesta en marcha

```bash
git clone https://github.com/Pieroprincipe22/tarea-completa-tc.git anpi-tech
cd anpi-tech
cp infra/env.prod.example infra/.env.prod
nano infra/.env.prod        # rellena dominios y genera los secretos
```

Arranca (la primera vez tarda varios minutos en compilar):

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod --profile minio up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod ps
```

Sin `--profile minio` no se arranca MinIO y hay que usar un S3 externo (por ejemplo Cloudflare R2).

La API aplica sola las migraciones pendientes al arrancar. **No ejecutes nunca el seed
en producción**: crea usuarios de prueba con contraseñas conocidas.

### Archivos (MinIO o R2)

La API crea el bucket sola al arrancar si no existe. Con MinIO, los enlaces de descarga
apuntan a `FILES_DOMAIN`, que Caddy publica con HTTPS; por eso hace falta un tercer
registro DNS (`files.tudominio.com`). Con R2 no hace falta: borra ese bloque del `Caddyfile`.

### Crear tu usuario SUPER_ADMIN

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec api \
  ./node_modules/.bin/tsx prisma/bootstrap-admin.ts tu@email.com "Tu Nombre" "AnPi Tech"
```

Imprime un enlace de un solo uso (válido 1 hora) para elegir tu contraseña. El script no
pide ni guarda contraseñas.

## 3. Actualizar a una versión nueva

```bash
cd anpi-tech
git pull
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod --profile minio up -d --build
```

Antes de actualizar, haz una copia manual (siguiente apartado).

## 4. Copias de seguridad

El servicio `backup` hace un volcado de Postgres al arrancar y cada día a las 03:15, en
`infra/backups/anpi-AAAAMMDD-HHMM.dump`, y borra los de más de `BACKUP_KEEP_DAYS` días.

Copia manual en cualquier momento:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec backup sh /backup.sh now
```

**Importante:** una copia en el mismo disco no protege si el servidor se pierde. Sácalas
fuera del servidor con regularidad, por ejemplo con `rclone` hacia Cloudflare R2 o Google Drive.

Los archivos subidos (fotos, PDF) están en MinIO o R2, no en estas copias.

### Restaurar una copia

Esto **sustituye** los datos actuales. Para la API primero:

```bash
F=infra/backups/anpi-AAAAMMDD-HHMM.dump
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod stop api
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$F"
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod start api
```

Prueba a restaurar una copia de vez en cuando (por ejemplo en tu portátil): una copia que
nunca se ha restaurado no está comprobada.

## 5. Ver qué pasa

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f api
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f caddy
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs backup
```
