# 49. Хвосты редизайна кабинета — план

Спека — `49-office-redesign-followups.md` (решения — раздел 6). Одна миграция (`0029`, руками
через `ADD COLUMN`: `posts` — таблица со ссылками, пересборка упадёт), lifecycle `post.md` — правки.
Образцы: миграция — `0028_ban_duration.sql` / `0023_profile_cover_name.sql`, догрузка списка —
`DialogList`, рубрики автора — `authorTopics` в `users/shared/authorsDirectory.ts`.

Что делаем: `posts.submittedAt`, `posts.updatedAt`, «Последний вход» у admin, тема в подписи
собеседника, пределы заголовка/slug 120/80, предупреждение о несохранённом в редакторе, баг
догрузки диалогов, демо-данные и фаза проверки. Уведомления (51) и всё из «Вне scope» — нет.

## Решения плана (в спеке не было или уточнено)

1. **Повторная отправка в истории — из `submittedAt`, без новых записей.** `post_moderations` —
   история решений модератора: её читают `getLastModeration` (причина отказа автору),
   `postRows` (последний комментарий модератора в строке), журнал admin в `loadAdminUser`.
   Запись `submitted` от автора сломала бы все три. Поэтому в ленте истории — одно событие на
   последнюю отправку: «Отправлен на модерацию» или **«Автор отправил повторно»**, если до
   `submittedAt` есть решение `rejected` (или пост раньше уже был в `moderating` — см. ниже).
   Прежние повторные отправки (до последней) в истории не видны — записать это в lifecycle.
   «Отправлял ли раньше» — `moderations.some(m => m.createdAt < submittedAt)`: любое решение до
   последней отправки значит, что отправка не первая.
2. **Бэкфилл `submitted_at`.** В миграции: `UPDATE posts SET submitted_at = created_at WHERE
   status <> 'draft'` — у старых постов очередь не падает на NULL и сортировка осмысленная. В
   схеме колонка nullable (черновик, ни разу не отправленный, — NULL). Очередь сортирует
   `asc(posts.submittedAt), asc(posts.id)`.
3. **`updated_at` — NOT NULL с бэкфиллом.** `ALTER TABLE posts ADD updated_at integer NOT NULL
   DEFAULT 0` + `UPDATE posts SET updated_at = created_at`. В схеме —
   `.notNull().$defaultFn(() => new Date())` (DEFAULT 0 в SQL нужен только SQLite для ADD
   COLUMN; drizzle всегда пишет значение сам). Отличие снапшота от SQL — как в `0028`, допустимо.
4. **Кто ставит `updatedAt`.** `updatePostAction` (в том же UPDATE, что поля) и все действия
   галереи. В `postImageActions.ts` проверка `ensureDraft` превращается в `touchDraft(tx, postId)`:
   один условный `UPDATE posts SET updated_at = now WHERE id = ? AND status = 'draft' RETURNING id`
   вместо SELECT — и проверка, и отметка, атомарно. Подпись к фото тоже «сохранение содержимого»
   (решение 2 спеки — «обложка, галерея»). `createPostAction` — через `$defaultFn`.
   `changePostStatus`, ревью, выбор редакции `updatedAt` не трогают.
5. **«Сохранено» в редакторе — из `post.updatedAt`.** `postOfficeResource` + `updatedAt: z.date()`;
   после «Сохранить» `revalidatePath` и так перерисовывает страницу со свежим значением, поэтому
   `savedAt` из ответа action убираем (возвращать `{ saved: true }`). Текст: «Сохранено <LocalDate>»
   с `{ hour: '2-digit', minute: '2-digit' }`, если сегодня, иначе с `{ day: 'numeric', month: 'short', hour, minute }`.
   «Сегодня ли» зависит от часов браузера — выбор формата внутри `ClientValue` (скил `hydration`),
   не условием в JSX. Новый пост (`post` нет) — подписи нет.
6. **«Последний вход» — `max(sessions.createdAt)`**, как решено. better-auth удаляет сессию при
   выходе, бан удаляет все (`banUserAction`) — тогда показываем «—» (`null`). Это известное
   ограничение решения 5 спеки; записать в конец спеки. Место — строка `.ui-user-hero__line`:
   «… · с нами с <месяц> · последний вход <LocalDate relative>».
7. **Подпись собеседника: «Автор · 14 постов · #Горы».** Падежа у рубрики нет («о походах» не
   собрать), поэтому — главная рубрика хештегом, как в `AuthorTopics`. Нет опубликованных —
   «Автор», как сейчас; у читателя — «Читатель» (подписи-темы нет). `authorTopics` переезжает в
   `domains/users/shared/authorTopics.ts` и становится синхронной (`.all()`; `loadDialogView`
   работает в `tx` и синхронный), принимает `db | tx` и `limit`. Наружу — через
   `domains/users/exports/authorTopics.ts`. `authorsDirectory.ts` берёт её оттуда же (свой домен).
8. **Предупреждение о несохранённом — без перехвата `Link`.** `Link` используется и в серверных
   компонентах, функцию `onNavigate` туда не передать, а делать весь `Link` клиентским ради
   одной страницы не хочется. Хук `domains/posts/hooks/useLeaveGuard.ts(dirty: boolean)`:
   - `beforeunload` (закрытие, перезагрузка, внешний адрес) — `e.preventDefault()`;
   - `click` на `document` в **capture**-фазе: ближайший `a[href]`, тот же origin, без
     `target=_blank`, без модификаторов (`ctrl/meta/shift/alt`, не левая кнопка), не якорь той же
     страницы (`#photos`) → `confirm('Есть несохранённые изменения. Уйти со страницы?')`; отказ —
     `e.preventDefault()` + `e.stopPropagation()` (до обработчика Next в корне React не дойдёт);
   - кнопка «Назад» браузера (`popstate`) не перехватывается — App Router не даёт её отменить;
     записать в конец спеки.
   `dirty` = `JSON.stringify(form.payload()) !== baseline`; `baseline` — `useState` от первого
   payload, обновляется в `onSuccess` «Сохранить» (тем payload, что ушёл: `input`). При «На
   проверку» и создании после успеха — redirect из action, не клик: guard не мешает.
   **Проверить при реализации:** MDXEditor может вызвать `onChange` с нормализованным markdown
   сразу после монтирования — тогда форма «грязная» без правок. Если так — `baseline` для
   `content` брать из первого `onChange` редактора (флаг в `PostContentEditor` / форме).
9. **Баг диалогов — перечитывание на всю глубину.** `dialogPageDto` получает `limit` (int,
   `DIALOG_PAGE_SIZE`…`DIALOG_RELOAD_MAX = 200`), `loadDialogRows` берёт `limit ?? DIALOG_PAGE_SIZE`
   (+1 для `hasMore`). В `DialogList` одна функция `refresh()`: без поиска и с `rows.length >
   DIALOG_PAGE_SIZE` — `load.execute({ limit: min(rows.length, MAX) })` (ответ заменяет `rows`
   целиком: в `onSuccess` ветка `beforeId === undefined` и так заменяет), иначе — первая порция.
   - Серверное перечитывание (`initial` сменился): если догружено больше первой порции, `rows` не
     сбрасываются на `initial`, а ставится флаг `stale` → эффект вызывает `refresh()`; иначе — как
     сейчас. Скрытая переписка из «хвоста» уходит из списка после ответа.
   - `message.deleted`, `message.read`, `open` и «новый диалог» в `message.created` — тоже через
     `refresh()`: там тот же сброс.
10. **Демо-данные: что в сид, что — на копии.** Решение спеки — пагинация в `fill.ts`, но для
    21+ переписки у одного человека и `Pager` с > 5 страницами (100+ строк) нужны десятки
    фиктивных людей и записей в публичном демо. Поэтому в `fill.ts` — всё, что выглядит как живой
    блог (список шага 10.1), а массовая пагинация — одноразовым скриптом
    `scratchpad/seed-pagination.ts` на **копии** `dev.db` в фазе проверки (шаг 10.2). Это
    отклонение — записать в конец спеки.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, `posts`:
  ```ts
  /*
    Последняя отправка на модерацию (спека 49): ставит changePostStatus при каждом переходе в
    moderating. Ключ очереди; повторная отправка видна в истории модерации. null — не отправлялся
  */
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  // Последнее сохранение содержимого (спека 49): поля редактора и галерея; смена статуса не трогает
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  ```
  Индекс `posts_status_submitted_idx` на `(status, submitted_at)` — для очереди.
- `npx drizzle-kit generate --name post_submitted_updated` → снапшот. SQL заменить руками:
  ```sql
  /* Написано руками: ADD COLUMN вместо пересборки posts (на неё ссылаются другие таблицы) */
  ALTER TABLE `posts` ADD `submitted_at` integer;--> statement-breakpoint
  ALTER TABLE `posts` ADD `updated_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
  UPDATE `posts` SET `updated_at` = `created_at`;--> statement-breakpoint
  UPDATE `posts` SET `submitted_at` = `created_at` WHERE `status` <> 'draft';--> statement-breakpoint
  CREATE INDEX `posts_status_submitted_idx` ON `posts` (`status`,`submitted_at`);
  ```
- Прогон на копии `storage/dev.db` через `npm run db:migrate`, потом на dev; `touch next.config.ts`.

### 2. `submittedAt`
- `changePostStatus.ts`: в `.set(...)` при `to === 'moderating'` — `submittedAt: new Date()`
  (спред `submitted`, как `unfeature`). Комментарий над функцией дополнить.
- `app/office/moderation/posts/page.tsx`: очередь — `orderBy: [ asc(posts.submittedAt), asc(posts.id) ]`;
  остальные вкладки — как есть.
- `PostQueueRow.tsx`: `Pick` + `submittedAt`; «создан» → «отправлен» `<LocalDate value={post.submittedAt ?? post.createdAt} relative />`
  (`??` — страховка для NULL). Комментарий компонента поправить.
- `PostModerationHistory.tsx`: `post: { createdAt, submittedAt }`. Событие между решениями и
  созданием, по времени (сортировать `events` по `at` убыванию, `review` — сверху):
  `{ key: 'submitted', tone: 'faint', icon: IconSend, title: resubmitted ? 'Автор отправил повторно' : 'Отправлен на модерацию', at: submittedAt }`
  (реш. 1). Проверить, что `app/office/moderation/posts/[id]/page.tsx` и страница поста автора
  (если она тоже рисует историю) передают `submittedAt`.

### 3. `updatedAt`
- `postActions.ts`, `updatePostAction`: в `.set` — `updatedAt: new Date()`; ответ `{ saved: true }`.
- `postImageActions.ts`: `ensureDraft` → `touchDraft` (реш. 4), все четыре вызова.
- `postResources.ts`, `postOfficeResource` + `updatedAt: z.date()`; `PostFields` в
  `PostEditorForm` — `Pick<Post, … | 'updatedAt'>` (у создания `post` нет — подписи нет).
- `PostEditorForm.tsx`: блок `ui-post-editor__saved` — по `post?.updatedAt && !update.isPending`,
  текст по реш. 5 (маленький клиентский компонент `PostSavedAt` в `editor/` с `ClientValue`).
  Сразу после первого сохранения нового поста — редирект в редактор, подпись уже есть.

### 4. Пределы заголовка и slug
- `postRequests.ts`: `POST_TITLE_MAX = 120`, `POST_URL_MAX = 80`.
  Счётчик в `PostFormFields` подхватит сам.
- Вёрстка длинного заголовка (120 символов без пробелов и с ними): карточка ленты (`PostCard`),
  строка кабинета (`PostRow`), строка очереди (`PostQueueRow`), шапка поста (`PostHead`),
  `PostOgImage` (обрезка / размер шрифта), `<title>` и крошки (`OfficeCrumbs`). Где ломается —
  `-webkit-line-clamp` / `overflow-wrap: anywhere` в `layout.css`. Проверка — в шаге 11.

### 5. «Последний вход» у admin
- `loadAdminUser.ts`: `lastLoginAt` — `db.select({ at: max(sessions.createdAt) }).from(sessions).where(eq(sessions.userId, id)).get()?.at ?? null`
  (проверить, что drizzle отдаёт `Date`; если число — `sql<number>` и `new Date(at * 1000)`).
  Вернуть рядом с `user`.
- `UserAdminHero.tsx`: prop `lastLoginAt: Date | null`, в строке — « · последний вход
  <LocalDate value relative />» или « · не входил» при `null` (реш. 6). Комментарий компонента.
- `app/office/admin/users/[id]/page.tsx`: передать.

### 6. Подпись собеседника
- Новый `domains/users/shared/authorTopics.ts` — функция из `authorsDirectory.ts` (реш. 7),
  `TOPICS` остаётся параметром у вызова справочника; `exports/authorTopics.ts` — re-export.
- `loadMessages.ts`, `loadDialogView`: у автора с `published > 0` — `topic = authorTopics(tx, [ peerId ], 1).get(peerId)?.[0]?.name ?? null`.
- `messageResources.ts`, `DialogPeerResource` + `topic: z.string().nullable()`.
- `DialogView.tsx`, `peerLine`: `Автор · N постов · #topic` (без `topic` — без хвоста).
  Длинная рубрика на телефоне — `.ui-dialog__sub` с `text-overflow: ellipsis`.

### 7. Предупреждение о несохранённом
- `domains/posts/hooks/useLeaveGuard.ts` (реш. 8), `'use client'` не нужен — `import 'client-only'`.
- `PostEditorForm.tsx`: `baseline` + `dirty`, `useLeaveGuard(dirty && !action.isPending)`;
  `onSuccess` у `update` — `setBaseline(JSON.stringify(input без submit))`.
- Проверка MDXEditor на «грязь» при монтировании (реш. 8).

### 8. Баг догрузки диалогов
- `messageRequests.ts`, `dialogPageDto` + `limit: z.int().min(DIALOG_PAGE_SIZE).max(DIALOG_RELOAD_MAX).optional()`
  (константы — из `loadMessages.ts`; если импорт в dto тянет `server-only` — вынести константы в
  `messages/shared/dialogPage.ts` без пометки).
- `loadMessages.ts`, `loadDialogRows`: `const size = cursor.limit ?? DIALOG_PAGE_SIZE`, `.limit(size + 1)`, `slice(0, size)`.
- `DialogList.tsx`: `refresh()` + флаг `stale` и эффект (реш. 9). Комментарий компонента
  переписать: «перечитывает список на ту глубину, что уже показана».

### 9. Lifecycle — `docs/lifecycles/post.md`
- Таблица статусов / `moderating`: время последней отправки (`submittedAt`), очередь — по нему.
- Раздел видимости модерации (стр. ~335): «первыми — дольше всех ждущие» → «по времени последней
  отправки».
- История модерации: «Отправлен / Автор отправил повторно» — производное от `submittedAt`, одно
  событие, ранние повторные отправки не хранятся (реш. 1).
- Редактирование черновика: `updatedAt` — время сохранения содержимого, статус его не меняет;
  предупреждение при уходе с несохранённым.
- Пределы: заголовок 5–120, адрес 5–80 (если в lifecycle указаны).

### 10. Демо-данные
**10.1. `scripts/seed-demo/fill.ts` и данные рядом:**
- `posts`: `submittedAt` — у всех не-черновиков `created`, у `moderating` — недавно (часы назад,
  разные — видно сортировку очереди); `updatedAt` — `created` (у черновиков — чуть позже).
  Один `moderating` пост, ранее отклонённый: `rejected` до `submittedAt` → «Автор отправил повторно».
  Ещё 1–2 поста `moderating` от разных авторов.
- Заблокированный пост у **Бориса** (bob — e2e-учётка `author`) — строка «Заблокирован» у автора.
- Заявки в авторы: ещё 1–2 ожидающие (кроме Евы) — несколько ожидающих (шаг 20).
- Подписки: у Бориса часть подписчиков — в последние 14 дней (разные дни) — столбики и рост в %
  на «Начале»; `followRows.createdAt` для его подписчиков считать отдельно.
- Уведомления Бориса: 20+ (прочитанные старые — комментарии, публикации, подписки, существующих
  типов), часть — вчера (группа «Вчера»), одно — `post.approved` на пост, который потом ушёл в
  архив/черновик → «пост недоступен».
- Комментарии: 20+ у одного поста Бориса (дописать в `comments.ts`) — пагинация комментариев в
  кабинете; один — к фото поста, не попавшего в ленту (шаг 10).
- Один длинный диалог (Аня–Борис или новый) на 55+ сообщений — «Показать более ранние»
  (`MESSAGE_PAGE_SIZE = 50`); тексты — короткие реплики из массива по кругу, дни — равномерно.
- Отклонённая заявка у учётки, на которой видны шаги «С чего начать» (Артём уже есть — проверить,
  что шаг его показывает; ожидающая — Ева).
- Длинные имена: одному из читателей в `people.ts` — длинное имя (25+ символов) и email.
- `scripts/seed-dev.ts`: новых таблиц нет; проверить, что сброс покрывает всё, что пишет `fill.ts`.

**10.2. На копии базы (фаза проверки, не в сиде):** скрипт в scratchpad — 21+ переписка у
Бориса (фиктивные пользователи), 21+ пользователь в админке, 21+ рассмотренная заявка, 21+ пост
у одного автора и 101+ строка для многоточия `Pager`; пустые состояния (пустая очередь —
«Модерация: всё разобрано», пустые уведомления) — `UPDATE`/`DELETE` через `sql-dev` на копии.

### 11. Проверка (фаза проверки этой спеки, раздел 5 спеки)
Через субагента со скилом `app-run`, по списку раздела 5 + новое:
- очередь: «отправлен N назад», порядок по отправке; отозвать и отправить снова — пост уходит в
  конец очереди, в истории «Автор отправил повторно»;
- редактор: «Сохранено …» после перезагрузки; правка → клик по меню / крошкам → `confirm`, отказ
  оставляет на месте; закрытие вкладки → диалог браузера; после «Сохранить» уходит без вопроса;
  заголовок 120 символов сохраняется, вёрстка в карточке, строке, шапке, OG;
- админ: «последний вход» у вошедшего и «не входил» у забаненного;
- сообщения: «Показать ещё» → отправить сообщение / скрыть переписку → догруженные строки на
  месте; подпись «Автор · N постов · #рубрика»;
- остальное — мутации, пагинация, живые события, схемы и края из раздела 5.
Отклонения — в конец спеки, статус в `docs/specs/README.md`.

## Проверки после реализации
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (новых side-effect импортов нет, но
  `useLeaveGuard` — `client-only`).
- `npm run db:seed` на пустой базе (CHECK, NOT NULL) и `npm run db:seed-dev`.
