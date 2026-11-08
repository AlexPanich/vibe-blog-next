# syntax=docker/dockerfile:1

# Debian, а не alpine: better-sqlite3, bcrypt и sharp — нативные модули, и готовые сборки
# у них под glibc. На musl их пришлось бы собирать из исходников.
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Зависимости ───────────────────────────────────────────────────────────
# Слой кэшируется отдельно от кода: правки в src/ не переустанавливают пакеты.
# Компилятор — на случай, если готовой сборки нативного модуля не найдётся.
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# Только production-пакеты для рантайма: миграции, сид и worker очереди запускаются
# голым node и берут drizzle-orm, better-sqlite3 и plainjob целиком, а standalone
# копирует из пакетов лишь файлы, которые трассировка нашла у сервера.
FROM deps AS prod-deps
RUN npm prune --omit=dev

# ── Картинки демо-данных ──────────────────────────────────────────────────
# Аватары и фото постов скачиваются и режутся в webp здесь, а не при старте: на слабом CPU
# (Render free) sharp по 80 фото занял бы минуты, а стенд пересоздаётся после каждого
# засыпания. Сид при старте их только копирует (SEED_IMAGES_DIR). Нужна сеть при сборке.
FROM deps AS seed-images
COPY scripts ./scripts
RUN NODE_OPTIONS="--disable-warning=MODULE_TYPELESS_PACKAGE_JSON" node scripts/seed-images.ts /app/seed-images

# ── Сборка ────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
# Сборка импортирует globals/db, а он открывает storage/dev.db: нужна база со схемой.
# В образ она не попадает — рантайм создаёт свою при старте.
RUN NODE_OPTIONS="--disable-warning=MODULE_TYPELESS_PACKAGE_JSON" node scripts/migrate.ts && npm run build

# ── Рантайм ───────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN mkdir -p /app/storage && chown node:node /app/storage

COPY --from=builder --chown=node:node /app/.next/standalone ./
# standalone не копирует статику и public: без них ломаются чанки и файлы из /public
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules

# То, что запускается голым node при старте (docker/entrypoint.sh)
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node queue-runner.ts ./
COPY --chown=node:node src/config ./src/config
COPY --chown=node:node src/database ./src/database
COPY --chown=node:node src/globals/queue.ts ./src/globals/queue.ts
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh
COPY --from=seed-images --chown=node:node /app/seed-images ./seed-images

USER node

# Каталог базы и загрузок: на своём сервере — том (docker-compose.yml)
VOLUME ["/app/storage"]

EXPOSE 3000

# curl в slim-образе нет, поэтому проверка на самом node
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "./entrypoint.sh"]
