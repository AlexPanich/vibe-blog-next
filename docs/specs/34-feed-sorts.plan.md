# 34. Сортировки ленты — план

Спека — `34-feed-sorts.md`. Миграций нет, lifecycle не затрагивается.

## Решения плана (в спеке не было или уточнено)

1. **`sort=rating` → `popular` — в dto, без редиректа.** `z.preprocess` заменяет `rating` на
   `popular` до `z.enum`: старая ссылка открывает «Популярные», а все ссылки страницы
   (сегменты, фильтры, догрузка) уже канонические. Редирект ради одного параметра не нужен.
2. **Период по умолчанию — функция, а не значение в dto.** dto по-прежнему отдаёт
   `period: undefined`, если в URL его нет: иначе смена сортировки тащила бы «месяц» в «Новые».
   Новый модуль `domains/posts/shared/feedPeriod.ts` (без пометок server/client — нужен и
   `FeedControls`):
   - `defaultFeedPeriod(sort)` → `'month'` для `popular` / `discussed`, `'all'` для остальных;
   - `feedPeriod(filter)` → `filter.period ?? defaultFeedPeriod(filter.sort)` — действующий период;
   - `feedPeriodParam(filter)` → значение для URL: `undefined`, если действующий период равен
     умолчанию сортировки (`?period=month` у «Популярных» и `?period=all` у «Новых» не пишутся).
     URL канонический: одна выборка — один адрес.

   Пользуются ей: `feedWhere` (условие по `feedPeriod`, `'all'` — без условия), `feedUrl` и
   `FeedSearch` (параметр / скрытое поле — через `feedPeriodParam`), `FeedControls` (значение
   списка — `feedPeriod`), `isPlainFeed` (`feedPeriod(filter) === 'all'` вместо `!filter.period`).
3. **Сегмент сохраняет явно выбранный период**, как сейчас сохраняет остальные условия: из
   «Новых» с `week` в «Популярные» — тоже неделя. Из «Популярных» без периода в «Новые» — всё
   время (у `filter.period` нет значения).
4. **Популярные — формула в SQL**, `C = 5`:
   `score = (C · m + Σ) / (C + n)`, `m` — некоррелированный подзапрос
   `(SELECT avg(value) FROM post_ratings)` (SQLite считает его один раз). `ratingAggregate()`
   получает колонку `sum` (`sum(value).as('rating_sum')`); `average` / `total` остаются —
   их использует `homeBoard.weekPick`. Порядок: `n IS NULL` в конец → `score DESC` →
   `publishedAt DESC` → `id DESC`. Тай-брейк по числу оценок (как было у «Лучших») убран: спека —
   «при равенстве новее выше». `m` — по всем оценкам, без фильтра по статусу поста: оценки бывают
   только у опубликованных (заблокированные — капля), отдельный join ради этого не нужен.
5. **Обсуждаемые — свой агрегат** `commentAggregate()` в новом
   `domains/posts/shared/postComments.ts` (рядом с `ratingAggregate`, тем же видом):
   `SELECT post_id, count(*) AS comment_count FROM comments WHERE deleted_at IS NULL AND hidden_at IS NULL GROUP BY post_id`,
   `imageId` не фильтруется — комментарии к фото считаются. Порядок: `coalesce(count, 0) DESC` →
   `publishedAt DESC` → `id DESC` (посты без комментариев не уходят «в конец» отдельно — у них 0,
   и это и есть конец).

   **Расхождение с карточкой** (сознательное, по спеке п. 3): `commentsCount` на карточке
   (`postCards.commentCounts`) считает только комментарии к посту и включает скрытые. Порядок
   «Обсуждаемых» может не совпасть с цифрами на карточках. Карточку не трогаем — дописать в
   «Отклонения» спеки, если проверка сочтёт это заметным.
6. **Агрегаты джойнятся только своей сортировке.** Сейчас `ratingAggregate` джойнится в каждой
   ленте — лишний `GROUP BY` по всем оценкам. `loadFeed` строит запрос через `.$dynamic()`,
   а `feedOrder` превращается в `applyFeedSort(query, sort)`: добавляет `leftJoin` нужного агрегата
   (или никакого) и `orderBy`. Последним в порядке всегда `posts.id` — как сейчас.
7. **«Мои подписки» — клиентский `FeedFollowTab`.** `FeedSortTabs` — серверный, а публичная часть
   сессию на сервере не читает (пользователь — из `useUser()`, скил `hydration`). Render-prop
   `UserGate auth={…}` из серверного компонента не передать (функция), поэтому маленький
   `'use client'` компонент `domains/posts/components/FeedFollowTab.tsx`: `useUser()`, до
   `ready` и для гостя — `null`, вошедшему — `<Link href="/office/feed">Мои подписки</Link>`
   (без `data-active`). Ссылка без условий текущей ленты — спека: «просто ссылка». На сервере и в
   первом рендере сегмента нет → гидрация не расходится; появляется после неё (сдвиг ширины
   дорожки допустим — она `inline-flex` справа).

   В `office/feed` (`filter.follow`) `FeedFollowTab` не рендерится.
8. **Список «Сортировка»** — четвёртый (в кабинете третий) `Select` в `FeedControls`:
   `data = [ { value: 'old', label: 'Старые' }, { value: 'author', label: 'По автору' } ]`,
   `placeholder="Сортировка"`, `aria-label="Сортировка"`, `value = ['old','author'].includes(sort) ? sort : null`
   — при сегментной сортировке показывает плейсхолдер. Выбор → `go({ sort })`. Вернуться — кликом
   по сегменту (у сегментов `data-active` сравнивает `filter.sort`, так что при `old`/`author` ни
   один не активен — «сегмент гаснет» получается сам). Отдельного пункта «по умолчанию» нет.
9. **Подпись периода «Всё время»** получает значение `'all'` вместо `''`: `PERIODS` в
   `FeedControls` — `all / week / month / year`. Выбор «Всё время» у «Новых» уходит в URL как
   отсутствие параметра (п. 2), у «Популярных» — как `?period=all`.

## Шаги

### 1. `domains/posts/dto/postFeedRequests.ts`
- `FEED_SORTS = [ 'new', 'popular', 'discussed', 'old', 'author' ] as const`.
- `FEED_PERIODS = [ 'all', 'week', 'month', 'year' ] as const`.
- `sort: z.preprocess(v => v === 'rating' ? 'popular' : v, z.enum(FEED_SORTS)).catch('new').default('new')`
  — комментарий: старые ссылки «Лучших» (спека 34, п. 6). Проверить, что `postFeedPageDto`
  (`.omit`) и тип `PostFeedFilterDto['sort']` выводятся как union, а не `unknown`; если
  `preprocess` портит вывод — `z.enum(FEED_SORTS).or(z.literal('rating').transform(() => 'popular' as const))`.

### 2. `domains/posts/shared/feedPeriod.ts` (новый)
Три функции из решения 2. Тип аргумента — `Pick<PostFeedFilterDto, 'sort' | 'period'>`
(`feedUrl` получает `Partial` — там `sort ?? 'new'`).

### 3. `domains/posts/shared/postRatings.ts`
В `ratingAggregate()` — колонка `sum: sum(postRatings.value).as('rating_sum')`. Комментарий
функции: агрегаты для «Популярных» и выбора недели.

### 4. `domains/posts/shared/postComments.ts` (новый, `'server-only'`)
`commentAggregate()` из решения 5, алиас подзапроса `comment_agg`, колонка `total`.

### 5. `domains/posts/shared/loadFeed.ts`
- Запрос id: `db.select(...).from(posts).innerJoin(users, …).where(where).$dynamic()`, затем
  `applyFeedSort(query, filter.sort)`, `.limit().offset()`.
- `applyFeedSort` (внизу файла, вместо `feedOrder`):
  - `popular` — `leftJoin(ratingAggregate())`, порядок из решения 4, `m` и `C` — константы /
    `sql` рядом (`const BAYES_WEIGHT = 5`). Деление — в float: `m` из `avg` уже вещественное, но
    `sum` целое — писать `(${BAYES_WEIGHT} * m + ${r.sum}) * 1.0 / (${BAYES_WEIGHT} + ${r.total})`;
  - `discussed` — `leftJoin(commentAggregate())`, порядок из решения 5;
  - `old`, `author`, `new` — без join, как сейчас.
- `feedWhere`: вместо `if(filter.period)` — `const period = feedPeriod(filter); if(period !== 'all')`.
  `PERIOD_DAYS` — без `all`.

### 6. `domains/posts/shared/feedUrl.ts`
`period` — через `feedPeriodParam(filter)`. Комментарий в шапке: период по умолчанию зависит от
сортировки.

### 7. `domains/posts/shared/plainFeed.ts`
`!filter.period` → `feedPeriod(filter) === 'all'`. Плашка «N новых постов» и так только у
`sort === 'new'` (спека п. 5) — проверить, что условие осталось.

### 8. `domains/posts/components/FeedSearch.tsx`
Скрытое поле `period` — по `feedPeriodParam(filter)`.

### 9. `domains/posts/components/FeedSortTabs.tsx`
`SORTS`: `new` «Новые», `popular` «Популярные», `discussed` «Обсуждаемые»; после них
`{ !filter.follow && <FeedFollowTab /> }`. Комментарий: «Старые» и «По автору» — в `FeedControls`.

### 10. `domains/posts/components/FeedFollowTab.tsx` (новый, `'use client'` + `'client-only'`)
Решение 7. `Link` из `@/components/general/Link`, класс не нужен — стили `.ui-segments a`.

### 11. `domains/posts/components/FeedControls.tsx`
- `PERIODS` — со значением `'all'` (решение 9), `value={feedPeriod(filter)}`.
- Новый `Select` «Сортировка» (решение 8) — последним. Комментарий компонента: тип, автор,
  период, сортировка.
- Ширина: на десктопе в `/posts` строка `.ui-feed-tools` уже держит поиск + 3 списка по 11rem;
  четвёртый может перенести строку — проверить на 1280px. Если переносит — `.ui-feed-select`
  ужать до 10rem (в `layout.css`), на телефоне списки и так прокручиваются строкой.

### 12. Документы
- `docs/specs/34-feed-sorts.md` и `docs/specs/README.md`: после реализации — статус `done`
  (статус «план» выставлен вместе с планом).
- Спека 05 описывает старые сортировки — не править (история), спека 34 её заменяет.

## Проверка (фаза 4, скил `app-run`)

1. `/posts` гостем: сегменты «Новые / Популярные / Обсуждаемые», «Моих подписок» нет; вошедшим
   (`alice@example.com`) — есть и ведёт на `/office/feed`; в `/office/feed` — нет.
2. «Популярные»: URL `?sort=popular`, список «Период» показывает «За месяц», URL без `period`.
   Порядок по формуле — сверить с SQL через MCP `sql-dev` (топ-5 с `score`) за тот же месяц.
   Пост без оценок — после всех оценённых.
3. «Популярные» → «Всё время»: URL `?sort=popular&period=all`, постов больше. Оттуда «Новые» —
   URL `/posts` (без `period`).
4. «Обсуждаемые»: порядок по числу видимых комментариев (вкл. к фото, без удалённых/скрытых) —
   сверить SQL-запросом; при равенстве — новее выше.
5. `/posts?sort=rating` открывает «Популярные».
6. Список «Сортировка» → «Старые»: ни один сегмент не активен, URL `?sort=old`; клик по «Новые»
   возвращает сегмент, список снова с плейсхолдером.
7. Поиск в ленте при `sort=popular&period=all` сохраняет оба параметра.
8. Плашка «N новых постов» (опубликовать пост другим пользователем): видна только на `/posts`
   без условий.
9. Догрузка (`limit`, прокрутка) в «Популярных» и «Обсуждаемых» — без дублей и пропусков.
10. `/office/feed`: сортировки и список работают внутри подписок.
11. `npx tsc --noEmit`, `npm run lint`.
