# CLAUDE.md

Специфика этого проекта. Универсальные правила живут в `.claude/rules/`
(`architecture.md` — где что лежит, `codestyle.md` — стиль кода) и в
`.claude/skills/`. Здесь — только то, что относится именно к этому проекту.

Списков сущностей, доменов и страниц здесь нет намеренно: смотри код
(`src/domains/`, `src/app/`).

## Стек

- Next 16 (App Router), React 19, TypeScript, alias `@/*` → `src/*`.
- UI — Mantine 9, иконки — `@tabler/icons-react`. Тема — `src/theme/` (`theme.ts`,
  `fonts.ts`, `tokens.css`), схема по умолчанию тёмная (`colorScheme.ts`).
  `theme.ts` — **только клиент** (`client-only`): в серверном модуле компоненты Mantine
  приходят как client references, и `Button.extend` падает с «is not a function».
  Серверным layout'ам из темы нужен только `defaultColorScheme`, поэтому он лежит
  отдельно.
- БД — SQLite через `better-sqlite3` + Drizzle ORM.
- Auth — better-auth.
- Server actions — `next-safe-action`, валидация — zod 4 + `drizzle-validator`.
- Очередь — `plainjob`, rate limit — `rate-limiter-flexible`.

`next.config.ts`: `typedRoutes` включён (`PageProps<'/route'>`, `LayoutProps`,
типизированный `href`), `experimental.authInterrupts` включён — поэтому работают
`unauthorized()` и `forbidden()`. `reactStrictMode` выключен. `rate-limiter-flexible` — в
`serverExternalPackages`, не убирать (почему — скил `rate-limit`).

## Команды

- `npm run dev` / `npm run build` / `npm run lint`.
- Проверка типов — `npx tsc --noEmit`. TS не проверяет side-effect импорты, так что
  отсутствие пакетов `server-only` / `client-only` видно только при build.
- `npm run queue:listen` — worker очереди (см. ниже).
- Миграции — `npx drizzle-kit generate` / `npx drizzle-kit migrate`. `npm run db:migrate`
  (`scripts/migrate.ts`, drizzle-orm migrator) и `npm run db:seed` (`scripts/seed.ts`,
  демо-данные только в пустую базу) — то же, что делает контейнер при старте.
- Демо-контент один на оба сида — `scripts/seed-demo/` (`fill.ts` пишет всё одной
  транзакцией, данные — `people.ts`, `posts-*.ts`, `comments.ts`): 20 пользователей с
  аватарами, посты всех типов и статусов с фото, комментарии, жалобы, оценки, подписки,
  сообщения, заявки в авторы, баны и журнал admin, ревью в очереди, правки модератора,
  алиасы слитых рубрик. Фото — `seed-demo/photos.json` (источники и лицензии),
  кэшируются в `storage/seed-photos/`.
- `npm run db:seed-dev` (`scripts/seed-dev.ts`) — тот же контент поверх dev-базы.
  **Затирает** контент `dev.db` (учётки из `seed-demo/people.ts` остаются, пароль новых —
  `password123`), бэкап — `storage/dev.db.bak-seed-*`.

## Docker и деплой

- `Dockerfile` (standalone + production-пакеты целиком), `docker/entrypoint.sh` (миграции →
  сид → worker в фоне → сервер), `docker-compose.yml` (том `storage`), `render.yaml` —
  демо на Render free, подробно — `README.md`.
- `scripts/` и всё, что они импортируют (`src/database/`, `src/config/database.ts`),
  запускается голым node: импорты относительные с `.ts`, без `@/` и `'server-only'`.
  Новый файл, нужный им, — добавить в `COPY` рантайма в `Dockerfile`.
- Новая демо-сущность — дописать в `scripts/seed-demo/fill.ts`: попадёт и в dev, и в прод.
- Картинки демо режутся при сборке образа (stage `seed-images`, `scripts/seed-images.ts` →
  `/app/seed-images`, нужна сеть), сид при старте их только копирует. Без готовых
  (`npm run db:seed` локально) — скачивает и режет сам. Сборка тянет и Google Fonts
  (`next/font`): разовый сбой загрузки шрифта роняет `npm run build` — повторить.

## База данных

- Файл — `storage/dev.db`, путь задан в `src/config/database.ts` и **продублирован** в
  `drizzle.config.ts` — менять в обоих местах.
- Схема — `src/database/schema.ts`, выведенные типы строк — `src/database/types.ts`.
- Миграции — `drizzle/`. Сгенерированный SQL читать до `migrate`: CHECK или смена
  колонки в SQLite — пересборка таблицы (`__new_<table>` + `DROP`), а миграция идёт в
  транзакции, где `PRAGMA foreign_keys=OFF` не действует. На таблице, на которую ссылаются
  другие (`posts`, `users`), `DROP` падает — писать руками через `ADD COLUMN`, CHECK — на
  колонке (пример — `0009_post_types.sql`). Прогон на копии базы: `drizzle-orm` migrator
  показывает ошибку, `drizzle-kit migrate` молча откатывается.
- Каталог `storage/` в `.gitignore`, а `better-sqlite3` не создаёт отсутствующие
  директории — на чистой машине его нужно создать.
- Инстанс — `db` из `@/globals/db`.
- Внешние ключи **проверяются**: `better-sqlite3` собран с `SQLITE_DEFAULT_FOREIGN_KEYS=1`,
  `globals/db.ts` это не меняет (MCP `sql-dev` включает их сам). `onDelete: cascade` в схеме
  срабатывает, но на него не полагаемся: связанные строки удаляй явно в транзакции, сначала
  зависимые — иначе удаление падает на внешнем ключе.
- `lower()` / `LIKE` / `ORDER BY` в SQLite работают с кириллицей побайтово: регистр не
  меняется, порядок не алфавитный. Уникальность без регистра — отдельной колонкой с
  ключом из JS (`tags.nameKey`), сортировка — в JS (`localeCompare('ru')`).
- В соединении зарегистрированы JS-функции `lower_ru` (поиск без регистра) и `sort_ru`
  (алфавитный ключ, `ё → е`) — `globals/db.ts`. drizzle-kit и MCP `sql-dev` их не знают:
  в миграциях и разовых запросах не использовать.
- Серверный HMR в dev иногда держит старый экземпляр изменённого модуля: новые экспорты
  (таблицы схемы, zod-ресурсы) приходят `undefined`, хотя `tsc` и свежие чанки в порядке.
  Лечится перезапуском dev-сервера; без участия человека — `touch next.config.ts`, Next
  перезапускается сам. Чаще всего после миграций. После `touch` Turbopack иногда
  зацикливается: каждая вкладка получает `reloadPage: "HMR hash mismatch"` и
  перезагружается без конца, выбирая глобальный rate limit (429). Тогда нужен ручной
  перезапуск — попросить человека.
- Для разовых запросов к dev-базе — MCP `sql-dev` (`mcp/sql-server.ts`, подключён в
  `.mcp.json`): инструменты `sql`, `exec`, `schema`. Путь к базе берёт из
  `src/config/database.ts`. Пишет без подтверждений — только для dev.

## Auth

- Сервер — `src/globals/auth.ts` (better-auth + drizzle adapter). Плагин `nextCookies()`
  должен оставаться последним в `plugins`.
- id пользователей числовые (`generateId: false`), а better-auth отдаёт их строкой —
  приведение к числу в `src/shared/auth.ts` и в `ClientSideInitializer`.
- Роли — additional field `roles` (`USER_ROLES` в схеме), клиент передать его не может.
  Меняет их admin в `office/admin/users` (`userAdminActions.ts`), журнал —
  `user_admin_actions`.
- Бан — колонки `bannedAt` / `banReason` в `users`, better-auth их не знает. Вход
  забаненного режет хук `databaseHooks.session.create.before` в `globals/auth.ts` (после
  проверки пароля, для любого способа входа), действующие сессии удаляет `banUserAction`.
  Форма входа получает код 423, а не 403: по 403 `LoginForm` предлагает повторное письмо.
- Восстановление пароля: ссылку в письме `sendResetPassword` собирает сам, на страницу
  `/auth/reset-password` — HTTP-эндпоинт better-auth `/reset-password/:token` не открыт.
  Запрос письма и сброс — server actions в `authActions.ts`, смена пароля и email —
  `userAccountActions.ts`.
- `getAuthUser()` берёт cookie из `cookies()`, а не из `headers()`: так рендер в ответе
  action видит сессию, которую action только что поставил (смена пароля пересоздаёт
  сессию). Не возвращать на `headers()`.
- HTTP-эндпоинты better-auth открыты по whitelist в `src/app/api/auth/[...all]/route.ts`.
  Вход и регистрация по паролю — **только через server actions** (`auth.api.*`), не
  через HTTP.
- Пользователь на сервере — `getAuthUser()` / `requireAuthUser()` из `@/shared/auth`.
- Пользователь на клиенте — `useUser()` / `<UserGate>` (см. скил `hydration`).
  Контекст заполняет `ClientSideInitializer`: в разделе `office` пользователь приходит
  с сервера из layout (берётся из prop, не копируется в state — иначе `router.refresh()`
  не обновил бы аватар и роли), в публичной части — подгружается через `getSession()`.
- `avatarKey` — additional field better-auth (`input: false`), как `roles`.

## Layouts

У публичной части `app/(public)/layout.tsx` и у `app/office/layout.tsx` у каждого свой
`<html>` — это два root layout. Общая обвязка (Mantine, `ColorSchemeScript`, шрифты,
`ClientSideInitializer`) повторяется в обоих — правь оба.

`office/layout.tsx` проверяет `getAuthUser()` и без пользователя делает `redirect` на вход —
это и есть защита раздела. Не `unauthorized()`: ошибку layout'а ловит только boundary
выше, а выше root layout'а ничего нет — была бы голая страница Next. Кука без сессии (бан,
истёкшая сессия) проходит `proxy.ts`, поэтому редирект нужен именно здесь.

Каркас — `src/components/layout/`: `SiteHeader` (бренд, `TopMenu`, тема, `UserBox` из
`domains/users/exports`) и `OfficeDesk` (левое меню кабинета `OfficeMenu` + колонка).
Пункты меню — в `src/components/navigation/`. Строку шапки рисует клиентский `HeaderSearch`
(спека 33): бренд, меню и иконки приходят слотами из серверного `SiteHeader`, поиск
раскрывается на месте меню (на телефоне — во всю строку), на `/posts` лупа и `/` ставят фокус в
поле ленты (`FEED_SEARCH_ID`, `shared/feedSearch.ts`).

## URL кабинета

- Основная разбивка `office/` — по доменам: `office/posts`, `office/profile`,
  `office/tags`, … Здесь то, что пользователь делает со своими сущностями.
- Действия, которые есть только у одной роли, уходят в раздел верхнего уровня:
  `office/moderation`, `office/admin`, … Внутри раздела снова доменные папки:
  `office/moderation/posts`, `office/admin/users`.
- Раздел называется **по функции, а не по роли**: `moderation`, а не `moderator`.
  Если функцию откроют ещё одной роли, URL останется верным.
- У раздела нет своей проверки доступа — ни в `layout.tsx`, ни общей policy раздела.
  Права проверяет каждая page и каждый action через `breakIfCant` с policy домена.
- Раздел в URL не создаёт веток в домене. Страница `office/moderation/posts` берёт
  components из `domains/posts`, а раздел попадает только в имя файла:
  `postModerationActions.ts`, `postModerationRequests.ts` (см. `architecture.md`).
- Если действие доступно нескольким ролям, схема на него автоматически не
  распространяется. Такие случаи обсуждаем отдельно, а не выбираем раздел сами.

## Вёрстка страниц

Классы для ручной разметки — `src/theme/layout.css`, префикс `ui-`, цвета только из
токенов `tokens.css`. Типовые блоки страницы:

- заголовок — `.ui-section-head` > `h1.ui-title` (+ кнопка справа), ссылка назад —
  `.ui-backlink`, надзаголовок — `.ui-kicker`;
- форма или одиночный блок — `section.ui-panel` (`--form`, `--narrow`) с
  `.ui-panel__head` / `.ui-panel__title` / `.ui-panel__foot`;
- список в кабинете — `.ui-rows` > `a.ui-row`; карточки в публичной части —
  `.ui-grid` > `.ui-card`; пусто — `.ui-empty`, а в местах «о себе» — `EmptyState`
  (`components/general/`: что сделать дальше и кнопка, не констатация);
- просмотр сущности — `article.ui-article` с `.ui-meta`, `.ui-article__body` и рядом
  кнопок `.ui-actions`.

Ссылки — `Link` из `@/components/general/Link`, не `next/link` (запрещено в eslint):
prefetch выключен по умолчанию. В production Next подгружает каждую видимую ссылку, и меню
кабинета со списками выбирают глобальный rate limit (429). В dev prefetch нет — проблему
видно только на `npm run build` / в Docker.

Mantine в серверных компонентах: `component={Link}` передать нельзя — для кнопки-ссылки
есть `ButtonLink` (`src/components/general/`), compound-компоненты (`Table.Tr`) — только
плоскими импортами (`TableTr`).

Страницы о блоге (`/about`, `/rules`, `/moderation`, `/contacts`, спека 31) — папки в группе
`app/(public)/(about)/` с общим layout (меню раздела). Заголовок, kicker и description — в
реестре `domains/site-pages/shared/sitePages.ts`, текст — `src/content/<slug>.md` (первый абзац —
lead), правка — коммитом. Файлы читаются `fs` в рантайме: standalone их не трассирует, `src/content`
скопирован в рантайм `Dockerfile`.

RSS (спека 32) — три ленты: `/rss.xml` (`app/rss.xml/`, вне root layout'ов),
`/tags/<slug>/rss.xml`, `/authors/<id>/rss.xml`. Загрузка и XML — `domains/posts/shared/postRss.ts`,
экранирование — `core/escapeXml.ts`, абсолютный адрес — `config/site.ts` (`BETTER_AUTH_URL`).
Route — `force-dynamic`, готовый XML кэшируется в памяти процесса на 10 минут, а не через
`revalidate`: статический route пререндерился бы при сборке на пустой базе и с build-time
адресом. Ссылки на ленты — обычный `<a>`, не `Link` (это route handler). Общая лента в `<head>`
публичного layout — вручную, не `metadata.alternates` (нет `metadataBase`).

Карта — Leaflet + `react-leaflet` (`domains/posts/components/map/`). Leaflet трогает
`window` при импорте: сам компонент карты подключается только через
`dynamic(..., { ssr: false })` с заглушкой той же высоты. Тайлы — OpenStreetMap без ключа,
тёмная тема затемняет их CSS-фильтром (`.ui-map` в `layout.css`); CARTO без ключа больше
не отдаёт тайлы. Метки — без картинок (`CircleMarker`, `divIcon`): стандартная иконка
Leaflet ломается в бандле. Маршрут путешествия (спека 37) — `post_route_points`: сохранение
поста пишет точки целиком (delete + insert в своей транзакции, `shared/postRoutePoints.ts`),
`posts.lat/lng` = точка 0 ради `posts_type_fields_check`. Длина по прямой — `core/geo.ts`, не
хранится; номерные метки — `divIcon` с числом в `html` (не пользовательский текст).

Загруженные картинки — webp-варианты в `storage/uploads/` (`config/uploads.ts`), обработка —
`sharp` в `shared/images.ts` (формат по содержимому, лимит пикселей, EXIF снимается).
Отдаёт их `app/uploads/[file]/route.ts` по строгому шаблону имени: `public/` не годится,
production-сервер не отдаёт файлы, появившиеся там после сборки. Загрузка — server action
по файлу на запрос, поэтому `serverActions.bodySizeLimit` в `next.config.ts` — 6 МБ. Файлы
с расширением не проходят через `proxy.ts` и в глобальный rate limit не попадают.

Редактор текста поста — `@mdxeditor/editor` (`domains/posts/components/editor/`), тоже
только через `dynamic(..., { ssr: false })`. Значение — строка markdown, как в БД. Цвета
библиотека берёт из своих переменных `--base*`: они переопределены на токены в
`layout.css`, в том числе для порталов (списки, диалог ссылки, тултипы) — селекторы по
подстроке хешированного класса. Текст, который редактор не разобрал (`onError`:
картинка, блок кода, сноска), открывается в запасном `PostMarkdownField`.

## Доступ и 404

- `src/proxy.ts` — глобальный rate limit на каждый запрос и **оптимистичная** проверка
  cookie для `/office`. Это не защита: настоящая проверка — в layout / page / action.
- Права — policy-функции в домене, проверяются через
  `CONTAINER.boucerService.breakIfCant(u => policy(u, entity))` — и в page, и в action.
- 404 — `idOrFail` из `@/shared/params` для id из url, `findOrFail` у services.

## Спеки (`docs/specs/`)

Фича идёт фазами (спека → план → реализация → проверка), каждая — в своей сессии;
порядок — `docs/specs/README.md`. Закончил фазу — напомни человеку про `/clear`.

## Жизненные циклы (`docs/lifecycles/`)

Спецификации поведения сущностей: статусы, переходы, кто что может и кому что видно.
Заранее не читать — открывать файл сущности, когда задача затрагивает её статусы,
права или видимость. Файлы большие (`post.md` — 23 КБ): нужный раздел искать через
`grep -n` и читать по смещению, а не целиком.

- Lifecycle — источник истины для поведения. Если код с ним расходится, это баг или
  открытый вопрос: не подгонять документ под код молча, а сказать об этом.
- Меняешь поведение (переход, права роли, видимость) — правь lifecycle в том же
  изменении. Решения, принятые по ходу кодинга и не описанные в документе, тоже
  дописываются туда.
- Таблица переходов в коде должна совпадать с таблицей в документе. Для постов это
  `domains/posts/shared/postStatuses.ts`; статус меняется только через
  `changePostStatus` (атомарно, `WHERE status = from`).

## Server actions и формы

- Клиенты — `actionClient` и `actionAuthClient` (`ctx.auth`) из `@/globals/actionClient`.
- Валидация: zod-схема через `.inputSchema()`, правила БД (`unique` и т.п.) — через
  `validate()` из `@/shared/validation`.
- `execute` из `useAction` не стабилен между рендерами. В зависимостях `useEffect` он
  гоняет запросы по кругу — защищай вызов меткой в `useRef` (см. `PostRatingBlock`).
- Форма на клиенте — `useForm` из `@/hooks/useForm` (`nv`, `update`, `data`), поля —
  Mantine (`TextInput` и т.п.), ошибка поля — `error={fieldError(errors, '…')}`, где
  `errors = action.result.validationErrors`. Вне полей Mantine — `<FieldError />`.

## Очередь

- Инстанс и `QUEUE_SCHEMA` (типы payload по ключу задачи) — `src/globals/queue.ts`,
  БД очереди — `storage/data.db`.
- Worker — `queue-runner.ts` в корне, запускается голым node. Поэтому `globals/queue.ts`
  и всё, что импортирует runner, — без `'server-only'`, без alias `@/`, импорты
  относительные.
- Письма auth (верификация email) отправляются через очередь. Остальные письма — общая
  задача `mail.send` (`{ to, subject, text }`), тексты — `src/shared/mails.ts`. SMTP нет,
  worker печатает письма в консоль.

## Уведомления и живой канал

- Домен `notifications`: `notify(tx, …)` пишет в транзакции действия и возвращает id,
  `publishNotifications(ids)` — после commit. Уведомления переходов поста пишет
  `changePostStatus`. Текст и ссылка не хранятся — считаются при показе.
- SSE — `app/api/events/route.ts`, шина — `globals/liveBus.ts` (в памяти, в `globalThis`):
  работает только в одном процессе Node. Типы событий — `shared/liveEvents.ts`, на клиенте
  — `useLiveEvent()` (провайдер внутри `ClientSideInitializer`). Payload — JSON: даты
  приходят строками, парсить zod-ресурсом.
- Шина адресная (`publish` по `userId`) и широковещательная (`broadcast` — всем, гостям
  тоже). Гость получает только типы из `LIVE_BROADCAST_EVENT_TYPES`, поток у него
  открывается, лишь пока на странице есть подписчик такого события (`LiveEventsProvider`),
  лимит потоков гостя — по IP.
- Третий режим — темы (`publishTopic`, спека 29): события открытой страницы — `post:<id>`
  (комментарии, реакции, оценка), `user:<id>` (число подписчиков) и `authors` — список авторов
  (`user.followers` всех авторов, спека 53). Компонент держит тему
  через `useLiveTopic()`, провайдер открывает поток с `?topics=` и переоткрывает его при
  смене тем; гостю тоже. В событии темы — только то, что
  видно всем (счётчики) или сигнал «перечитай» (`post.comments.changed` → `loadCommentsAction`).
- Тосты — `@mantine/notifications`, `<Notifications />` в `ClientSideInitializer`, показ —
  `showToast` (`components/general/`); источники — `NotificationToasts` и `MessageToasts` в
  `SiteHeader`. Колокольчик показывает только непрочитанные, история — `office/notifications`.
- Выход в публичной части — мягкая навигация внутри того же root layout: пользователя
  сбрасывает `useLogout` через `useSetUser()`, иначе страница остаётся «вошедшей».
- Личные сообщения — домен `messages`, правила — `docs/lifecycles/message.md`. Staff
  переписку не видит: чужой диалог — 404, admin-доступа нет намеренно.

## IP и env

- IP клиента — из `x-forwarded-for` с учётом `TRUSTED_PROXY_HOPS`
  (`src/config/proxy.ts`). Без прокси перед приложением все попадают в один bucket
  rate limiter.
- Переменные окружения — см. `.env.example`. Читаются только в `src/config/`.
- `VIEW_HASH_SALT` (необязательная) — соль хеша гостя в счётчике просмотров (спека 43,
  `config/views.ts`); не задана — берётся `BETTER_AUTH_SECRET`.
- `CONTACT_EMAIL` / `CONTACT_USER_ID` (необязательные) — карточки на `/contacts`
  (`config/contacts.ts`); не задан ключ — нет карточки.

## Где лежат общие helpers

- `resource()` / `StrictResource` (скил `resource`) — `src/core/resource.ts`.
- `idOrFail` (id из url) — `src/shared/params.ts`.
- `useHydrated`, `useUser`, `UserGate`, `ClientValue`, `LocalDate` (скил `hydration`) —
  `src/hooks/` и `src/components/general/`.
- `rateLimitRequest` / `rateLimit` (скил `rate-limit`) — `src/shared/rateLimitProxy.ts` и
  `src/shared/rateLimitAction.ts`, инстансы limiter-ов — `src/globals/rateLimiter.ts`.

## Запуск в браузере (скил `app-run`)

Значения env для драйвера:

```
BASE_URL=http://localhost:3000
LOGIN_PATH=/auth/login
AFTER_LOGIN_PATH=/office
E2E_EMAIL=alice@example.com
E2E_PASSWORD=password123
```

- Учётки по ролям, у всех пароль `password123`: `alice@example.com` — `admin`,
  `some@example.com` — `moderator`, `bob@example.com` — `author`.
- Без сессионной куки `/office/*` редиректит на `/auth/login` (это делает `proxy.ts`).
- Сессия — httpOnly-кука better-auth, в `localStorage` токенов нет.
- Rate limit (`src/globals/rateLimiter.ts`): вход — 5 попыток в минуту на пару IP+email,
  потом блокировка на 5 минут; глобально — 30 запросов в секунду и 300 в минуту с IP.
- Chrome: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`.

## Прочее

`AUDIT.md` — аудит старой структуры проекта, пути в нём устарели.
