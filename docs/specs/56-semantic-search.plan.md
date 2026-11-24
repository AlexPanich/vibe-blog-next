# 56. Поиск по смыслу и «Похожие истории» — план

Спека — `56-semantic-search.md` (решения 1–22 приняты). Новое: одна таблица (`post_embeddings`,
миграция `0035`), две реализации эмбеддингов в `core/llm/`, `aiEmbed` в обёртке, вычисление и добор
векторов, секция «Похожие истории» под постом и блок «Похоже по смыслу» под лентой с поиском.
Зависимостей нет: Ollama и Voyage — через `fetch`. Статусы, переходы и права поста не меняются,
в lifecycle — короткий раздел.

## Решения плана (в спеке не было или уточнено)

1. **Модель Voyage по умолчанию — `voyage-4`.** Документация Voyage (embeddings, на 2026-08): серия 4 —
   текущая, 3.x — legacy. `voyage-4-large` лучше по качеству, `voyage-4-lite` — по цене, обе
   совместимы с `voyage-4`. Для 45 коротких постов берём среднюю `voyage-4`: 1024 измерения,
   контекст 32k, до 1000 входов и 320k токенов на запрос. Запрос:
   `{ input: string[], model, input_type: 'document' | 'query', truncation: true }`, заголовок
   `Authorization: Bearer <key>`. `output_dimension` не передаём (1024 по умолчанию). Ответ —
   `{ data: [{ embedding, index }], model, usage: { total_tokens } }`, порядок `data` — по `index`.
   Нормированы ли векторы, документация не говорит, поэтому нормируем сами (реш. 4).
2. **Ollama — `POST /api/embed`**: `{ model, input: string[], truncate: true, options: { num_ctx: 8192 } }`
   → `{ model, embeddings: number[][] }`. `num_ctx` задаём явно: у части моделей по умолчанию 2048, а
   8000 символов кириллицы — до ~3k токенов. Сверх контекста Ollama режет вход молча (`truncate`).
3. **Модель в таблице — ключ из конфига, а не из ответа.** Ollama отвечает `bge-m3:latest` на
   `bge-m3`, и сравнение с конфигом расходилось бы. Ключ `embedModel` — `ollama/<OLLAMA_EMBED_MODEL>` или
   `voyage/<VOYAGE_MODEL>`. Его считает `config/ai.ts`, отдаёт `globals/ai.ts`. Смена провайдера тоже
   меняет ключ, поэтому п. 8 спеки работает и при переходе `local` ↔ `anthropic`.
4. **Нормирование — в обёртке.** `core/llm/` возвращают сырые `number[][]`. `aiEmbed` переводит их в
   `Float32Array` и делит на L2-норму: нулевой вектор → `LlmError('Пустой вектор')`. Сходство —
   `dot(a, b)` в `core/vectors.ts`, при разной длине векторов — `null` (защита на случай ручной правки
   базы), такие пары пропускаются.
5. **Таймауты:** запрос (`kind: 'query'`) — 5 с (п. 16 спеки), документы — 30 с. Задаёт обёртка по `kind`,
   `core/llm/` получает `timeoutMs` параметром.
6. **BLOB ↔ `Float32Array`.** Колонка — `blob('vector', { mode: 'buffer' })`. Запись —
   `Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength)`. Чтение — **копией**:
   `new Float32Array(new Uint8Array(buffer).buffer)`. `Buffer` из better-sqlite3 может лежать в
   общем пуле с `byteOffset`, не кратным 4, а `new Float32Array(buf.buffer, buf.byteOffset, …)`
   на таком смещении бросает `RangeError`.
7. **Векторы читаются из базы на каждый запрос, без кэша в памяти.** 45 постов × 4 КБ — это
   ~180 КБ синхронного чтения. Кэш пришлось бы сбрасывать при публикации и доборе, а на демо он
   ничего не даёт. Чтение — `loadVectors(postIds | 'published')`: опубликованные посты с вектором
   текущей модели.
8. **Опубликованный текст не меняется** — проверено: правка содержимого (в том числе удаление фото,
   чистящее текст в `postImageActions`) есть только в `draft`, а правки модератора — только в
   `moderating`. Поэтому добор (п. 7 спеки) ищет только посты **без вектора текущей модели** и
   `textHash` не сверяет. Хеш сверяется при пересчёте после публикации (п. 6 спеки).
9. **Когда пересчитывается.** Пересчёт идёт при каждом переходе в `published` (`approve`, `restore`,
   `unblock`) — в `changePostStatus` после commit, как `startPostAiReview`: `startPostEmbedding(postId)`
   → `after(() => embedPost(postId))`. `restore` и `unblock` текст тоже не меняют, хеш совпадёт, и
   модель не вызовется. Уход из `published` вектор не удаляет: чтение фильтрует по статусу, а при
   возврате без правок пересчёт не нужен.
10. **Удаления постов в приложении нет.** Посты удаляет только `scripts/seed-dev.ts`:
    `schema.postEmbeddings` встаёт в его список зачистки **перед** `schema.posts`. Пункт 5 спеки
    («удаляется в той же транзакции») относится к будущему удалению. В `fill.ts` ничего не
    пишется (п. 21 спеки).
11. **Добор.** `ensureEmbeddings()` синхронно считает недостающих одним запросом:
    `published LEFT JOIN post_embeddings ON postId AND model = embedModel WHERE vector IS NULL`.
    Если такие есть, добор не идёт и прошлая неудача была больше 5 минут назад, функция ставит флаг и
    вызывает `after(() => backfill())`. Флаг и время неудачи лежат в `globalThis.postEmbedBackfill`
    (`{ running, failedAt }`), чтобы пережить HMR. `backfill` берёт пачки по 16 текстов, пока
    недостающие не кончатся, и пишет `onConflictDoUpdate` по `postId`. Ошибка пачки ставит `failedAt`
    и останавливает добор (`console.error` с короткой причиной). `after()` работает и в server
    component (Next 16), поэтому добор запускают страница поста и блок ленты.
12. **Исключение совпадений по словам — одним условием.** Кандидаты смыслового блока:
    `feedWhere({ ...filter, search: undefined }) AND NOT (searchCondition(filter.search))`. Это тот
    же `where` ленты с фильтрами (п. 13) минус все совпадения по словам, а не только первая страница
    (п. 12). Условие поиска выносится из `feedWhere` в функцию `searchCondition(search)`.
    `loadFeed.ts` получает экспорт `semanticCandidateIds(filter): Promise<number[]>`. Сравнение с
    вектором запроса — в JS по векторам кандидатов.
13. **Пустая лента (п. 14) решается внутри Suspense.** Страница не знает заранее, пуст ли смысловой
    блок. Поэтому при `total === 0` и непустом `search` под `<Suspense>` рисуется
    `PostSemanticResults` с prop `empty`: есть похожие — строка «По словам ничего, но вот похожее по
    смыслу» и карточки, нет — обычный блок «Ничего не нашлось» (его разметка выносится в
    `FeedEmpty`). Заглушка в этом случае — скелетон. При `total > 0` — `FeedList`, затем `<Suspense>`
    с `PostSemanticResults` без `empty`: пусто — ничего. У `<Suspense>` есть `key` — `feedUrl(filter)`,
    чтобы смена запроса снова показывала скелетон. Эмбеддинги выключены или запрос короче 3 символов —
    `Suspense` не рисуется вовсе, пустое состояние прежнее.
14. **Длина запроса — 100, а не 200.** `postFeedFilterDto` уже режет `search`: `.max(100)` с `catch`,
    более длинный запрос превращается в `undefined`. Обрезку до 200 из п. 17 не делаем, ограничение
    задаёт dto. Отклонение — в конец спеки.
15. **Кэш вектора запроса** — `core/ttlCache.ts`: класс `TtlCache<V>({ max, ttlMs })` на `Map`.
    `get` удаляет и заново вставляет ключ (LRU) и выбрасывает просроченное, `set` вытесняет самый
    старый при переполнении. Инстанс держит состояние, поэтому он — `globals/queryEmbeddings.ts`, в
    `globalThis` (как `rateLimiter.ts`): `max: 500`, `ttlMs: 60 * 60_000`. Ключ —
    `${embedModel}\n${normalizeQuery(search)}`. `normalizeQuery`: trim, `toLocaleLowerCase('ru')`,
    `\s+` → пробел. Кэшируется только успех: ошибка в кэш не попадает.
16. **Лимит — внутри server component, не action.** `rateLimiters.aiSearch` —
    `memoryLimiter({ keyPrefix: 'ai-search', points: 20, duration: 60 })`, ключ — `getUserIp()`.
    Очко списывается только при промахе кэша, прямо перед `aiEmbed`. `consume` бросает
    `RateLimiterRes` — ловим и возвращаем `null`: блока нет, ошибки нет. `consumeOrFail` не годится,
    он вызывает `actionError`. Перед реализацией прочитать скил `rate-limit`.
17. **Пороги — константы в `config/ai.ts`** (`embed.searchMin`, `embed.similarMin`), env нет. Стартовые
    значения для проверки на демо-данных: bge-m3 — `searchMin: 0.45`, `similarMin: 0.55`; voyage-4 —
    `searchMin: 0.35`, `similarMin: 0.5`. Подобранные при проверке значения дописать в отклонения.
18. **Похожие без вектора — по рубрикам, все опубликованные.** Отбор: опубликованные, кроме себя и
    постов из «Ещё у автора». Порядок: число общих рубрик (`count` по `post_tags` с `tagId IN` рубрик
    поста, `LEFT JOIN` — посты без общих рубрик тоже подходят), затем `publishedAt desc`, `id desc`,
    limit 3. «Блок есть всегда» (п. 11): ноль общих рубрик тоже даёт карточки. Секции нет, только если
    других опубликованных постов нет вовсе. С вектором секция может пропасть по порогу (п. 10) — это
    по спеке, к рубрикам не откатываемся.
19. **Что считать «без вектора».** Выключены эмбеддинги (`embedEnabled === false`) или у **открытого**
    поста нет вектора текущей модели — рубрики. Есть вектор у поста, но у кандидатов нет — сравниваем с
    теми, что есть (п. 7: «работают те, что уже есть»).
20. **Скелетон** — `.ui-post-skeleton` в `layout.css`: блок с пропорцией обложки карточки и две
    полосы текста, цвета из токенов, мягкая пульсация с `prefers-reduced-motion: reduce` → без
    анимации. Три штуки в `.ui-post-grid`, у обёртки `aria-busy="true"` и заголовок секции
    («Похоже по смыслу»), чтобы при подмене не прыгал текст.

## Шаги

### 1. Конфиг — `src/config/ai.ts`

```ts
const embedModel = provider === 'local'
  ? process.env.OLLAMA_EMBED_MODEL || 'bge-m3'
  : process.env.VOYAGE_MODEL || 'voyage-4';

embed: {
  enabled: provider === 'local' ? Boolean(process.env.OLLAMA_URL) : Boolean(process.env.VOYAGE_API_KEY),
  model: embedModel,
  // Ключ модели в post_embeddings (реш. 3): смена модели или провайдера — новые векторы
  key: `${provider === 'local' ? 'ollama' : 'voyage'}/${embedModel}`,
  voyageKey: process.env.VOYAGE_API_KEY ?? '',
  numCtx: 8192,
  timeoutMs: { query: 5_000, document: 30_000 },
  batch: 16,
  maxChars: 8000,
  retryMs: 5 * 60_000,
  // Реш. 17: подобрать на демо, итог — в отклонения
  ...(provider === 'local' ? { searchMin: 0.45, similarMin: 0.55 } : { searchMin: 0.35, similarMin: 0.5 })
}
```

`aiConfig.enabled` (генерация) не меняется. Ключ Voyage — единственный секрет, который кладём в
конфиг: SDK нет, и читать env больше негде. Комментарий над блоком — п. 1–2 спеки.

### 2. Реализации — `src/core/llm/`

- `types.ts`: `LlmEmbedInput = { texts: string[], kind: 'document' | 'query' }`,
  `LlmEmbedResult = { vectors: number[][], tokens: number }`.
- `ollamaEmbed.ts`: `ollamaEmbed(options: { url, model, numCtx, timeoutMs }, input)`. Обработка
  ошибок — как `chat()` в `ollamaParse`: таймаут → `LlmError('Локальная модель не ответила за N с')`,
  сеть → `'Ollama недоступна'`, `!ok` → `Ollama: <status>`. Длина ответа не равна числу текстов →
  `LlmError`. `kind` Ollama не передаётся (у bge-m3 нет префиксов).
- `voyageEmbed.ts`: `voyageEmbed(options: { apiKey, model, timeoutMs }, input)`. Ошибки: 401 → «Voyage:
  неверный ключ», 429 → «Voyage: превышен лимит запросов», прочие → `Voyage: <status> <detail>`
  (`detail` из JSON, если есть). Векторы — `data` по `index`.

`core/` env не читает, всё приходит параметрами.

### 3. Обёртка — `src/globals/ai.ts`

```ts
export const embedEnabled = aiConfig.embed.enabled;
export const embedModel = aiConfig.embed.key;

export async function aiEmbed(input: LlmEmbedInput): Promise<{ vectors: Float32Array[], model: string }>
```

Выбирает реализацию по `aiConfig.provider`, ставит `timeoutMs` по `kind`, нормирует (реш. 4) и
возвращает `model: embedModel`. Тело — после `aiParse`, комментарий — п. 3 спеки.

### 4. Векторы — `src/core/vectors.ts` (без пометок)

`normalize(values: number[]): Float32Array` (бросает на нулевой норме — обёртка превращает в
`LlmError`), `dot(a, b): number | null`, `toBlob(v): Buffer`, `fromBlob(b): Float32Array`
(реш. 6), `topBySimilarity<T>(query, items: { id, vector }[], min, limit)` — сортировка по
убыванию сходства.

### 5. Схема и миграция

`src/database/schema.ts`, рядом с `postAiReviews`:

```ts
/*
  Вектор смысла опубликованного поста (спека 56): один на пост. model — ключ из конфига
  (ollama/bge-m3, voyage/voyage-4): векторы разных моделей не сравниваются. textHash —
  sha256 текста, по которому считали: совпал — модель не вызываем
*/
export const postEmbeddings = sqliteTable('post_embeddings', {
  postId: integer('post_id').primaryKey().references(() => posts.id),
  model: text('model').notNull(),
  textHash: text('text_hash').notNull(),
  vector: blob('vector', { mode: 'buffer' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
```

Тип строки — в `database/types.ts`. `npx drizzle-kit generate --name post_embeddings` → `0035_post_embeddings.sql`
(только `CREATE TABLE`, на неё никто не ссылается, пересборки нет — прочитать SQL до `migrate`).
`npx drizzle-kit migrate` на dev. `scripts/seed-dev.ts` — `schema.postEmbeddings` в список
зачистки перед `schema.posts` (реш. 10).

### 6. Вычисление — `domains/posts/shared/postEmbeddings.ts` (`server-only`)

- `embeddingText(post: { title, lead, content })` — п. 4 спеки: `[title, lead, plainText(content)]`
  без пустых, через `\n\n`, `slice(0, maxChars)`. `textHash(text)` — `createHash('sha256')`.
- `startPostEmbedding(postId)` — `embedEnabled` нет → выход, иначе `after(() => embedPost(postId))`.
- `embedPost(postId)`: читает пост, должен быть `published` (успел уйти — выход). Совпали хеш и
  `model` у существующей строки — выход (п. 6). Иначе `aiEmbed({ texts: [text], kind: 'document' })`
  и upsert. `LlmError` и прочие ошибки → `console.error('Вектор поста', postId, причина)`, без
  проброса.
- `ensureEmbeddings()` и `backfill()` — реш. 11.
- `loadVectors(postIds?: number[])` — `{ postId, vector }[]` опубликованных постов с `model = embedModel`.

`changePostStatus`: после блока `submittedAt` — `if(to === 'published'){ startPostEmbedding(postId); }`.
В комментарий функции — одна фраза о спеке 56.

### 7. Похожие — `domains/posts/shared/similarPosts.ts` (`server-only`)

`similarPosts(post: { id }, exceptIds: number[]): Promise<CardRow[]>`, `SIMILAR_LIMIT = 3`.

1. `embedEnabled` → `ensureEmbeddings()`.
2. Есть вектор у поста (реш. 19) → `loadVectors()` без поста и `exceptIds` → `topBySimilarity(…,
   similarMin, 3)` → id.
3. Иначе → `byTags(postId, exceptIds)` (реш. 18), один core-select с `LEFT JOIN post_tags` и
   `count(case when tag_id in (...))`.
4. Карточки — как `authorMorePosts`: `findMany` с `author` и `POST_TAGS_WITH`, `withCardData`, порядок
   — по id из шага 2/3.

Страница поста: `more` считается в `Promise.all`, `similar` — после него (нужны id из `more`):
`await similarPosts(post, more.map(p => p.id))`. Это один синхронный запрос к SQLite, Suspense не
нужен. Секция — копия разметки «Ещё у…» с заголовком «Похожие истории», рисуется при
`similar.length > 0`.

### 8. Смысловой блок ленты

- `loadFeed.ts`: `searchCondition(search)` (реш. 12) вынести из `feedWhere`, экспорт
  `semanticCandidateIds(filter)` — `select id … where and(feedWhere(без search), not(searchCondition))`.
  Лента подписок (`follow`) на `/posts` не используется — `viewerId` не нужен.
- `globals/queryEmbeddings.ts` + `core/ttlCache.ts` — реш. 15.
- `domains/posts/shared/semanticFeed.ts` (`server-only`), `SEMANTIC_LIMIT = 6`:
  `semanticFeed(filter): Promise<CardRow[]>`. Выключено или `search.trim().length < 3` → `[]`.
  Дальше `ensureEmbeddings()`, вектор запроса: кэш → лимит `aiSearch` (реш. 16) → `aiEmbed({ kind:
  'query' })` → в кэш. Любая ошибка — `[]` и `console.error`. Затем кандидаты → `loadVectors(ids)` →
  `topBySimilarity(…, searchMin, 6)` → карточки, как в п. 7.
- `domains/posts/components/PostSemanticResults.tsx` — async server component, `{ filter, empty }`.
  Разметка: `section.ui-post-more.ui-feed-semantic` > `h2.ui-post-more__title` «Похоже по смыслу» >
  `.ui-post-grid` с `PostCardBridge`. При `empty`: строка `p.ui-feed-semantic__lead` «По словам ничего,
  но вот похожее по смыслу» над сеткой, без результатов — `<FeedEmpty />`.
- `PostSemanticSkeleton.tsx` — тот же заголовок, три `.ui-post-skeleton` (реш. 20).
- `FeedEmpty.tsx` — разметка «Ничего не нашлось» со страницы `/posts`, без изменений.
- `app/(public)/posts/page.tsx` — реш. 13. Флаг `semantic = embedEnabled && (filter.search?.trim().length ?? 0) >= 3`
  считает страница.

### 9. Стили — `src/theme/layout.css`

`.ui-feed-semantic` (отступ сверху меньше, чем у `.ui-post-more` под статьёй, — блок идёт сразу за
лентой), `.ui-feed-semantic__lead` (цвет приглушённого текста из токенов), `.ui-post-skeleton`
(реш. 20). Только токены `tokens.css`.

### 10. Env и деплой

- `.env.example`, после блока помощника автора:

  ```
  # Поиск по смыслу и «Похожие истории» (спека 56). Без OLLAMA_URL (local) или VOYAGE_API_KEY
  # (anthropic) эмбеддингов нет: похожие — по рубрикам, смыслового блока в ленте нет.
  # В Voyage уходят тексты опубликованных постов и поисковые запросы — без IP и пользователя
  # OLLAMA_EMBED_MODEL=bge-m3
  # VOYAGE_API_KEY=
  # VOYAGE_MODEL=voyage-4
  ```
- `render.yaml` — ИИ-переменных там пока нет, а `AI_PROVIDER` по умолчанию `local`. Поэтому одного
  ключа мало: в конец `envVars` идут `AI_PROVIDER` со значением `anthropic` и `VOYAGE_API_KEY` с
  `sync: false`. Комментарий: без ключа эмбеддингов нет. `anthropic` без `ANTHROPIC_API_KEY` даёт
  поиск без генерации, так и задумано (п. 2 спеки), поэтому на демо это безопасно.
- `Dockerfile` не меняется: скрипты новых файлов не импортируют, кроме `schema.ts`, который уже
  скопирован.

### 11. Документы

- `docs/lifecycles/post.md` — раздел «## Поиск по смыслу» после «Помощник автора»: вектор есть
  только у опубликованного поста и считается при каждом переходе в `published` (без правок — без
  вызова модели); похожие — только `published`, без вектора — по рубрикам; смысловой блок ленты —
  только опубликованные, те же фильтры; что уходит в Voyage; статусы и права не меняются.
- `CLAUDE.md`, раздел «ИИ»: абзац о спеке 56 — `aiEmbed` / `embedEnabled` / `embedModel`,
  `core/llm/ollamaEmbed.ts`, `voyageEmbed.ts`, таблица `post_embeddings` и ключ модели, добор в
  `after()` без скрипта, кэш запросов `globals/queryEmbeddings.ts`, лимит `aiSearch`, env.
- `docs/specs/README.md` — статус 56 → `план`.
- Отклонения в конец спеки — реш. 1 (модель), 10 (удаления нет), 14 (длина 100); после проверки — пороги.

### 12. Проверка кода

`npx tsc --noEmit`, `npm run lint`, `npm run build` (ловит `server-only` / `client-only` и Suspense в
`force-dynamic`). Codestyle — пустые строки вокруг `if` / `for`, публичное сверху.

## Проверка в браузере (следующая фаза, субагент со скилом `app-run`)

По разделу 5 спеки, пункты 1–9. Для п. 2–8 нужен Ollama с `bge-m3` (`ollama pull bge-m3`), для п. 9 —
`VOYAGE_API_KEY`. Вызовы модели видны в логе dev-сервера: временный `console.info` в `aiEmbed`
на время проверки, перед коммитом убрать. Порог подбирать так: вывести сходства 10 лучших для
3–4 запросов и 3 постов, выбрать значения, при которых соседние темы проходят, а случайные — нет.
Итоговые пороги и найденное — в «Отклонения» спеки.
