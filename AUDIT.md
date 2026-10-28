# Аудит кода — 2026-10-14

Свежий проход по всему `src/`, `queue-runner.ts` и конфигам. Приложение в браузере
не запускалось: выводы сделаны по коду. Где поведение нужно подтвердить запуском, это
сказано отдельно.

Проверки:

- `npx tsc --noEmit` — без ошибок.
- `npm run lint` — **1 ошибка**: `.claude/skills/app-run/driver.cjs:22`
  (`@typescript-eslint/no-require-imports`). Lint сейчас красный из-за файла скила, а
  не из-за кода приложения.

## Общее впечатление

Каркас сильный. Доменная структура выдержана, между доменами ходят только через
`exports/`. Серверный и клиентский код разделены маркерами `server-only` /
`client-only`. Права проверяются и в page, и в action. HTTP-эндпоинты better-auth
закрыты whitelist'ом, `roles` клиент передать не может, id из url канонизируются, а
гидрация продумана (`UserGate`, `LocalDate`, `ClientValue`).

Основные проблемы — в краевых сценариях auth (выход, истёкшая сессия), в отсутствии
страниц ошибок, в целостности данных `posts` и в учебных артефактах, которые остались
в боевых маршрутах.

---

## 1. Баги и риски (по убыванию важности)

### 1.1. Выход в публичной части не сбрасывает пользователя в шапке

`LogoutBox` (`src/domains/users/components/LogoutBox.tsx:22-26`) вызывает `signOut()` и
`router.push('/auth/login')`. Из кабинета это переход в другой root layout, поэтому
страница перезагружается полностью. А вот с публичной страницы `/auth/login` лежит в
том же root layout `(public)`: `ClientSideInitializer` не перемонтируется, и в его
state остаётся старый `user`. Шапка продолжает показывать имя и кнопку «Кабинет».
Стоит проверить в браузере.

**Рекомендация:** отдавать из контекста `setUser` / `refresh()` и сбрасывать
пользователя после `signOut`, либо делать жёсткий переход
`window.location.assign('/auth/login')`.

### 1.2. Нет страниц `unauthorized` / `forbidden` / `not-found` / `error`

В `src/app/` нет ни одного файла `unauthorized.tsx`, `forbidden.tsx`, `not-found.tsx`,
`error.tsx` или `global-not-found.tsx`. При этом код опирается на `unauthorized()`,
`forbidden()` и `notFound()`, так что пользователь видит дефолтные страницы Next без
шапки и без ссылки на вход.

Особенно заметен сценарий **с истёкшей сессией**. Кука осталась, поэтому `proxy.ts`
пропускает запрос. Дальше `office/layout.tsx:18` → `requireAuthUser()` → `unauthorized()`,
и вместо редиректа на вход пользователь получает голую страницу 401.

**Рекомендация:**

- в `office/layout.tsx` для навигации использовать `redirect('/auth/login?next=…')`, а
  `unauthorized()` оставить для actions;
- добавить `forbidden.tsx` / `not-found.tsx` / `error.tsx` в оба root layout'а;
- для неизвестных url при двух root layout'ах нужен `app/global-not-found.tsx`
  (с соответствующим флагом в `next.config.ts`; поведение проверить на Next 16).

### 1.3. `posts.user_id` без внешнего ключа — `/posts` может упасть целиком

`src/database/schema.ts:60`: у `posts.userId` нет `.references(() => users.id)`, хотя у
`sessions` и `accounts` он есть. `better-sqlite3` собран с
`SQLITE_DEFAULT_FOREIGN_KEYS=1`, так что каскады у сессий работают, а посты при
удалении пользователя становятся сиротами.

После этого `db.query.posts.findMany({ with: { author: true } })` вернёт `author: null`,
`resource(postListResource, posts)` бросит `ZodError`, и **вся** страница `/posts`
(и `/posts/simple-list`) упадёт.

**Рекомендация:** FK с `onDelete: 'cascade'` (или `restrict`), индекс на `user_id`,
новая миграция.

### 1.4. Rate limit зависит от `X-Forwarded-For`, которому верят по умолчанию

`src/config/proxy.ts:6` — `TRUSTED_PROXY_HOPS` по умолчанию `1`, а `core/ip.ts` берёт
последний адрес из заголовка.

- **Без прокси** (dev, прямой деплой) заголовок полностью контролирует клиент. Подставляя
  разные значения, он обходит и глобальный лимит, и лимит входа (`ip:email`), то есть
  получает неограниченный перебор пароля.
- **Без заголовка** все попадают в один bucket `::1`. 300 запросов в минуту делятся на
  всех посетителей, и сайт легко уходит в 429.
- Лимитер в памяти (`RateLimiterMemory`), поэтому при нескольких процессах лимиты у
  каждого свои.

**Рекомендация:**

- по умолчанию `TRUSTED_PROXY_HOPS=0` и явное «доверять XFF» только при настроенном
  прокси;
- добавить лимит входа **по одному email** (без ip) с более мягким порогом — защита
  от распределённого перебора;
- для prod — `RateLimiterSQLite` / Redis.

### 1.5. Глобальный лимит 30 rps может резать prefetch

`proxy.ts` считает каждый запрос, включая RSC-prefetch от `<Link>`. На `/posts` в
каждой карточке по две ссылки (`PostCard.tsx:16,32`), и при длинном списке в viewport
одна загрузка страницы даёт пачку prefetch-запросов. Стоит замерить, сколько их
уходит на реальном списке. Варианты: исключить prefetch-запросы (заголовок
`next-router-prefetch`) из секундного лимита или поднять порог.

### 1.6. Ошибка 429 при входе ломает тип `serverError`

`authActions.ts:56` передаёт в `returnServerError` объект `{ code, message }`. По
документации next-safe-action значение должно соответствовать типу `ServerError`
клиента, а он по умолчанию `string`, потому что `handleServerError` не задан. Отсюда
хак `JSON.stringify(action.result.serverError)` в `LoginForm.tsx:24-25` и комментарий
«какого фига это объект». Вдобавок пользователь видит время в миллисекундах на
английском.

**Рекомендация:** в `createSafeActionClient({ handleServerError })` задать тип
`ServerError = { code?: number, message: string }` (или строку), в action отдавать
понятное «Слишком много попыток, попробуйте через N мин.».

### 1.7. Перебор email при регистрации

`signupAction` (`authActions.ts:20-22`) через `unique(users.email)` прямо говорит, что
email занят. При `requireEmailVerification` это единственная утечка списка
пользователей. Если это важно — отвечать одинаково («проверьте почту») и слать письмо
«у вас уже есть аккаунт».

### 1.8. Письма на самом деле не отправляются, а ссылка верификации пишется в лог

`queue-runner.ts:9-11` ждёт 3 секунды и пишет `payload` (вместе с verification url) в
`console.log`. Как заглушка это нормально, но в логах prod такая ссылка — фактически
вход в чужой аккаунт (`autoSignInAfterVerification: true`).

### 1.9. Гонка между `validate(unique)` и `insert`

`createPostAction` / `updatePostAction` / `signupAction`: при двух одновременных
запросах оба пройдут проверку, второй упадёт на `UNIQUE constraint` и получит
generic-ошибку сервера. Стоит ловить `SQLITE_CONSTRAINT_UNIQUE` и превращать в ту же
validation error.

### 1.10. Ссылка «Редактировать» расходится с policy

`PostEditLink.tsx:15` проверяет `user.id === post.userId`, а настоящая policy
`workWithPost` (`domains/posts/policy.ts:4`) пускает ещё и `admin`. Policy — изоморфный
файл, на клиенте можно вызвать её же: `workWithPost(user, post)`.

---

## 2. Данные и валидация

- `postOwnCreateDto` (`domains/posts/dto/postRequests.ts`):
  - `url` подписан в форме как «URL (slug)», но регулярки нет: пробелы, `/`, кириллица
    проходят. Нужен `z.string().regex(/^[a-z0-9-]+$/)`;
  - `title` максимум 16 символов — очень мало для заголовка;
  - у `content` нет `max()`, текст неограниченного размера уходит в БД одним action;
  - нигде нет `.trim()`, поэтому строка из пяти пробелов проходит `min(5)`.
- Поле `url` хранится и уникально, но **в роутинге не используется**: посты открываются
  по `id`. Либо роутить по slug, либо убрать поле.
- `aiIdSchema` — неочевидное имя (autoincrement id?). Лучше `idSchema`.
- `userSignupDto.name` максимум 16 — тоже тесно.
- `/authors` (`app/(public)/authors/page.tsx:10`) показывает **всех** пользователей,
  включая неподтвердивших email. Плюс выборка тянет все колонки (resource их отрежет,
  но лишнее читается из БД).
- `/authors/[id]` грузит `with: { posts: true }` целиком, вместе с `content`, ради одного
  заголовка. Стоит выбрать нужные колонки (`columns`) и задать `orderBy`.
- Ни один список не пагинирован (`/posts`, `/authors`, `/office/posts`).
- `/posts` без `orderBy` — порядок зависит от SQLite.
- `.returning()` в `update` / `delete` (`postActions.ts:41,52`) результат не использует.

## 3. Конфиг и окружение

- `src/config/auth.ts`: `process.env.GITHUB_CLIENT_ID as string`. Если переменной нет,
  провайдер регистрируется с `undefined` и падает только по клику на кнопку. Стоит
  валидировать env zod-схемой в `config/` при старте (`BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`, GitHub).
- Путь к БД продублирован в `drizzle.config.ts`. `config/database.ts` не помечен
  `server-only`, поэтому `drizzle.config.ts` может просто импортировать
  `databaseConfig` — дубль исчезнет.
- Путь `storage/data.db` к БД очереди зашит в `globals/queue.ts:25`, а не лежит в
  `config/`. Runner может импортировать конфиг относительным путём, раз в нём нет
  `server-only`.
- `queue-runner.ts` запускается как `node queue-runner.ts` (type stripping), то есть
  нужен Node ≥ 22.18 / 23.6. В `package.json` нет `engines`, а `@types/node` — `^20`.
- `globals/db.ts` не кэширует подключение на `globalThis`, хотя `queue` и
  `rateLimiters` это делают. При HMR в dev плодятся подключения к SQLite.
- Для `storage/dev.db` не включён `journal_mode = WAL` (у очереди plainjob включает его
  сам). При параллельных запросах и долгих чтениях WAL заметно снижает `SQLITE_BUSY`.
- `storage/` нужно создавать руками. `mkdirSync(dirname(path), { recursive: true })` в
  `initClient` и в очереди убрал бы этот шаг.
- `reactStrictMode: false` прячет двойной запуск эффектов. Код уже написан аккуратно
  (`cancelled` в `ClientSideInitializer`), так что включить, скорее всего, безболезненно.
- Зависимость `bcrypt` (и `@types/bcrypt`) нигде не используется: better-auth хэширует
  сам.
- `drizzle-validator@0.0.1` и `plainjob@0.0.14` — очень ранние версии, на них держится
  валидация и очередь. Стоит зафиксировать точные версии и держать в уме риск.

## 4. Архитектура и соответствие правилам проекта

- **Опечатка в имени сервиса**: файл `BouncerService.ts`, а класс `BoucerService` и
  ключ `CONTAINER.boucerService`. Разъезд, который будут копировать дальше. Лучше
  поправить сейчас, пока мест немного (`container.ts`, 2 page, 2 action).
- В `container.ts` комментарий говорит «lazy», но services создаются сразу при импорте.
- Маппинг сессии better-auth в `AuthUser` написан **дважды** с кастами:
  `shared/auth.ts:12-17` (`roles as …`) и `ClientSideInitializer.tsx:40-42`
  (`as unknown as AuthUser`). Лучше одна изоморфная функция `toAuthUser(sessionUser)`
  в `shared/authUser.ts`, а тип `roles` получить через `inferAdditionalFields` у
  auth-client (тогда уйдёт и `todo` про d.ts).
- `app/(public)/authors/[id]/page.tsx` держит таблицу постов прямо в page, а
  `app/office/posts/[id]/page.tsx` и `posts/[id]/page.tsx` — разметку статьи. По
  `architecture.md` это компоненты домена (`AuthorPostsTable`, `PostArticle`).
- `postOfficeResource` не экспортирует тип, а `PostEditForm.tsx:13` объявляет свой
  `PostFields` через `Pick<Post, …>` — две копии одной схемы. Нужен
  `PostOfficeResource`.
- `FieldError.tsx` помечен `'use client'` + `client-only`, хотя `fieldError()` — чистая
  функция. Хелпер лучше вынести в изоморфный файл, а компонент оставить клиентским.
- Мёртвый код: `core/zod.ts` (`formatZodError`), `core/promises.ts` (`timeout`),
  `authUserResource`, `initClient` как экспорт, CSS `.ui-board`, `.ui-card__text`,
  токены `--paper-tint`, `--success*`, `--danger*` (последние пригодятся, но пока
  не используются).
- Закомментированный код: `nvu` в `useForm.ts:25-31`, `createPost` в `policy.ts:8-10`,
  строки в `globals/auth.ts:22-23`.

## 5. Учебные артефакты в боевых маршрутах

Проект явно учебный (комментарии `hw:`, «Реклама курсов typescript»), это нормально.
Но часть демо стоит отделить, чтобы её не приняли за продукт:

- `/posts/simple-list` + `PostCardBridge` — демо `StrictResource`, без metadata.
- `PostList`: переключатель «Карточки / Таблица» ничего не переключает.
- `TmpCommentsForm` — заглушка комментариев на странице поста.
- `PostLinkToggle` («Показать ссылку») — демо state.
- Имена функций-страниц скопированы: `Authros` ×3, `OfficePostsItem` на публичной
  странице поста, `SignSuccess`. В рантайме это ни на что не влияет, но мешает в
  React DevTools и стектрейсах.
- Комментарии вида «на пофиг :))», «CLAUDE CODE !!», «типо завершаем задачи».

**Рекомендация:** вынести демо в отдельный раздел (`/playground/*`) или пометить в
README, какие маршруты учебные.

## 6. UX-мелочи

- Редирект из `proxy.ts` и из office теряет исходный путь: после входа пользователь
  всегда попадает в `/office/profile`. Нужен `?next=` с проверкой, что это
  относительный путь.
- `useForm`: каждое поле повторяет `onChange={e => update('x', e.target.value)}`.
  Готовый `nvu` из комментария убрал бы дубли в трёх формах.
- Удаление поста (`PostRemoveForm`) без подтверждения.
- Ошибка входа склеивается строкой: `'… . осталось попыток N'` (лишний пробел перед
  точкой). Счётчик попыток лучше выводить отдельной строкой.
- `LogoutBox`: ошибка `signOut` уходит только в `console.log`.

## 7. Стиль кода

- В `postActions.ts` и `authActions.ts` смешаны табы и пробелы (цепочки `.inputSchema` /
  `.action` с табом).
- Смешаны кавычки и `;`. Форматтера нет, а `codestyle.md` описывает стиль, который
  руками держать сложно.
- `PostFormFields.tsx:13`: пустая строка сразу после `{` функции — противоречит
  `codestyle.md`.
- `useForm.ts:10,14`, `proxy.ts:45`, `queue-runner.ts:8` — хвостовые пробелы.

**Рекомендация:** Prettier (или `@stylistic/eslint-plugin`) с правилами под
`codestyle.md` и `globalIgnores(['.claude/**'])` в `eslint.config.mjs`, чтобы lint
стал зелёным.

## 8. Тесты

Тестов нет совсем. Минимальный набор с хорошей отдачей:

- unit: `idOrFail`, `getIpFromHeaders`, `workWithPost`, `activeHref`, `StrictResource`
  (type-тесты через `expectTypeOf`);
- интеграционные для actions на временной SQLite: создание, редактирование чужого
  поста → 403, уникальность `url`;
- e2e через уже готовый драйвер `app-run`: вход, создание поста, выход **из публичной
  части** (ловит баг 1.1).

---

## План по приоритетам

| # | Что | Почему сейчас |
|---|---|---|
| 1 | Сброс пользователя после выхода (1.1) | видимый баг |
| 2 | `redirect` вместо `unauthorized()` в office layout + страницы ошибок (1.2) | истёкшая сессия = тупик |
| 3 | FK и индекс на `posts.user_id` (1.3) | одна запись ломает всю ленту |
| 4 | `TRUSTED_PROXY_HOPS=0` по умолчанию, лимит входа по email (1.4) | обход защиты от перебора |
| 5 | Тип `serverError` и сообщение 429 (1.6) | убрать хак `JSON.stringify` |
| 6 | Валидация env, slug-regex, `trim`, `max` для content (§2, §3) | дешёвые и защитные |
| 7 | Переименовать `BoucerService`, общий `toAuthUser` (§4) | пока мест мало |
| 8 | Зелёный lint + форматтер (§7) | дальше копится |
| 9 | Отделить демо-маршруты (§5) | понятность проекта |
| 10 | Базовые тесты (§8) | страховка для всего выше |
