# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS workspace

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json

RUN pnpm install --frozen-lockfile

COPY . .

FROM workspace AS web-build
ENV NODE_ENV=production
RUN pnpm --filter @blog/shared typecheck \
  && pnpm --filter @blog/server typecheck \
  && pnpm --filter @blog/web typecheck \
  && pnpm --filter @blog/web exec vite build

FROM workspace AS api

ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_PATH=/app/data/blog.sqlite
ENV UPLOAD_DIR=/app/data/uploads
ENV BACKUP_DIR=/app/backups

RUN mkdir -p /app/data/uploads /app/backups \
  && chown -R node:node /app/data /app/backups

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@blog/server", "start"]

FROM nginx:1.27-alpine AS web

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
