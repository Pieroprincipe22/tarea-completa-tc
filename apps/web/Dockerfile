# syntax=docker/dockerfile:1
# Imagen de producción de la web (Next.js en modo standalone).
# Se construye desde la raíz del monorepo:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_BASE=https://api.tudominio.com -t anpi-web .

FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/marketing/package.json apps/marketing/
COPY apps/mobile/package.json apps/mobile/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile --filter web...

COPY apps/web apps/web

# Las variables NEXT_PUBLIC_* se graban en el código al compilar.
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_CONTACT_EMAIL=""
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_API_BASE" || (echo "Falta --build-arg NEXT_PUBLIC_API_BASE" && exit 1)
RUN pnpm --filter web build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
