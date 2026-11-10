# 53. Авторы: страницы списка и живое число читателей — план

Спека — `53-authors-pages-live.md` (решения 1–11 приняты). Миграций нет, новых action нет,
lifecycle не затрагивается.

## Решения плана (в спеке не было или уточнено)

1. **Загрузка страницы — одна функция `loadAuthorsPage`** вместо `authorsDirectory`: тройка карточек,
   строки страницы, общее число, `page` / `pages`. Тройка «Больше всего читателей» без поиска и
   рубрики считается **на любой странице** (это три id по сортировке `popular` с `LIMIT 3`), а
   полные данные карточек грузятся только на первой: иначе вторая страница сдвинулась бы на три
   строки (п. 3 спеки). Порядок `popular` в SQL совпадает с прежним `byReaders` (подписчики → посты →
   `sort_ru(name)` → id) — JS-сортировка уходит.
2. **`cache()` с аргументами-примитивами** — `loadAuthorsPage(sort, q, tag, page)`: её зовут и
   `generateMetadata` (заголовок «Авторы — страница N» по **прижатой** странице), и сама страница.
   Объект фильтра ключом `cache()` не годится.
3. **Ссылки страницы строятся от `base = { sort, q, tag }`** без `page` — сортировки, чипы, «Все»,
   «Показать всех», `clearHref` поиска. Только `Pager` добавляет `page`. Так сброс страницы (п. 5
   спеки) не зависит от того, не забыли ли где-то `page: undefined`. `OfficeSearch.hidden` и так
   без `page`.
4. **Своя подписка — через то же событие, без локальной связи с кнопкой (п. 7 спеки).**
   `publishFollowersCount` вызывается в action **до** ответа, поэтому событие уходит в поток
   раньше, чем клиент получит результат action. Локальное событие окна не делаем; если проверка в
   браузере покажет заметную задержку — тогда `UserFollowButton` в `onSuccess` шлёт
   `window.dispatchEvent(new CustomEvent('vibe:followers', { detail }))`, и это отклонение
   дописывается в спеку.
5. **Компонент числа — `UserFollowersCount`, вид задаёт `view`: `'number' | 'label' | 'text'`**
   (`12` / `читателей` / `12 читателей`). Render-prop из серверного компонента в клиентский не
   передать (функция не сериализуется), а разметка мест разная (`dt`/`dd` в разном порядке,
   строка `__meta`, ячейка колонки), поэтому место само ставит обёртку, а внутрь — один или два
   экземпляра. Все экземпляры автора слушают одно событие, расходиться им не с чего; одна тема
   у нескольких компонентов — одна тема в потоке (`useLiveTopic` считает ссылки).
6. **Тема — prop `topic: LiveTopic`**, её выбирает место: плитка главной и профиль —
   `userTopic(id)`, карточка и строка `/authors` — `AUTHORS_TOPIC`. `shared/liveEvents.ts` без
   `server-only` / `client-only`, серверные компоненты импортируют его свободно.
7. **Новый `initial` сбрасывает число.** Компонент хранит `initial`, с которым показал число, и
   при новом `initial` с сервера (мягкая навигация на ту же строку, `router.refresh()`) берёт его —
   паттерн «подстроить state под prop при рендере», без `useEffect`.
8. **Формат числа — `toLocaleString('ru-RU')` во всех местах**, как в профиле (до 1000 вид не
   меняется). Строка на сервере и на клиенте одинаковая — локаль задана явно.
9. **Страница поста числа читателей не показывает** (проверено: `followersCount` /
   `UserFollowersCount` есть только в `/authors`, `/authors/[id]`, `AuthorTile`), пункт «вне scope»
   закрыт — там ничего не делаем.
10. **Порядок `dt`/`dd` в карточке и профиле не трогаем.** В `ui-spotlight__stats` разметка
    `dd, dt` при `column-reverse` (подпись сверху), в `ui-author-head__stats` — `dt, dd` (число
    сверху). Это вид спеки 30, здесь только оборачиваем те же теги.

## Шаги

### 1. dto — `domains/users/dto/userRequests.ts`

В `authorsFilterDto` — `page: z.coerce.number().int().min(1).catch(1).default(1)` (как
`postOfficeRequests.ts`). `AuthorsFilterDto` получает `page: number`.

### 2. Адрес — `domains/users/shared/authorsUrl.ts`

После `tag`: `if(filter.page && filter.page > 1){ params.set('page', String(filter.page)); }`.
Комментарий дополнить: «`page=1` не пишется».

### 3. Загрузка — `domains/users/shared/authorsDirectory.ts` → `loadAuthorsPage.ts`

Файл переименовать (`git mv`), экспорт:

```ts
export const AUTHORS_PAGE = 20;
export const AUTHORS_SPOTLIGHT = 3;

export type DirectoryAuthor = …; // строка с roles, ratingAverage: number | null, topics — как сейчас

/*
  Страница /authors (спеки 30, 53): без поиска и рубрики — три самых читаемых карточками (только на
  первой странице), список и пагинация — по остальным. С поиском или рубрикой карточек нет.
  Страница за пределами — последняя
*/
export const loadAuthorsPage = cache(async (sort: AuthorsSort, q: string | undefined, tag: string | undefined, page: number) => {
  …
  return { spotlight, rows, total, page, pages };
});
```

Внутри (внутренние helpers — ниже экспорта, по `codestyle.md`):

- `subqueries()` — `published`, `followers`, `ratings`, `followersCount` как сейчас (на каждый вызов —
  свои алиасы, они дешёвые).
- `conditions(q, tag)` — `textLike` + `exists` по рубрике, как сейчас.
- `select(where, orderBy)` — тот же `db.select({ … }).from(users).innerJoin(published).leftJoin(followers).leftJoin(ratings).where(where).orderBy(...)`
  без `limit` — вызывающий добавляет `.limit()/.offset()`.
- Шаги:
  1. `filtered = Boolean(q || tag)`.
  2. `top = filtered ? [] : select(undefined, order('popular')).limit(AUTHORS_SPOTLIGHT)` — полный
     запрос на любой странице (три строки — дёшево): на первой это карточки, на остальных — только
     id для исключения.
  3. `listWhere = and(...conditions, top.length ? notInArray(users.id, top.map(r => r.id)) : undefined)`.
  4. `listTotal` — `db.select({ n: count() }).from(users).innerJoin(published, …).where(listWhere)`
     (`followers` / `ratings` — left join, на число не влияют).
  5. `pages = Math.max(1, Math.ceil(listTotal / AUTHORS_PAGE))`, `page = Math.min(page, pages)`.
  6. `rows = listTotal === 0 ? [] : select(listWhere, order(sort)).limit(AUTHORS_PAGE).offset((page - 1) * AUTHORS_PAGE)`.
  7. `spotlight = page === 1 ? top : []`.
  8. `total = listTotal + top.length` — для подзаголовка (п. 4 спеки: по общему числу).
  9. `authorTopics(db, [ ...spotlight, ...rows ].map(r => r.id), TOPICS)` — только показанным;
     `map` строк (`parseRoles`, `Number(ratingAverage)`, `topics`) — общий helper `toAuthor`.
- `order(sort, by)` — без изменений.
- `import 'server-only'` остаётся; `cache` — из `react`.

Импорты `authorsDirectory` / `DirectoryAuthor` поправить: `app/(public)/authors/page.tsx`,
`AuthorSpotlight.tsx`, `AuthorListRow.tsx` (`grep -rn authorsDirectory src`).

### 4. Страница — `app/(public)/authors/page.tsx`

- `metadata` → `generateMetadata({ searchParams })`: `parse`, `loadAuthorsPage(...)`, title —
  `page > 1 ? \`Авторы — страница ${page}\` : 'Авторы'`.
- Страница: `const filter = authorsFilterDto.parse(await searchParams)`,
  `const base = { sort: filter.sort, q: filter.q, tag: filter.tag }`,
  `const [ { spotlight, rows, total, page, pages }, tags ] = await Promise.all([ loadAuthorsPage(filter.sort, filter.q, filter.tag, filter.page), tagsWithCounts() ])`.
- Убрать `SPOTLIGHT`, `byReaders`, вычисление `spotlight` / `rest`. `covers` — по `spotlight`, как
  сейчас.
- Все `authorsUrl({ ...filter, … })` → `authorsUrl({ ...base, … })`.
- Подзаголовок и пустое состояние — по `total` (вместо `authors.length`).
- Список — по `rows` (вместо `rest`).
- После `</section>` списка, перед `<HomeWriteBand />`:
  `<Pager page={page} pages={pages} href={n => authorsUrl({ ...base, page: n })} />`.
  Отступ — `.ui-pager { margin-top: 2rem }` уже есть; если баннер прилипает — отступ в
  `layout.css` у `.ui-authors-list + .ui-pager`, не инлайном.
- Комментарий страницы дополнить: «по 20 строк, карточки — только на первой».

### 5. Тема `authors` — `shared/liveEvents.ts`

```ts
// Тема — то, что смотрит вкладка: пост, автор или список авторов (спека 53, одна на страницу)
export type LiveTopic = `post:${number}` | `user:${number}` | 'authors';

export const AUTHORS_TOPIC: LiveTopic = 'authors';
```

`isLiveTopic`: `if(value === AUTHORS_TOPIC){ return true; }` перед регулярным выражением.
Комментарий у `'user.followers'`: «тема автора и тема `authors`». Комментарий у
`LIVE_TOPICS_LIMIT` («на странице их одна-две») → «на странице — до четырёх (главная)».
`app/api/events/route.ts` правок не требует — разбирает через `isLiveTopic`.

### 6. Публикация — `domains/users/shared/userFollows.ts`

`publishFollowersCount`: число считать один раз и слать дважды —
`liveBus.publishTopic(userTopic(userId), 'user.followers', data)` и
`liveBus.publishTopic(AUTHORS_TOPIC, 'user.followers', data)`. Комментарий: «…у всех, кто смотрит
автора или список авторов (спеки 29, 53)». Вызовы (`userFollowActions`, `userBlockActions`) не
меняются.

### 7. Компонент — `domains/users/components/UserFollowersCount.tsx`

```ts
type UserFollowersCountProps = {
  authorId: number,
  initial: number,
  // user:<id> — плитка и профиль, AUTHORS_TOPIC — /authors
  topic: LiveTopic,
  // number — «12», label — «читателей», text — «12 читателей»
  view: 'number' | 'label' | 'text'
}
```

- `const [ shown, setShown ] = useState({ initial, count: initial })`; при рендере
  `if(shown.initial !== initial){ setShown({ initial, count: initial }); }` (реш. 7 плана);
  `count = shown.initial === initial ? shown.count : initial`.
- `useLiveTopic(topic)`, `useLiveEvent('user.followers', data => { if(data.userId === authorId){ … } })`.
- Возвращает только текст (фрагмент): число `count.toLocaleString('ru-RU')`, подпись `plural(count, [ 'читатель', 'читателя', 'читателей' ])`.
- Комментарий: живое число читателей в профиле, плитке главной, карточке и строке `/authors`;
  обёртку ставит место.

### 8. Места

- **`AuthorHead.tsx`** (профиль):
  `<div><dt><UserFollowersCount … view="label" /></dt><dd><UserFollowersCount … view="number" /></dd></div>`,
  `topic={userTopic(author.id)}`.
- **`AuthorTile.tsx`** (главная): `· { followersCount } { plural }` →
  `· <UserFollowersCount authorId={author.id} initial={author.followersCount} topic={userTopic(author.id)} view="text" />`.
  Комментарий плитки: «читатели — живые (спека 53)».
- **`AuthorSpotlight.tsx`**: в `__stats` — `<div><dd><… view="number" /></dd><dt><… view="label" /></dt></div>`
  (порядок как сейчас, реш. 10), в `__meta` — `view="text"`; `topic={AUTHORS_TOPIC}`.
- **`AuthorListRow.tsx`**: `__meta` — `view="text"`, ячейка «Читателей» — `view="number"`;
  `topic={AUTHORS_TOPIC}`.
- Все три остаются серверными (без `'use client'`): внутри — клиентский `UserFollowersCount`,
  props — примитивы (скил `resource` не нужен).

### 9. Документы

- `CLAUDE.md`, «Уведомления и живой канал», абзац о темах: добавить «`authors` — список авторов
  (`user.followers` всех авторов, спека 53)».
- Спека 53: статус «реализовано, дальше проверка в браузере»; `docs/specs/README.md`, строка 53 —
  статус `код` (после проверки — `done`).

### 10. Проверка кода

`npx tsc --noEmit`, `npm run lint`, `npm run build` (сбой загрузки шрифта — повторить). В dev после
переименования модуля, если страница отдаёт `undefined` — `touch next.config.ts`.

## Проверка в браузере (следующая фаза, субагент со скилом `app-run`)

**Массовые авторы — на копии `dev.db`, не в сиде.** Бэкап `cp storage/dev.db
storage/dev.db.bak-53`, затем скрипт в scratchpad (или `sql-dev` `exec`): ~45 пользователей с ролью
`author` (имена «Автор 01…45», `password` не нужен — входить ими не будем) и по одному
опубликованному посту у каждого, части — подписчиков (разные числа, чтобы сортировки различались),
одному — рубрика для фильтра. Вставка — с учётом `posts_type_fields_check` и внешних ключей:
посмотреть `schema`, как `fill.ts` пишет пост типа `text`. После проверки —
`cp storage/dev.db.bak-53 storage/dev.db` и `touch next.config.ts`.

Сценарии — раздел 4 спеки целиком. Отдельно:

- `/authors`: 3 карточки + 20 строк + Pager; `?page=2` — без карточек, первая строка — 21-й после
  тройки; `?page=99` — последняя, заголовок вкладки «Авторы — страница N» с её номером;
  `?page=abc` — первая; многоточие при 3+ страницах.
- Сортировка / чип / поиск со второй страницы — адрес без `page`; ссылки Pager сохраняют
  `sort`, `q`, `tag`; с поиском — карточек нет, пагинация по найденным.
- Подзаголовок — общее число (включая тройку), не 20.
- Живое число: вошедший жмёт «Подписаться» в карточке → число в карточке (`__stats` и на
  телефоне `__meta`) +1 сразу; в строке — и колонка, и `__meta`; на главной — плитка; в
  профиле — как раньше. Вторая вкладка (гость) на `/authors`, на главной и в профиле видит
  изменение без перезагрузки. Порядок строк не меняется.
- Поток: в DevTools `/api/events?topics=authors` на `/authors`, на главной — 4 темы `user:<id>`,
  ответов 400 нет. Если событие заметно отстаёт от ответа action — реш. 4 плана, отклонение в спеку.
- Хвосты спеки 30 (вошедший, 721–1080px, без обложки, листание на телефоне) — по спеке.
