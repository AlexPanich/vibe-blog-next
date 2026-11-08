#!/bin/sh
# Старт контейнера: миграции → сид пустой базы → worker очереди в фоне → сервер.
# База и загрузки — в /app/storage: на своём сервере это том, на Render free — эфемерный
# диск, и после каждого деплоя или засыпания стенд начинается с демо-данных заново.
set -e

# Скрипты — .ts без "type": "module" в package.json: node предупреждает при каждом запуске
export NODE_OPTIONS="--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"

node scripts/migrate.ts

# Сид — только в пустую базу; картинки готовы в образе (/app/seed-images), копируются
if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  node scripts/seed.ts
fi

# Письма (SMTP нет) worker печатает в лог контейнера
node queue-runner.ts &

exec node server.js
