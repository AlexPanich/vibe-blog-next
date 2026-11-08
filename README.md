# Vibe — блог на Next.js

Блог с кабинетом автора, модерацией и админкой: Next.js 16 (App Router) + React 19,
Mantine 9, SQLite (`better-sqlite3` + Drizzle ORM), better-auth.

Посты с типами (обычный, перевод, путешествие с картой), визуальный редактор, галерея,
рубрики, оценки, избранное, комментарии с жалобами, подписки, уведомления и личные
сообщения в реальном времени (SSE), блокировка пользователей, заявки в авторы.

Демо: <https://vibe-blog-next.onrender.com> (бесплатный план Render — первая загрузка около
минуты).

## Как сделан: AI-first

Код написан агентом (Claude Code), на мне — постановка, решения и проверка. Проект
построен так, чтобы агенту хватало контекста из файлов, а не из переписки.

- **Спеки → план → реализация → проверка.** Каждая фича — `docs/specs/NN-name.md`
  (контракт и решения) и, где нужно, `NN-name.plan.md`. Каждая фаза идёт в отдельной сессии:
  новая сессия видит только файлы, поэтому всё нужное следующей фазе записано в них.
  Отклонения, найденные при проверке, дописываются в конец спеки. Порядок и статусы —
  [`docs/specs/README.md`](docs/specs/README.md).
- **Жизненные циклы сущностей** — [`docs/lifecycles/`](docs/lifecycles/): статусы,
  переходы, права ролей и видимость. Это источник истины: если код расходится с документом,
  это баг, а таблица переходов в коде обязана совпадать с таблицей в документе.
- **Контекст агента.** [`CLAUDE.md`](CLAUDE.md) — специфика проекта и подводные камни,
  найденные по ходу работы. [`.claude/rules/`](.claude/rules/) — архитектура (домены,
  видимость модулей, server/client) и стиль кода.
- **Свои skills** — [`.claude/skills/`](.claude/skills/): `hydration` (как не получить
  hydration mismatch), `resource` (передача данных сервер → клиент через zod-ресурсы),
  `rate-limit`, `app-run` (агент сам поднимает Chrome через Playwright, входит под нужной
  ролью и проверяет фичу end-to-end), `frontend-design`.
- **MCP-сервер к базе** — [`mcp/sql-server.ts`](mcp/sql-server.ts), подключён в `.mcp.json`:
  агент смотрит схему и данные dev-базы без ручных запросов.

Документация по поведению — `docs/lifecycles/`, спеки фич — `docs/specs/`, правила для
разработки — `CLAUDE.md` и `.claude/rules/`.

## Демо-учётки

Создаются сидом в пустой базе (`scripts/seed.ts`, контент — `scripts/seed-demo/`): 20
пользователей с аватарами, около 40 постов всех типов и статусов с фото, комментарии,
жалобы, подписки, сообщения. У всех пароль `password123`. Главные учётки:

| email | роли | что показать |
| --- | --- | --- |
| `alice@example.com` | admin | пользователи, роли, бан, заявки в авторы |
| `some@example.com` | author, moderator | очередь модерации, жалобы, рубрики |
| `bob@example.com` | author | черновик, пост на модерации, отклонённый и скрытый; переписки |
| `anya@example.com` | author | самый активный автор: 13 постов, подписчики |
| `dan@example.com` | — | читатель: лента, избранное, заявка в авторы |
| `eva@example.com` | — | читатель с ожидающей заявкой |

Остальные — в `scripts/seed-demo/people.ts`. Фото — Wikimedia Commons (авторы и лицензии —
`scripts/seed-demo/photos.json`), аватары — pravatar.cc.

Регистрация требует подтверждения email. SMTP нет: письма печатает worker очереди в лог
(локально — в консоль `npm run queue:listen`, в Docker — `docker compose logs app`).

## Переменные окружения

Читаются только в `src/config/`. Образец для разработки — `.env.example`, для Docker —
`.env.docker.example`.

| Переменная | Обязательна | Комментарий |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | да | подпись cookie сессий: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | да | адрес сайта, как его видит браузер: ссылки в письмах, проверка origin |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | нет | вход через GitHub |
| `TRUSTED_PROXY_HOPS` | нет | сколько прокси перед приложением дописывают себя в `X-Forwarded-For` (по умолчанию 1) |
| `SEED_ON_BOOT` | нет | только Docker: демо-данные в пустую базу при старте (по умолчанию `true`) |

## Локальная разработка

```bash
npm ci
cp .env.example .env          # задать BETTER_AUTH_SECRET
npm run db:migrate            # создаёт storage/ и базу
npm run db:seed               # демо-данные, если база пустая
npm run dev                   # :3000
npm run queue:listen          # worker очереди (письма) — в соседнем терминале
```

Проверки: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Docker

Один контейнер: при старте `docker/entrypoint.sh` применяет миграции, засевает пустую
базу, запускает worker очереди в фоне и сервер. SQLite (`dev.db`, `data.db` очереди) и
загруженные картинки лежат в `/app/storage` — в compose это том.

```bash
cp .env.docker.example .env   # задать BETTER_AUTH_SECRET
docker compose up -d --build  # http://localhost:3000
docker compose logs -f app    # в том числе письма
```

Образ — `node:24-bookworm-slim`, а не alpine: `better-sqlite3`, `bcrypt` и `sharp` —
нативные модули с готовыми сборками под glibc. Next собирается в `output: 'standalone'`,
рядом кладутся production-пакеты целиком: миграции, сид и worker запускаются голым node.
Картинки демо-данных скачиваются и режутся в webp при сборке (stage `seed-images`, нужна
сеть), поэтому старт с сидом занимает пару секунд.

## Демо на Render

`render.yaml` — blueprint: Render → New → Blueprint → этот репозиторий. Сервис
`vibe-blog-next` на бесплатном плане, адрес — `https://vibe-blog-next.onrender.com`.

- Диск эфемерный: после каждого деплоя, рестарта и засыпания (15 минут без запросов)
  база создаётся заново с демо-данными. Каждый показ начинается с чистого стенда.
- Первый запрос после засыпания идёт около минуты — сервис просыпается.
- `BETTER_AUTH_SECRET` генерирует Render, `BETTER_AUTH_URL` задан в blueprint. Если имя
  сервиса занято и Render добавил суффикс — поправьте `BETTER_AUTH_URL`.
- Процесс один, поэтому живой канал (SSE) и in-memory rate limit работают как локально.
