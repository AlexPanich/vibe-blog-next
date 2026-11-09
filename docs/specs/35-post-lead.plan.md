# 35. Подзаголовок поста (lead) — план

Спека — `35-post-lead.md`. Одна миграция (`0021`), lifecycle `post.md` — новый раздел.

## Решения плана (в спеке не было или уточнено)

1. **Один helper вместо развилки по месту.** В `domains/posts/shared/postText.ts`:
   `postSummary({ lead, content }, length?)` → `lead ?? postExcerpt(content, length)`. Им
   пользуются `withCardData` (карточка, `PostFeatured`), RSS и `generateMetadata`. Сейчас
   metadata режет `stripMarkdown(content).slice(0, 160)` посреди слова — переходит на тот же
   `postExcerpt` (160, по границе слова), это мелкое попутное улучшение.
2. **Отдельного поля `lead` в `postResource` нет** (отклонение от спеки, п. 3). Карточке и
   `PostFeatured` нужен один текст — он уже идёт в `excerpt`, который теперь
   `postSummary(post)`. Поле `lead` рядом никто бы не читал. Комментарий у `excerpt` в
   `postResources.ts` обновить: «lead или выдержка из текста». Дописать в «Отклонения» спеки.
   `lead` добавляется в `postOfficeResource` — его читает форма редактора.
3. **Нормализация — в dto, одна для формы и БД:**
   `z.string().default('').transform(v => v.replace(/\s+/g, ' ').trim()).transform(v => v || null).pipe(z.string().min(POST_LEAD_MIN, msg).max(POST_LEAD_MAX, msg).nullable())`,
   `msg = 'От 20 до 200 символов'`. Все пробельные последовательности (в т.ч. переводы строк)
   сворачиваются в один пробел, это шире «перевод строки → пробел» из спеки, но по смыслу то же.
   Константы `POST_LEAD_MIN = 20`, `POST_LEAD_MAX = 200` экспортируются рядом с
   `POST_TITLE_MAX` (нужны счётчику). Проверить, что ошибка приходит в
   `validationErrors.lead` (путь не теряется на `pipe`); если теряется — `z.preprocess` для
   нормализации и `z.string().min().max().nullable()` после.
4. **Поле в форме** — `Textarea` (`autosize`, `minRows={2}`, `maxRows={4}`, `maxLength={200}`)
   сразу под заголовком, до slug. Подпись — `PostFieldLabel` с hint `${data.lead.length} / 200`,
   `description` — «Пара фраз, о чём пост — видно в ленте и в превью ссылки». Счётчик — по сырой
   длине: после нормализации строка только короче, `maxLength` её не превысит. Плейсхолдер —
   «Необязательно».
5. **OG-картинка режет и lead до 140 символов**, как выдержку: 200 символов при `fontSize: 30`
   не помещаются в две строки. `PostOgImage` получает вместо `content` готовый `summary: string`
   (`post.lead ?? stripMarkdown(post.content)`), обрезка `> 140 → …` остаётся внутри.
6. **Lead виден и автору на `office/posts/[id]`** — под `h1`, тем же видом, что в превью
   ревью. Спека не упоминает эту страницу, но автор должен видеть, что уйдёт в ленту.
7. **Очередь модерации (`PostQueueRow`)** выдержку не показывает — по спеке п. 5 lead туда не
   добавляется.
8. **CHECK** — на колонке в миграции и табличный `posts_lead_check` в `schema.ts`
   (как `posts_type_fields_check`). Миграция писать руками: `drizzle-kit generate` на новый
   check пересоберёт `posts`.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, `posts`: после `content` — комментарий «Подзаголовок (спека 35):
  обычный текст, пустой — NULL» и `lead: text('lead')`; в массив ограничений —
  `check('posts_lead_check', sql\`${t.lead} IS NULL OR length(${t.lead}) BETWEEN 20 AND 200\`)`.
- `npx drizzle-kit generate --name post_lead` → `drizzle/0021_post_lead.sql` + снапшот.
- Сгенерированный SQL **заменить** на ручной (с комментарием, как в `0009_post_types.sql`):
  ```sql
  ALTER TABLE `posts` ADD `lead` text CONSTRAINT "posts_lead_check" CHECK("lead" IS NULL OR length("lead") BETWEEN 20 AND 200);
  ```
- Бэкап `cp storage/dev.db storage/dev.db.bak-35`, затем `npm run db:migrate` (drizzle-orm
  migrator — покажет ошибку, если что). Проверить через MCP `sql-dev`: `schema` показывает
  колонку; `UPDATE posts SET lead = 'коротко' WHERE id = …` падает на CHECK (в транзакции /
  на копии — не портить данные).
- `touch next.config.ts` — после миграций HMR держит старую схему (CLAUDE.md).

### 2. dto — `domains/posts/dto/postRequests.ts`
- `POST_LEAD_MIN`, `POST_LEAD_MAX` + схема `lead` из решения 3 в `postOwnCreateDto` (после
  `title`). `postEditorDto` наследует сам.
- `postResources.ts`: `postOfficeResource` — `lead: z.string().nullable()`; комментарий у
  `excerpt` в `postResource` (решение 2).

### 3. Action — `domains/posts/actions/postActions.ts`
- `...fields` уже содержит `lead` (нормализованный, `null` для пустого) — insert и update
  получают его без правок. Проверить глазами, что `fields` не собирается вручную; если
  собирается — добавить `lead`.

### 4. Форма
- `hooks/usePostForm.ts`: `lead: string` в `PostFormState`, `'lead'` в `PostFormInitial`
  (тип `string | null` из ресурса → `initial.lead ?? ''`), `lead` в `payload()`.
- `components/editor/PostEditorForm.tsx`: `'lead'` в `PostFields` (`Pick<Post, …>`), `lead: ''`
  в `EMPTY`.
- `components/PostFormFields.tsx`: `Textarea` из решения 4 между заголовком и slug,
  `error={fieldError(errors, 'lead')}`; комментарий компонента — дописать «подзаголовок».
- Edit page (`app/office/posts/[id]/edit/page.tsx`) отдаёт `post` целиком в `resource()` —
  `lead` придёт из строки БД сам.

### 5. Текст и карточки
- `shared/postText.ts`: `postSummary` (решение 1) — экспорт под `postExcerpt`.
- `shared/postCards.ts`: `CardSource` += `lead: string | null`; `excerpt: postSummary(post)`;
  комментарий «выдержка» → «lead или выдержка». Все источники карточек — `db.query.posts.findMany`
  без `columns`, `lead` в них уже есть; `tsc` покажет, если где-то нет.
- `PostCard`, `PostFeatured` — без изменений (рендерят `excerpt`).

### 6. Страница поста
- `components/PostHead.tsx`: `lead: string | null` в `post`; после `h1` —
  `{ post.lead && <p className="ui-post__lead">{ post.lead }</p> }`. Комментарий компонента —
  «…заголовок, подзаголовок, автор…».
- `app/(public)/posts/[id]/page.tsx`: `generateMetadata` — `description = postSummary(post)`
  (импорт из `postText`, `stripMarkdown` убрать, если больше не нужен).
- `app/(public)/posts/[id]/opengraph-image.tsx` + `PostOgImage.tsx`: решение 5 (`content` →
  `summary`, `stripMarkdown` уезжает в route).
- `theme/layout.css` — после `.ui-post__title`:
  `.ui-post__lead { max-width: 46rem; margin: 0; color: var(--ink-soft); font-size: clamp(1.125rem, 1.9vw, 1.375rem); line-height: 1.45; overflow-wrap: anywhere; }`.
  Отступы проверить по `gap` у `.ui-post__head` — если там `gap`, своих `margin` не нужно. Если
  макет спеки 30 в Pencil показывает подзаголовок — сверить размер с ним.

### 7. RSS — `shared/postRss.ts`
- `tag('description', postSummary(post))` вместо `postExcerpt(post.content)`. Импорт
  `postExcerpt` убрать. Кэш XML 10 минут — при проверке иметь в виду.

### 8. Поиск ленты — `shared/loadFeed.ts`
- ``sql`lower_ru(${posts.title} || ' ' || coalesce(${posts.lead}, '') || ' ' || ${posts.content}) LIKE …` ``
  + комментарий про `NULL` в конкатенации (спека п. 7). `loadMyPosts` не трогать.

### 9. Модерация и кабинет
- `components/PostReviewPreview.tsx`: `lead: string | null` в `post`; после `h1` —
  `<p className="ui-review-post__lead">`. Страница `office/moderation/posts/[id]` отдаёт `post`
  целиком — проверить `tsc`.
- `app/office/posts/[id]/page.tsx`: под `h1` — `{ post.lead && <p className="ui-article__lead">…</p> }`
  (решение 6).
- CSS: `.ui-review-post__lead` и `.ui-article__lead` — один селектор через запятую рядом с
  `.ui-review-post__title`: `margin: 0; color: var(--ink-soft); font-size: 1.125rem; line-height: 1.45;`.

### 10. Демо — `scripts/seed-demo/`
- `types.ts`: `SeedPost.lead?: string` с комментарием «20–200 символов, CHECK в БД».
- `fill.ts`: `lead: post.lead ?? null` в insert.
- `posts-anya.ts` (14) и `posts-others.ts` (25): lead примерно у половины — ~7 и ~12, разных
  статусов и типов, обязательно у части опубликованных в начале ленты (видно на главной) и у
  части — нет. Длина 60–180 символов, без markdown, по-русски, по содержанию поста.
- Проверка — `npm run db:seed-dev` (затирает контент dev.db, бэкап делает сам): сид падает
  целиком, если какой-то lead вне 20–200.

### 11. Документы
- `docs/lifecycles/post.md` — раздел `## Подзаголовок` после `## Тип`: необязателен, 20–200
  символов обычного текста, пробелы сворачиваются, пустой — `NULL`; часть содержимого —
  правится только в `draft` вместе с текстом и проходит модерацию; виден модератору в превью;
  в ленте, OG и RSS заменяет выдержку; CHECK `posts_lead_check`.
- `docs/specs/35-post-lead.md`: в конце — раздел «Отклонения» с решением 2; статус — «реализовано,
  следующая фаза — проверка».
- `docs/specs/README.md`: строка 35 — статус по итогам реализации.

### 12. Проверки
- `npx tsc --noEmit`, `npm run lint`.
- Ручная проверка (фаза 4, скил `app-run`, автор `bob@example.com`):
  1. Новый пост без подзаголовка — сохраняется; с 10 символами — ошибка «От 20 до 200
     символов» под полем; с переводом строки и пробелами по краям — сохраняется одной строкой
     (видно в редакторе после перезагрузки).
  2. Отправка на проверку с lead и без — обе проходят.
  3. Модератор `some@example.com`: lead в превью ревью; после approve — под заголовком на
     `/posts/<id>`, в карточке ленты вместо выдержки.
  4. Пост без lead — выдержка, как раньше; шапка без пустого абзаца.
  5. Поиск ленты по слову, которое есть только в lead, находит пост.
  6. `/posts/<id>/opengraph-image` и `<meta name="description">` — lead; `/rss.xml` (учесть
     кэш 10 мин или перезапуск) — `description` = lead.
  7. Телефон (390px): lead в шапке поста переносится, не ломает строку; поле формы со
     счётчиком.
- Напомнить про `/clear` перед реализацией.
