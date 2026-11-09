# 43. Статистика автора: просмотры и новые комментарии — план

Спека — `43-author-stats.md` (решения 1–8, п. 3, 4, 6 обсуждены). Одна миграция `0027`: две новые
таблицы (генерация drizzle-kit годится — ссылки только из них наружу) + `ADD COLUMN` в `users`
руками (образец — `0023_profile_cover_name.sql`). Новая переменная env. Макет уже есть (спека 42,
«Кабинет — Начало»): большая фиолетовая плитка свёрстана в `OfficeStatTiles` под подписчиков —
переключается на просмотры.

Затронутые места: `schema.ts`, `config/`, `.env.example`, `render.yaml`, страница поста
`app/(public)/posts/[id]/page.tsx`, новые файлы в `domains/posts/` (запись, чтение), `PostRow`,
`RecentPosts`, `loadMyPosts`, `loadAdminPosts` + `PostAdminTable`/`PostAdminRow`,
`OfficeStatTiles` и `app/office/page.tsx`, `app/office/comments/page.tsx`, `OfficeCommentList` /
`OfficeCommentCard`, сид, lifecycle `post.md` и `comment.md`.

Порядок: схема → config/env → запись просмотра → чтение цифр → плитка «Начала» → «Мои посты» и
админка → новые комментарии → сид → документы → проверка.

## Решения плана (в спеке не было или уточнено)

1. **День** — `'YYYY-MM-DD'` по часам сервера (как `followerStats`: столбики рисует сервер, пояса
   браузера он не знает). Одна функция `viewDay(date = new Date())` в
   `domains/posts/shared/postViewDay.ts` (без пометок: нужна записи и чтению; сид считает день
   своей копией — он запускается голым node).
2. **Что чистится**. Спека, п. 4 / разд. 3: очистка касается **`post_view_seen`** — она нужна
   только для дневной уникальности, хранится сегодня и вчера (`day < вчера` удаляется).
   **`post_views_daily` не чистится**: это агрегат (строка на пост в день, когда были просмотры),
   из него же считается «всего просмотров» у поста. Без него цифра в «Моих постах» обнулялась бы.
3. **Очистка «изредка»** — в процессе переменная модуля `lastCleanupDay` (в `globalThis`, чтобы
   HMR не сбрасывал): первая запись нового дня (`viewDay() !== lastCleanupDay`) делает `DELETE FROM
   post_view_seen WHERE day < :yesterday` в той же транзакции и запоминает день. После
   перезапуска процесса — одна лишняя очистка, это дёшево.
4. **Зритель** (`viewer_hash`, text):
   - вошедший — `u:<id>` без хеша (строка живёт ≤ 2 суток, id и так не секрет);
   - гость — `g:` + `sha256(salt | ip | userAgent | day)` hex. Сырой IP и UA не хранятся.
   - IP — `getUserIp()` (`shared/request.ts`), UA — `headers().get('user-agent') ?? ''`.
5. **Не считаются** (спека, п. 2):
   - автор поста — `user.id === post.userId`;
   - боты — регулярка по UA в `domains/posts/shared/isBotAgent.ts` (без пометок):
     `/bot|crawl|spider|slurp|preview|fetch|curl|wget|python|headless|lighthouse|facebookexternalhit|telegram|whatsapp|vkshare/i`
     + пустой UA. Список грубый — так в спеке;
   - staff «на ревью» — ревью идёт в `office/moderation/posts/[id]`, а не на публичной странице:
     там маяка нет, отдельной проверки не нужно. На публичной странице staff — обычный читатель и
     считается. Записать это в lifecycle.
   - Не `published` — action проверяет статус в той же транзакции (`SELECT status, user_id`),
     иначе тихо ничего не делает.
6. **Запись — server action, не `route.ts`**: `recordPostViewAction` в
   `domains/posts/actions/postViewActions.ts`, `actionClient` (гости тоже), вход `aiIdSchema`
   через `bindArgsSchemas` (как у других действий поста). Ответ — `void`, ошибки клиенту не
   показываются. Rate limit отдельный не нужен: action проходит глобальный лимит `proxy.ts`, а
   накрутить можно максимум +1 в сутки на пару IP+UA.
7. **Атомарность** — одна синхронная транзакция better-sqlite3:
   `INSERT INTO post_view_seen … ON CONFLICT DO NOTHING` → если `changes === 1` —
   `INSERT INTO post_views_daily (post_id, day, views) VALUES (?, ?, 1) ON CONFLICT(post_id, day)
   DO UPDATE SET views = views + 1` (drizzle: `.onConflictDoUpdate({ target: [...], set: { views:
   sql\`${postViewsDaily.views} + 1\` } })`).
8. **Маяк** — клиентский `PostViewBeacon` (`'use client'`, `client-only`, пропс `postId: number`,
   рендерит `null`) в конце `<article>` страницы поста. `useEffect` + метка в `useRef` (как
   `PostRatingBlock`: `execute` нестабилен), вызов один раз на монтирование. Страницы картинок
   (`/posts/[id]/images/…`) маяк не ставят (спека, п. 1). Мягкий переход на другой пост монтирует
   новый маяк (разный `key={post.id}`).
9. **Видимость цифр** (спека, п. 6) — просмотры добавляются **не** в `withRowData` (его же
   использует очередь модерации, где посты чужие), а отдельным `postViewTotals(ids)` и
   необязательным пропсом `views?: number` у `PostRow`. Передают его только «Мои посты» и
   «Последние посты» на `/office` (свои), и таблица админки (`office/admin/posts`, policy там уже
   admin). В строке цифра стоит рядом с оценкой и комментариями — при тех же условиях
   (`published` или `hidden`: у архивного просмотры прошлых дней сохраняются), иконка `IconEye`,
   `title="Просмотры"`. В админке — колонка «Просмотры» у `published`/`hidden`, у остальных «—».
10. **Плитка «Начала»** — большая фиолетовая теперь «Просмотры за 7 дней» (сумма, рост к прошлой
    неделе, столбики пн–вс по дням, сегодня — последний, `data-today` уже жёлтый). Данные —
    `authorViewStats(userId)` той же формы, что `followerStats` (`{ days, week, previousWeek }`,
    без `total`). Подписчики остаются маленькой плиткой «+N за неделю» — для неё нужен только
    `{ total, week }`, большой `followerStats` можно упростить, но не обязательно (оставить как
    есть, чтобы не трогать лишнего). Подзаголовок приветствия `weekSummary` — первым пунктом
    «N просмотров», как в макете; комментарий «их пока нет (спека 43)» убрать.
    `OfficeStatTiles` получает `views` вместо чтения большой плитки из `followers`.
11. **Тренд**: `previousWeek === 0` — процента нет (как сейчас у подписчиков). Падение — та же
    плашка с `IconTrendingDown` (сейчас всегда `IconTrendingUp` — поправить заодно).
12. **«Новый» у комментария** (спека, п. 7):
    - `users.comments_seen_at` (`integer timestamp`, NULL). NULL = «всё новое» — человек ещё не
      открывал вкладку в новой версии; дату регистрации не подставляем (совпадает с NULL по смыслу).
    - Обновляется **в рендере страницы** `office/comments` при `tab === 'received'`: сначала
      прочитать старое значение, потом `UPDATE users SET comments_seen_at = now`. Страница
      `force-dynamic`, prefetch выключен (`Link`), так что лишних отметок нет. Отдельный action
      после гидрации не нужен: отметка «открыл вкладку» — и есть запрос страницы.
    - Старое значение уходит в `OfficeCommentList` пропсом `newSince: Date | null` (примитив-дата
      через resource не нужен — передать `number | null`, мс). Карточка получает `isNew`,
      вычисленный в списке: `newSince === null || createdAt.getTime() > newSince`. Так «Показать
      ещё» тоже размечает порции правильно, хотя в БД уже новое значение.
    - Пометка — только во вкладке «К моим постам», у «Моих» — нет.
    - Пометка «Новый» — `span.ui-office-comment__new` в `__top` рядом с именем; карточка — `data-new`.
      Стиль — акцентный чип из токенов (как `ui-tabs__count` с цветом `--accent`), CSS в `layout.css`.
13. **«N новых» в плитке «Комментарии»** — `countNewComments(userId, since)` по тому же условию, что
    вкладка «К моим постам» (`tabWhere('received')`: чужие, не удалённые, под постами автора в любом
    статусе) + `createdAt > since` (since NULL — без условия). Подпись плитки: `N > 0` —
    «N новых» (ссылка на `/office/comments?tab=received`, плитка остаётся `div`, ссылка — `Link`
    внутри `__sub`), иначе прежнее «+N за неделю». Склонение — `plural(n, ['новый', 'новых', 'новых'])`.
    `tabWhere` экспортировать из `loadOfficeComments.ts` (тот же домен `comments`), а `/office`
    импортирует `countNewComments` из `domains/comments/shared/` напрямую (это `app/`).
14. **Env** — `VIEW_HASH_SALT`, `src/config/views.ts`:
    `export const viewsConfig = { salt: process.env.VIEW_HASH_SALT || process.env.BETTER_AUTH_SECRET || 'dev-view-salt' }`
    с `import 'server-only'`. Не задана — берётся секрет better-auth (в проде он есть), чтобы старт
    не падал. В `.env.example` — необязательная с комментарием; в `render.yaml` —
    `generateValue: true`.

## Шаги

### 1. Схема и миграция

- `src/database/schema.ts`, после `postRatings` (или рядом с постами):
  ```ts
  /*
    Просмотры публичной страницы поста по дням (спека 43): агрегат, а не события. Не чистится —
    из него же «всего просмотров». День — 'YYYY-MM-DD' по часам сервера (postViewDay.ts)
  */
  export const postViewsDaily = sqliteTable('post_views_daily', {
    postId: integer('post_id').notNull().references(() => posts.id),
    day: text('day').notNull(),
    views: integer('views').notNull().default(0),
  }, t => [ primaryKey({ columns: [ t.postId, t.day ] }) ]);

  /*
    Дневная уникальность просмотра (спека 43): зритель — `u:<id>` или `g:<sha256>` гостя (соль,
    IP, UA, день). Хранится сегодня и вчера, старое удаляет запись просмотра (postViews.ts)
  */
  export const postViewSeen = sqliteTable('post_view_seen', {
    postId: integer('post_id').notNull().references(() => posts.id),
    day: text('day').notNull(),
    viewerHash: text('viewer_hash').notNull(),
  }, t => [ primaryKey({ columns: [ t.postId, t.day, t.viewerHash ] }), index('post_view_seen_day_idx').on(t.day) ]);
  ```
  Индекс по `day` — для очистки. Relations не нужны.
- `users`, после `nameChangedAt`:
  ```ts
  // Когда последний раз открывал «К моим постам» (спека 43): позже — «Новый». null — всё новое
  commentsSeenAt: integer('comments_seen_at', { mode: 'timestamp' }),
  ```
- `npx drizzle-kit generate --name author_stats`. Прочитать SQL: две `CREATE TABLE` оставить,
  а если для `users` он пересобирает таблицу (не должен — CHECK не меняется) — заменить на
  `ALTER TABLE \`users\` ADD \`comments_seen_at\` integer;`. Снапшот — сгенерированный.
- Бэкап `storage/dev.db` → прогон на копии (`npm run db:migrate`) → `npx drizzle-kit migrate` →
  MCP `sql-dev` `schema post_views_daily` / `post_view_seen` / `users` → `touch next.config.ts`.
- `src/database/types.ts` — типы выводятся сами; проверить, что нужное не потребовалось.
- Посты в приложении не удаляются — чистить связанные строки негде. Но `scripts/seed-dev.ts`
  (стр. ~47) затирает контент списком таблиц: дописать `schema.postViewSeen, schema.postViewsDaily`
  **перед** `schema.posts` (FK-каскада нет, порядок — как у `postRatings`).

### 2. Config и env

- `src/config/views.ts` — реш. 14.
- `.env.example`:
  ```
  # Необязательно. Соль хеша гостя для счётчика просмотров (спека 43); по умолчанию — BETTER_AUTH_SECRET
  VIEW_HASH_SALT=
  ```
- `render.yaml` — `- key: VIEW_HASH_SALT` / `generateValue: true` с комментарием.
- `Dockerfile` не трогать: `config/views.ts` скриптам не нужен.

### 3. Запись просмотра — домен `posts`

- `shared/postViewDay.ts` — `viewDay(date = new Date())` → `YYYY-MM-DD` из локальных
  `getFullYear/getMonth/getDate` (не `toISOString`: это UTC). И `shiftDay(day, delta)` — нужен
  очистке и чтению.
- `shared/isBotAgent.ts` — реш. 5.
- `shared/postViews.ts` (`server-only`):
  - `recordPostView(postId: number, viewer: { userId: number | null, ip: string, userAgent: string }, now = new Date())` —
    транзакция: пост `published`, не автор → `viewerKey` (реш. 4, `createHash('sha256')` из
    `node:crypto`) → очистка раз в день (реш. 3) → вставки (реш. 7). Возвращает `boolean`
    (засчитан ли) — для проверки.
  - `postViewTotals(postIds: number[]): Map<number, number>` — `SUM(views) GROUP BY post_id`,
    пустой массив — пустая Map без запроса.
  - `authorViewStats(userId, now = new Date())` — `post_views_daily` ⨝ `posts` по
    `posts.user_id = ?` и `day >= shiftDay(today, -13)`, `GROUP BY day`; раскладка по 7 дням +
    `previousWeek` — как в `followerStats` (`days: { date, n }[]`, `week`, `previousWeek`). Статус
    поста не фильтровать: просмотры архивного поста за неделю были.
- `actions/postViewActions.ts` (`'use server'`, реш. 6):
  ```ts
  export const recordPostViewAction = actionClient
    .bindArgsSchemas([ aiIdSchema ])
    .action(async ({ bindArgsParsedInputs: [ postId ] }) => {
      const userAgent = (await headers()).get('user-agent') ?? '';

      if(isBotAgent(userAgent)){
        return;
      }

      const user = await getAuthUser();
      recordPostView(postId, { userId: user?.id ?? null, ip: await getUserIp(), userAgent });
    });
  ```
  (`aiIdSchema` — из `domains/posts/dto/postRequests.ts`, как в `postFavoriteActions.ts`.)
- `components/PostViewBeacon.tsx` — реш. 8.
- `app/(public)/posts/[id]/page.tsx` — `<PostViewBeacon key={post.id} postId={post.id} />` внутри
  `<article>` в конце.

### 4. Плитка «Начала»

- `components/office/OfficeStatTiles.tsx`:
  - пропсы: `views: { week, previousWeek, days }`, `followers: { total, week }`,
    `rating`, `comments: { total, week, fresh }` (fresh — «N новых»);
  - большая плитка — по `views`, подпись «Просмотры за 7 дней»; `aria-label` столбиков — как
    сейчас; тренд — реш. 11;
  - плитка «Комментарии» — реш. 13 (ссылка `Link` из `@/components/general/Link`);
  - комментарий компонента обновить (убрать «их пока не считаем»).
- `app/office/page.tsx`: `views = isAuthor ? authorViewStats(user.id) : null`,
  `freshComments = isAuthor ? countNewComments(user.id, seenAt) : 0` (`seenAt` — из
  `db.query.users.findFirst({ columns: { commentsSeenAt } })`; можно доклеить к запросу профиля
  в `startSteps` — но проще отдельный запрос), `weekSummary(views.week, followers.week,
  stats.comments.week)` — реш. 10, `plural(n, ['просмотр', 'просмотра', 'просмотров'])`.
- Проверить мобильную раскладку `ui-stats` (подпись длиннее: «Просмотры за 7 дней» vs
  «Подписчики за 7 дней» — одинаковая длина, должно влезть).

### 5. «Мои посты», «Последние посты», админка

- `PostRow` — пропс `views?: number` (реш. 9), выводится в `__side` первым, при `showStats` и
  `views !== undefined`. Комментарий пропса: «Просмотры — только своим постам и admin (спека 43)».
- `loadMyPosts` — после `withRowData` доклеить `views` из `postViewTotals`; `app/office/posts/page.tsx`
  передаёт `views={post.views}`.
- `app/office/page.tsx` — `recent` так же; `RecentPosts` — тип поста `& { views: number }`,
  пробрасывает в `PostRow`.
- `loadAdminPosts` — доклеить `views` к `rows`; `AdminPostRow` выведется сам.
  `PostAdminTable` — заголовок колонки «Просмотры» (между «Статус» и «Дата»), `PostAdminRow` —
  ячейка `ui-admin-posts__views` (`published`/`hidden` — число, иначе «—»); на телефоне — в
  `__mobile-meta` через « · », если не `—`. CSS-сетка `ui-admin-posts__row` в `layout.css` —
  добавить колонку.
- Очередь модерации (`app/office/moderation/posts/page.tsx`) — **не трогать**: просмотров там нет.

### 6. Новые комментарии — домен `comments`

- `shared/loadOfficeComments.ts`: экспорт `tabWhere`; новая `countNewComments(userId, since: Date | null)`.
- `shared/commentsSeen.ts` (`server-only`): `takeCommentsSeen(userId): Date | null` — читает
  `commentsSeenAt`, ставит `new Date()`, возвращает старое (одна транзакция).
- `app/office/comments/page.tsx`: если `tab === 'received'` — `const newSince = takeCommentsSeen(user.id)`,
  передать в `CommentsTab` → `OfficeCommentList newSince={newSince?.getTime() ?? null}` (для
  «Моих» — проп не передаётся). Важно: вызов **после** разбора `tab` — отметка ставится только
  при открытой вкладке «К моим постам» (в том числе по умолчанию без `?tab=`).
- `OfficeCommentList` — проп `newSince?: number | null`; `isNew` — реш. 12; в `OfficeCommentCard`
  пропс `isNew?: boolean` → `data-new` и чип «Новый».
- `layout.css` — `.ui-office-comment__new` (токены `tokens.css`), при желании лёгкая подсветка
  `.ui-office-comment[data-new="true"]`.
- Счётчик вкладки «К моим постам» не меняется (всего, не новых) — в спеке не просили.

### 7. Демо-данные — `scripts/seed-demo/fill.ts`

- После постов: для каждого `published`-поста — `post_views_daily` за последние 14 дней
  (день — локальная `YYYY-MM-DD`, своя функция в `fill.ts`: скрипт не импортирует `@/`), объём
  — `rng`: свежие посты больше, у Бориса (`bob`, автор) на этой неделе заметно больше, чем на
  прошлой, — чтобы плитка показала рост. Плюс для старых постов — пара строк давностью 30–200
  дней, чтобы «всего» было больше недели. `post_view_seen` сид не пишет.
- `commentsSeenAt`: у `bob` и `alice` — `daysAgo(2)`, чтобы часть комментариев к их постам была
  «Новый», а часть — нет. Поле — в `values` пользователя (обновляется и для существующих).
- `npm run db:seed-dev` (затирает контент dev-базы — бэкап делает сам) и глазами: `/office` у bob.

### 8. Документы

- `docs/lifecycles/post.md`:
  - новый раздел «Просмотры» после «Оценок»: что считается (публичная страница `published`,
    после гидрации, гости по хешу, суточная уникальность), что нет (автор, боты, страницы фото,
    ревью идёт в модерации — там счётчика нет), хранение (агрегат по дням навсегда, уникальность —
    2 дня), очистка — при записи;
  - «Кто что видит»: строки «автор поста | кабинет, „Начало“ и „Мои посты“ | просмотры своих
    постов: всего у поста, за 7 дней по дням на „Начале“» и «`admin` | все посты | колонка
    „Просмотры“»; «гость и все | страница поста, лента | просмотров нет».
- `docs/lifecycles/comment.md`, «В кабинете» — абзац про «Новый» (`users.comments_seen_at`,
  обновляется при открытии «К моим постам», NULL — всё новое) и «N новых» на «Начале».
- `CLAUDE.md` — ничего, кроме, при желании, строки о `VIEW_HASH_SALT` в «IP и env».
- `docs/specs/README.md` — статус 43 → `план` (после реализации — `done`).
- Спека 43 — статус «план готов, следующая фаза — реализация».

### 9. Проверка

- `npx tsc --noEmit`, `npm run lint`, `npm run build` (проверит `server-only`/`client-only`).
- MCP `sql-dev`: после открытия поста гостем — строка в `post_view_seen` и `views + 1`; повтор
  в той же вкладке/перезагрузка — без изменений; автор — без записи; `curl -A Googlebot` с
  вызовом action — не прошёл (проще проверить юнитом `isBotAgent` в голове/REPL).
- Браузер (скил `app-run`, `bob@example.com`): `/office` — плитка «Просмотры за 7 дней» со
  столбиками, «N новых» в «Комментариях»; `/office/posts` — глаз с числом у опубликованных;
  `/office/comments` — «Новый» у свежих, после перезагрузки пометки пропадают, «Показать ещё»
  размечает вторую порцию по старой отметке; `alice` — колонка «Просмотры» в
  `office/admin/posts`; телефонная ширина `/office` и админки.
- Отклонения — в конец спеки.
