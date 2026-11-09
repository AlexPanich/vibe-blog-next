# 39. Ручной «Выбор редакции» — план

Спека — `39-editors-pick.md` (решения 1–7 обсуждены). Одна миграция (`0026`, `ADD COLUMN` в
`posts`, руками — образец `0023_profile_cover_name.sql`), новых таблиц нет, lifecycle `post.md` —
правки. Затронутые места: `homeBoard.ts` (`homeFresh`), `PostFeatured.tsx`, `changePostStatus.ts`,
`postModerationActions.ts`, `PostHead.tsx` (ряд с «Модерировать»), очередь модерации
`app/office/moderation/posts/page.tsx` и страница `…/posts/[id]/page.tsx`, уведомления.

Порядок: макет → схема → домен `posts` (общие функции, сброс в `changePostStatus`, actions) →
уведомление → главная → кнопка на странице поста → модерация → демо → документы → проверка.

## Решения плана (в спеке не было или уточнено)

1. **«Сейчас выбран»** — `status = 'published' AND featured_at >= now − 7 дней`, один пост
   (`ORDER BY featured_at DESC LIMIT 1`). Протухший выбор колонки не обнуляет (крона нет): у
   поста остаётся `featured_at` старше 7 дней, он считается невыбранным. Следующий выбор
   обнуляет его как любой прежний. Правило — одна функция `featuredNow(featuredAt)` в
   `domains/posts/shared/editorsPick.ts` (без пометки `server-only`/`client-only`: чистая
   функция, нужна и серверным компонентам, и запросу) + константа `EDITORS_PICK_DAYS = 7`.
2. **Сброс при уходе из публикации — в общем `UPDATE` перехода**, а не отдельным запросом:
   в `changePostStatus` к `.set({ status, reviewerId: null, reviewStartedAt: null })`
   добавляется `featuredAt: null, featuredBy: null`, если `POST_TRANSITIONS[transition].from
   === 'published'` (`unpublish`, `archive`, `block`). `restore` и `unblock` колонки не трогают
   — пост и так без выбора (спека, п. 4).
3. **Выбор — атомарно, с проверкой статуса в `WHERE`**, как переходы: policy проверяет только
   роль, статус — `UPDATE … WHERE id = ? AND status = 'published' AND (featured_at IS NULL OR
   featured_at < weekAgo) RETURNING user_id`. Пусто → перечитать пост: не `published` — 409
   «Пост уже не опубликован — обновите страницу», уже выбран — 409 «Пост уже на главной —
   обновите страницу». Повторный выбор того же поста (устаревшая вкладка) не продлевает срок
   и не шлёт второе уведомление.
4. **Снятие — без ошибки при повторе**: `UPDATE posts SET featured_at = NULL, featured_by =
   NULL WHERE id = ?`. Уже снят или протух — то же состояние, 409 не нужен. Статус не
   проверяется: у неопубликованного колонки и так пустые.
5. **Свой пост модератор выбрать может** (спека не запрещает, это не оценка). Уведомление —
   через `notify`, а он сам убирает получателя-актора («не себе»).
6. **Policy** — `featurePost(user) = moderatePosts(user)` отдельной функцией: имя для кнопок и
   для actions, если право когда-то сузят. Re-export не нужен.
7. **Кнопка на публичной странице поста** — клиентская `PostFeatureButton` за `UserGate`
   (`moderatePosts`), рядом со ссылкой «Модерировать» в `PostHead` (`ui-meta__item`, кнопка
   вместо ссылки). Состояние «выбран» — публичный факт (он виден на главной), поэтому сервер
   передаёт `featured: boolean` пропом — примитив, `resource()` не нужен. После action —
   `router.refresh()`. Место кнопки может поменять макет (шаг 0).
8. **«Очередь модерации у опубликованных»** — вкладка «Опубликованные»
   (`/office/moderation/posts?status=published`): у текущего выбора в мете строки метка
   «На главной», справа в `__side` — `PostFeatureButton` (лежит поверх растянутой ссылки, как
   «Править»). На странице модерации опубликованного поста — та же кнопка отдельным блоком
   `section.ui-decision` над формой блокировки. Выбранный пост в списке наверх не поднимается.
9. **Подпись метки** — `homeFresh` возвращает `pick: 'editor' | 'week' | null` вместо
   `picked: boolean`; `PostFeatured` получает `pick`: `editor` — «Выбор редакции»
   (`IconAward`), `week` — «Лучшее за неделю» (`IconStar`), `null` — без метки. Класс метки
   тот же `ui-featured__pick`.
10. **Инвариант «ненулевой `featured_at` максимум у одного поста»** держит транзакция
    (better-sqlite3 синхронный, транзакции не пересекаются); уникального индекса нет.
    CHECK на колонке — `(featured_at IS NULL) = (featured_by IS NULL)`.

## Шаги

### 0. Макет (Pencil)

Документ — из спеки 42 (`~/.pencil/documents/36c8a4fe-…/untitled.pen`, полный путь — через MCP
`pencil` `get_app_state`). Дорисовать: на странице поста (широкий экран и телефон) у модератора
кнопку «Выбрать для главной» / «Снять с главной» рядом с «Модерировать»; на главной — вариант
метки «Лучшее за неделю»; в строке «Опубликованные» — метку «На главной» и кнопку. Реализация —
по макету; если MCP недоступен — по решениям 7–9 и сказать об этом человеку.

### 1. Схема и миграция

- `src/database/schema.ts`, `posts`, после `publishedAt`:
  ```ts
  /*
    Ручной «Выбор редакции» (спека 39): когда и кто выбрал. Действует 7 дней (editorsPick.ts),
    ненулевой featuredAt — максимум у одного поста: новый выбор обнуляет прежний, уход из
    published — тоже (changePostStatus)
  */
  featuredAt: integer('featured_at', { mode: 'timestamp' }),
  featuredBy: integer('featured_by').references(() => users.id),
  ```
  и в табличные ограничения — `check('posts_featured_check', sql\`(${t.featuredAt} IS NULL) =
  (${t.featuredBy} IS NULL)\`)`. Relation `featuredByUser` не нужна — имя выбравшего нигде не
  показывается.
- `NOTIFICATION_TYPES` += `'post.featured'` (после `'post.submitted'`). CHECK типов в
  `notifications` нет — только TS.
- `npx drizzle-kit generate --name editors_pick` → он пересоберёт `posts` ради CHECK → заменить
  SQL руками (комментарий — как в `0023`):
  ```sql
  ALTER TABLE `posts` ADD `featured_at` integer;--> statement-breakpoint
  ALTER TABLE `posts` ADD `featured_by` integer REFERENCES users(id) CONSTRAINT "posts_featured_check" CHECK(("featured_at" IS NULL) = ("featured_by" IS NULL));
  ```
  (CHECK на последней колонке может ссылаться на соседнюю — как `0009_post_types.sql`;
  `REFERENCES` в `ADD COLUMN` допустим при `DEFAULT NULL`.) Снапшот оставить
  сгенерированным.
- Бэкап `storage/dev.db` → прогон на копии (`npm run db:migrate` с копией: drizzle-orm
  migrator покажет ошибку) → `npx drizzle-kit migrate` → MCP `sql-dev` `schema posts` →
  `touch next.config.ts`.
- `src/database/types.ts` — `Post` выводится сам, проверить.

### 2. Домен `posts`: общие функции, policy, сброс

- `shared/editorsPick.ts` (без пометок):
  ```ts
  export const EDITORS_PICK_DAYS = 7;

  // Выбор действует 7 дней с момента выбора, потом главная — на автоматике (спека 39, п. 2)
  export function featuredNow(featuredAt: Date | null, now = Date.now()){
    return featuredAt !== null && now - featuredAt.getTime() < EDITORS_PICK_DAYS * DAY_MS;
  }

  export function editorsPickSince(now = Date.now()){
    return new Date(now - EDITORS_PICK_DAYS * DAY_MS);
  }
  ```
- `policy.ts` — `featurePost(user)` (реш. 6) с комментарием про спеку 39.
- `shared/changePostStatus.ts` — реш. 2; дописать в комментарий функции «уход из published
  снимает выбор редакции (спека 39)».
- `shared/postFeature.ts` (`server-only`):
  - `featurePost(postId, actorId): number[]` — транзакция (реш. 3): `UPDATE` цели с
    `RETURNING userId` → при пустом — 409 по причине; затем `UPDATE posts SET featured_at =
    NULL, featured_by = NULL WHERE featured_at IS NOT NULL AND id <> ?`; затем
    `notify(tx, 'post.featured', [ userId ], { actorId, postId })`. Возвращает ids
    уведомлений; `publishNotifications` — после commit, в action.
  - `unfeaturePost(postId)` — реш. 4.
  Имя `featurePost` совпадает с policy — назвать функции `pickForHome` / `unpickFromHome`,
  чтобы не путать импорты.

### 3. Actions — `domains/posts/actions/postModerationActions.ts`

```ts
export const featurePostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.postService.findOrFail(id);
    await CONTAINER.boucerService.breakIfCant(featurePost);

    publishNotifications(pickForHome(id, auth.id));

    return { featured: true };
  });

export const unfeaturePostAction = … unpickFromHome(id) … return { featured: false };
```
Без `redirect`: кнопка сама делает `router.refresh()`. Rate limit не нужен (только staff).

### 4. Уведомление `post.featured`

- `notifications/shared/notificationText.ts` — `'post.featured': \`Ваш пост ${post} выбрали для
  главной\``. Ссылка — общая `postHref` (опубликован — на пост, иначе автору в кабинет).
- `notifications/shared/notificationLook.ts` — `{ icon: IconAward, tone: 'sun', title: 'Выбор
  редакции', action: 'Открыть пост' }`.
- Проверить по `tsc` остальные `Record<NotificationType, …>` (дайджест, тосты) — дописать там же.

### 5. Главная — `homeBoard.ts`, `PostFeatured.tsx`, `app/(public)/page.tsx`

- `homeFresh`: сначала `editorsPick()` — `select id from posts where status = 'published' and
  featured_at >= editorsPickSince() order by featured_at desc limit 1`; нет — `weekPick()` как
  сейчас. Возврат `{ featured, pick: 'editor' | 'week' | null, cards }` (реш. 9); исключение
  выбранного из карточек — как сейчас. Комментарий функции переписать: ручной выбор → лучшая
  оценка недели → самый свежий без метки.
- `PostFeatured`: проп `pick` вместо `picked`, подписи и иконки — объект `PICK_LABELS`.
  Обновить комментарий компонента и проп.
- `page.tsx`: `pick={fresh.pick}`.

### 6. Кнопка — `domains/posts/components/PostFeatureButton.tsx`

- `'use client'` + `client-only`. Props: `id: number`, `featured: boolean`, `variant: 'meta' |
  'row' | 'panel'` (вид: ссылка-пункт меты на странице поста, маленькая кнопка в строке,
  Mantine `Button` в блоке решения) — точный набор по макету.
- Внутри `UserGate auth={user => featurePost(user) && …}` (до гидрации и у не-staff — ничего).
- `useAction(featurePostAction.bind(null, id))` / `unfeaturePostAction`, `onSuccess` →
  `router.refresh()`; ошибка — `showToast` с `serverError.message` (409 устаревшей страницы).
- Подписи: «Выбрать для главной» (`IconAward`) / «Снять с главной» (`IconAwardOff`), `loading`
  на время запроса.

### 7. Страница поста

- `PostHead.tsx`: рядом с `<PostModerateLink id={post.id} />` — `<PostFeatureButton id={post.id}
  featured={featuredNow(post.featuredAt)} variant="meta" />`. Проверить, что `PostHead`
  получает `post` с `featuredAt` (`getPublishedPost` → `getPost` — полная строка); если там
  `Pick<…>` — расширить.
- Lifecycle «Кто что видит» — строка `moderator`, `admin` | публичная страница поста.

### 8. Модерация

- `app/office/moderation/posts/page.tsx`, вкладка `published`: в `PostRow` — новые
  необязательные пропсы `badge?: ReactNode` (в мету) и `side?: ReactNode` (в `__side`, поверх
  ссылки — стиль как у `ui-post-row__edit`, CSS в `layout.css`). Page передаёт для каждого
  опубликованного `side={<PostFeatureButton id featured variant="row" />}` и для выбранного —
  `badge` «На главной» (`IconAward`, класс `ui-post-row__pick`, цвет — токен солнца).
  Права — уже проверены page (`moderatePosts`), `UserGate` в кнопке лишь дублирует.
- `app/office/moderation/posts/[id]/page.tsx`, `Decision` для `published`: над формой
  блокировки — `<section className="ui-decision">` с текстом «Пост на главной до <дата>» /
  «Выбор редакции — на главной 7 дней» и `PostFeatureButton variant="panel"`. Дата — через
  `LocalDate` (скил `hydration`).

### 9. Демо — `scripts/seed-demo/fill.ts`

- «Неделя в горах Дагестана» остаётся лучшей по оценкам. Ручной выбор — другой опубликованный
  свежий пост (с обложкой, не автора `some`): `featuredAt = now − 2 дня`, `featuredBy =
  uid.some`, уведомление `post.featured` автору (прочитанное). Так на главной — «Выбор
  редакции», а автоматику видно, сняв выбор.
- Обновить комментарий у блока оценок (строка «она „Выбор редакции“» → «Лучшее за неделю,
  пока нет ручного выбора»).
- `scripts/seed-dev.ts` — новых таблиц нет, правок нет. Импорты в `scripts/` — относительные
  с `.ts`.

### 10. Документы

- `docs/lifecycles/post.md`:
  - новый раздел `## Выбор редакции` (после «Оценки»): кто выбирает, один пост, 7 дней,
    автоматика и её подпись, снятие, сброс при `unpublish` / `archive` / `block`, без
    возврата после `restore` / `unblock`, без записи в `post_moderations`;
  - «Опубликован» — пункт «модератор может выбрать для главной»;
  - «Уведомления» — строка «выбор для главной | автору | `post.featured`»;
  - «Кто что видит» — кнопка на публичной странице и во вкладке «Опубликованные», главная
    (гость и все: метка «Выбор редакции» / «Лучшее за неделю»).
- `docs/specs/39-editors-pick.md` — статус «план готов»; `docs/specs/README.md` — статус `план`.
- `CLAUDE.md` — не нужен (новых соглашений нет).

### 11. Проверка (скил `app-run`, скрипт в scratchpad)

Перед — `npx tsc --noEmit`, `npm run lint`.

- Главная после сида — «Выбор редакции» у демо-поста.
- `bob` (author) и гость на странице поста — кнопки нет; `some` — «Снять с главной» у
  выбранного, «Выбрать для главной» у другого.
- `some` выбирает другой пост — на главной он с «Выбор редакции», в базе ненулевой
  `featured_at` у одного поста; автору — `post.featured` (тост и колокольчик, ссылка на пост).
- Повторный выбор того же поста вручную (`featurePostAction`) — 409, второго уведомления нет.
- «Снять с главной» — на главной «Лучшее за неделю» у поста с лучшей оценкой; уведомления нет.
- Протухание: MCP `sql-dev` — `featured_at` выбранного на 8 дней назад → главная на автоматике,
  у поста снова «Выбрать для главной».
- Автор архивирует выбранный пост (`archive`) — колонки обнулены, главная на автоматике;
  `restore` — выбор не вернулся. То же для `block` из модерации и `unpublish` («Изменить»).
- Выбор неопубликованного (устаревшая вкладка после архива) — 409 тостом.
- `featurePostAction` от `bob` — 403.
- Модерация, «Опубликованные»: метка «На главной» у выбранного, кнопка работает, клик по
  строке мимо кнопки открывает страницу модерации; там — блок выбора над блокировкой.
- `some` выбирает свой пост — уведомления себе нет.
- Телефон (390): кнопка в мете поста и в строке не ломают вёрстку; консоль без ошибок
  гидрации. Тестовые выборы — вернуть как в сиде.

Закончил фазу — напомнить человеку про `/clear`.
