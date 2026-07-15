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

FROM workspace AS build

ENV NODE_ENV=production

RUN pnpm --filter @blog/shared typecheck \
  && pnpm --filter @blog/server typecheck \
  && pnpm --filter @blog/web typecheck \
  && pnpm --filter @blog/web exec vite build

FROM workspace AS app

ARG APP_VERSION=dev
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="NOWEN Blog" \
      org.opencontainers.image.description="Integrated NOWEN Blog help center, web application, Hono API and SQLite runtime" \
      org.opencontainers.image.source="https://github.com/cropflre/nowen-blog" \
      org.opencontainers.image.version="$APP_VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.created="$BUILD_DATE"

ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_PATH=/app/data/blog.sqlite
ENV UPLOAD_DIR=/app/data/uploads
ENV BACKUP_DIR=/app/backups

RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx supervisor ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf \
  && mkdir -p /app/data/uploads /app/backups /run/nginx /var/log/supervisor \
  && chown -R node:node /app/data /app/backups

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx/default.conf /etc/nginx/conf.d/nowen-blog.conf
COPY deploy/supervisor/nowen-blog.conf /etc/supervisor/conf.d/nowen-blog.conf
COPY deploy/docker-entrypoint.sh /usr/local/bin/nowen-blog-entrypoint

RUN chmod +x /usr/local/bin/nowen-blog-entrypoint

EXPOSE 80
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=5 \
  CMD node -e "Promise.all([fetch('http://127.0.0.1/healthz'),fetch('http://127.0.0.1/api/health')]).then(rs=>{if(rs.some(r=>!r.ok))process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/nowen-blog-entrypoint"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf", "-n"]
