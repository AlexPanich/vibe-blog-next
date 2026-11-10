# 47. Слияние рубрик и подсказка о похожих — план

Спека — `47-tag-merge.md` (решения 1–12). Одна миграция (`0031`, только `CREATE TABLE`), lifecycle
нет. Образцы: action с `bindArgsSchemas` и транзакцией — `deleteTagAction`; окно с формой —
`TagCreateButton`; `Select searchable` — `TagPicker`; тост — `PostClaimButton` (`showToast`).

## Решения плана (в спеке не было или уточнено)

1. **Страницы `/tags/<slug>` в проекте нет.** Есть только `/tags/<slug>/rss.xml`, а рубрика в
   ленте — `/posts?tag=<slug>`, где алиасы по спеке не разрешаются (реш. 2). Поэтому редирект
   308 делает только RSS-route; `/tags/<old>` по-прежнему 404, как любой адрес. Страницу
   рубрики не заводим — записать отклонение в конец спеки.
2. **Без гонки — потому что одна синхронная транзакция.** better-sqlite3 выполняет
   `db.transaction` синхронно и последовательно: внутри неё читаем обе рубрики, и если какой-то
   нет — `actionError(409, 'Рубрика уже удалена — обновите страницу')` до первой записи
   (исключение откатывает транзакцию, но писать к этому моменту ещё нечего).
3. **Перенос связей — `INSERT … SELECT … ON CONFLICT DO NOTHING`**, затем `DELETE` по исходной.
   Так дубли (у поста обе рубрики, пользователь подписан на обе) отбрасываются самим PK, а у
   оставшейся подписки на целевую `createdAt` прежний; у перенесённой — `createdAt` исходной
   (копируется в SELECT). drizzle 0.45 умеет `tx.insert(t).select(qb).onConflictDoNothing()`.
4. **Итог в диалоге — счётчики исходной строки**: «N постов» — `postsCount` справочника (все
   статусы), «M подписчиков» — `followersCount`. Пересечения с целевой не вычитаем: это
   подсказка, а не отчёт. Если обоих 0 — «Постов и подписчиков у рубрики нет».
5. **Самослияние** — `returnValidationErrors(tagMergeDto, { targetId: … 'Выберите другую рубрику' })`:
   bind-аргумент zod-схеме не виден, проверка в action. В UI исходной нет в списке, так что
   это только защита endpoint'а.
6. **Ключ похожести.** `tagSimilarityKey(name) = tagNameKey(name).replaceAll('ё', 'е').replace(/[\s-]+/g, '')`.
   Пара не сравнивается, если **хотя бы один** ключ короче 4 символов (и на равенство тоже).
   Порог — по длине **более короткого** ключа: `< 7` → `≤ 1`, иначе `≤ 2`. Сначала отсекаем по
   разнице длин (`|a| − |b| > порог` — не похожи), Левенштейн не считаем.
7. **Кто на ком.** Для пары цель — больше `postsCount`, при равенстве — меньший `id`. У каждой
   рубрики среди её «целей» выбирается одна: больше `postsCount`, затем меньший `id`. Рубрика
   может одновременно быть целью для одной и помеченной на другую — так и показываем, правило
   спеки буквально. Считается по **всем** рубрикам (`all` из `loadModerationTags`), а не по
   найденным (реш. 9).
8. **Один диалог на таблицу.** Список всех рубрик для выбора цели нужен каждой строке —
   не тащим его в каждую строку, а кладём в клиентский `TagMergeProvider` (context) над
   строками. Провайдер держит `targets`, состояние `{ source, targetId }` и рендерит один
   `TagMergeDialog`; строка зовёт `useTagMerge().open(tag, targetId?)`. Исходная строка после
   слияния исчезает из таблицы — состояние живёт выше и не теряется.
9. **Действие на десктопе** — иконка `IconArrowMerge` между «Переименовать» и «Удалить» (как
   остальные `ui-tag-table__act`), в меню «…» — пункт «Слить…». Спека говорит «меню действий
   строки» — на десктопе это ряд иконок, на телефоне — «…».
10. **Демо:** в `scripts/seed-demo/people.ts` добавить рубрику `[ 'Велосипеды', 'velosipedy' ]`
    без постов (расстояние 1 до «Велосипед») — в демо и dev сразу видна подсказка. В
    `scripts/seed-dev.ts` в список очищаемых таблиц — `schema.tagAliases`.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, после `tags`:
  ```ts
  /*
    Старые slug слитых рубрик (спека 47): /tags/<slug>/rss.xml отдаёт 308 на целевую. При
    повторном слиянии алиасы переписываются на новую цель — цепочек нет. Удаление рубрики
    удаляет и её алиасы (deleteTagAction), PRAGMA foreign_keys не включён
  */
  export const tagAliases = sqliteTable('tag_aliases', {
    slug: text('slug').primaryKey(),
    tagId: integer('tag_id').notNull().references(() => tags.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  }, t => [
    index('tag_aliases_tag_idx').on(t.tagId),
  ]);
  ```
- Комментарии `postTags` и `tagFollows`: «чистит deleteTagAction» → «… и mergeTagAction переносит».
- `src/database/types.ts` — `TagAlias`, если там принято на каждую таблицу.
- `npx drizzle-kit generate --name tag_aliases` → `0031_tag_aliases.sql`. Прочитать SQL: должны быть
  только `CREATE TABLE` и `CREATE INDEX`, без пересборок. Прогон на копии `storage/dev.db`
  (`npm run db:migrate` на копии), потом на dev. `touch next.config.ts`, если dev-сервер не
  видит `tagAliases`.

### 2. Похожесть — чистые функции
- `src/core/levenshtein.ts` — `levenshtein(a: string, b: string): number`, две строки DP
  (по `[...a]`, чтобы считать символы, а не UTF-16). Переносимо — поэтому `core/`.
- `src/domains/tags/shared/tagSimilarity.ts` (без `server-only`, чистый):
  ```ts
  // Ключ сравнения (спека 47, реш. 8): nameKey, ё → е, без пробелов и дефисов
  export function tagSimilarityKey(name: string): string
  // Похожи ли два ключа: короче 4 — не сравниваются, порог 1 / 2 по длине короткого
  export function similarKeys(a: string, b: string): boolean
  // id рубрики → на какую она похожа (одна, реш. 7 плана). Рубрик без пометки в Map нет
  export function findSimilarTags<T extends { id: number, name: string, postsCount: number }>(tags: T[]): Map<number, T>
  ```
  Попарно `i < j`, ключи считаются один раз заранее.

### 3. Загрузка справочника
- `loadModerationTags`: вернуть ещё `all` (все рубрики с `postsCount` для выбора цели) и
  дописать в каждую строку `rows` поле `similarTo: { id, name } | null` из
  `findSimilarTags(all)`.
- `dto/tagModerationResources.ts`: `tagModerationRowResource` + `similarTo: z.object({ id: z.number(), name: z.string() }).nullable()`.
  Список целей — существующий `tagRowListResource` (id, name, slug, postsCount).

### 4. Action и dto
- `dto/tagModerationRequests.ts`: `tagMergeDto = z.object({ targetId: z.int().positive() })` (+ тип).
- `actions/tagActions.ts`, `mergeTagAction` — `.bindArgsSchemas([ aiIdSchema ]).inputSchema(tagMergeDto)`:
  1. `breakIfCant(manageTags)`;
  2. `id === targetId` → ошибка поля (реш. 5);
  3. `db.transaction(tx => { … })`: `source`, `target` через `tx.select().from(tags).where(eq(tags.id, …)).get()`;
     нет одной — `actionError(409, …)` (реш. 2). Затем:
     - `tx.insert(postTags).select(tx.select({ postId: postTags.postId, tagId: sql\`${target.id}\` }).from(postTags).where(eq(postTags.tagId, source.id))).onConflictDoNothing().run()`;
       `tx.delete(postTags).where(eq(postTags.tagId, source.id)).run()`;
     - то же для `tagFollows` (`userId`, `tagId`, `createdAt`);
     - `tx.update(tagAliases).set({ tagId: target.id }).where(eq(tagAliases.tagId, source.id)).run()`;
       `tx.insert(tagAliases).values({ slug: source.slug, tagId: target.id }).run()`;
     - `tx.delete(tags).where(eq(tags.id, source.id)).run()`;
     - вернуть `{ source: source.name, target: target.name }`.
     Если `sql\`${target.id}\`` drizzle не примет как колонку в `insert…select`, — `sql<number>\`${target.id}\`.as('tag_id')`
     или сырой `tx.run(sql\`INSERT OR IGNORE INTO …\`)`.
  4. `revalidatePath('/office/moderation/tags')`, `revalidatePath('/office/follows')`; return
     `{ done: true, ...names }`.
- `deleteTagAction`: в транзакцию — `tx.delete(tagAliases).where(eq(tagAliases.tagId, id)).run()` (реш. 3 спеки).
- `createTagAction`: занятые slug — объединение `tags.slug` и `tagAliases.slug` с `like(…, \`${base}%\`)`
  (два select'а в один `Set`). Комментарий: «… и алиасы слитых рубрик (спека 47)».

### 5. RSS
- `app/(public)/tags/[slug]/rss.xml/route.ts`: если рубрики по `tags.slug` нет — ищем
  `tagAliases` join `tags` по `tagAliases.slug`; нашли — `permanentRedirect(\`/tags/${encodeURIComponent(target.slug)}/rss.xml\`)`,
  иначе `notFound()`. **Проверить при реализации**, что в route handler `permanentRedirect`
  даёт 308 (в Next 16 должен); если нет — `new Response(null, { status: 308, headers: { Location: path } })`
  с относительным `Location` (абсолютный из `request.url` за прокси был бы внутренним).

### 6. UI
- `components/moderation/TagMergeProvider.tsx` (`'use client'`, `client-only`): props
  `targets: StrictResource<…, TagRowListResource>` (скил `resource`), `children`. Context
  `{ open(source: TagModerationRowResource, targetId?: number) }`, хук `useTagMerge()` — в том же
  файле. Рендерит `TagMergeDialog`, когда `source` задан.
- `components/moderation/TagMergeDialog.tsx`: `Modal` с заголовком «Слить «{source.name}»»;
  `Select searchable` (как `TagPicker`): `data` — `targets` без исходной, отсортированы по
  `postsCount` убыв.; `renderOption` — название и «N постов» серым справа; `nothingFoundMessage`
  «Рубрика не найдена»; `data-autofocus`, если цель не задана. Под полем, когда цель выбрана, —
  итог (реш. 4 плана):
  «{N} {постов} и {M} {подписчиков} перейдут в «{target}». Рубрика «{source}» будет удалена, её
  адрес будет вести на «{target}»» (`plural`). Ошибка — `fieldError(…, 'targetId') ?? serverError?.message`.
  Кнопки «Отмена» / «Слить» (`disabled` без цели, `loading`). `onSuccess` — закрыть и
  `showToast({ id: \`tag-merge-${source.id}\`, icon: <IconArrowMerge/>, title: 'Рубрики слиты', text: \`Рубрика «${source}» слита с «${target}»\`, href: null })`.
  Таблицу перечитывает `revalidatePath` в ответе action. При закрытии — `action.reset()`.
- `page.tsx`: `TagTable` обернуть в `<TagMergeProvider targets={resource(tagRowListResource, all)}>`;
  комментарий «Слияние — спека 47» → «слияние и подсказка о похожих (спека 47)».
- `TagTableRow.tsx`:
  - `const merge = useTagMerge()`; иконка `IconArrowMerge` (`aria-label` «Слить «…»», `title` «Слить»)
    и `MenuItem` «Слить…» → `merge.open(tag)`;
  - строка — `data-similar={tag.similarTo ? true : undefined}`; под чипом (в `ui-tag-table__name`,
    вне режима переименования) — `<span className="ui-tag-table__similar">похожа на «{similarTo.name}» <button …>Слить</button></span>`
    → `merge.open(tag, tag.similarTo.id)`;
  - комментарий компонента дополнить слиянием и подсказкой.
- `src/theme/layout.css`, рядом с `.ui-tag-table`: `.ui-tag-table__row[data-similar] { background: var(--sun-soft) }`,
  `.ui-tag-table__similar` (мелкий текст `--text-muted`/аналог из токенов, кнопка-ссылка
  цветом акцента), на телефоне — та же строка под чипом. В шапку `layout.css` (список
  блоков, стр. ~29) ничего нового не нужно — блок тот же. Свериться с макетом «Модерация —
  Рубрики» в Pencil, если он открыт.

### 7. Демо
- `scripts/seed-demo/people.ts`: рубрика «Велосипеды» (реш. 10). `TagName` расширится сам.
- `scripts/seed-dev.ts`: `schema.tagAliases` в список очищаемых таблиц.
- `Dockerfile` не трогаем: новых файлов, импортируемых скриптами, нет (`schema.ts` уже копируется).

### 8. Спеки
- `04-post-tags.md`: в разделе справочника — строка «слияние и алиасы slug — спека 47».
- После реализации: спека 47 — статус «реализовано, следующая фаза — проверка», в конец —
  отклонение про `/tags/<slug>` (реш. 1); README — строка 47. После проверки — `done`.

## Проверка

- `npx tsc --noEmit`, `npm run lint`.
- `mcp sql-dev` → `schema`: таблица `tag_aliases` с индексом.
- Похожесть (быстро, через временный скрипт в scratchpad или в браузере): «Путешествия» /
  «путешествие» — похожи; «Велосипед» / «Велосипеды» — похожи; «Еда» / «Еды» — не сравниваются
  (короче 4); «Ёлки» / «елки» — один ключ; «Горы» / «Город» — расстояние 2 при длине 4 — нет.
- Браузер (скил `app-run`, `some@example.com` — moderator):
  1. «Модерация — Рубрики»: строка «Велосипеды» подсвечена, «похожа на «Велосипед»».
  2. Создать «путешествие» — строка подсвечена «похожа на «Путешествия»»; slug `puteshestvie`.
  3. Подписаться на «путешествие» пользователем, уже подписанным на «Путешествия», и
     другим — без подписки; добавить рубрику посту, у которого уже есть «Путешествия», и
     посту без неё.
  4. «Слить» из подсказки — диалог с выбранной целью и итогом; «Слить» → тост, строки нет.
     `sql-dev`: в `post_tags` дублей нет, у обоих постов «Путешествия»; подписки — по одной
     на пользователя, у старой `created_at` прежний; `tag_aliases` — `puteshestvie → id Путешествий`.
  5. `curl -sI localhost:3000/tags/puteshestvie/rss.xml` — 308, `Location: /tags/puteshestviya/rss.xml`.
  6. Создать рубрику «Путешествие» снова — slug `puteshestvie-2` (алиас занят).
  7. Повторное слияние: «Путешествия» → «Горы» — алиас `puteshestvie` тоже ведёт на «Горы»
     (`curl` — сразу на `gory`, без цепочки); удалить «Горы» — оба старых адреса 404.
  8. Гонка: открыть диалог, удалить цель в другой вкладке, нажать «Слить» — «Рубрика уже
     удалена», ничего не изменилось.
  9. Телефонная ширина: «…» → «Слить…», подсказка под чипом.
- После проверки вернуть демо-рубрики: `npm run db:seed-dev`.
- Отклонения — в конец спеки.
