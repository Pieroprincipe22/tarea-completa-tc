# syntax=docker/dockerfile:1
# Imagen de producción de la API (NestJS + Prisma).
# Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile -t anpi-api .

FROM node:22-bookworm-slim AS base
# Prisma necesita OpenSSL para su motor de consultas.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Primero solo los manifiestos, para que la capa de dependencias se cachee.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/marketing/package.json apps/marketing/
COPY apps/mobile/package.json apps/mobile/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api
RUN pnpm --filter api exec prisma generate --config prisma.config.ts \
  && pnpm --filter api build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
# Se copian también las dependencias de desarrollo porque el CLI de Prisma
# hace falta para aplicar las migraciones al arrancar.
COPY --from=build --chown=node:node /repo /repo
USER node
WORKDIR /repo/apps/api
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Aplica las migraciones pendientes y arranca la API.
# (Se llama a los binarios directamente: pnpm no está descargado para el usuario node.)
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --config prisma.config.ts && node dist/main.js"]
