# 44. Поиск и фильтры в кабинете — план

Спека — `44-office-search-filters.md` (решения 1–16 приняты). Миграций нет, новых таблиц, полей
и индексов нет. Lifecycle не меняется. Новых action нет: меняются входы
`loadNotificationsAction` и `readAllNotificationsAction`.

## Решения плана (в спеке не было или уточнено)

1. **Числа вкладок уведомлений считает сервер и шлёт в событиях**, а не клиент по типу из
   события (уточнение реш. 9). Клиентская арифметика расходится: строка группы (спека 51)
   заменяет непрочитанную строку, которой на отфильтрованной вкладке нет в списке, а задачи
   модерации удаляются без события. Поэтому `notification.created` и `notification.read` несут
   `unreadTabs: Record<NotificationTab, number>` — один `GROUP BY type` на получателя, как уже
   делается `countUnread`. Поле `unread` (колокольчик, меню) остаётся как есть.
2. **«Прочитать все» на вкладке** — `readAllNotificationsAction({ tab })`; событие
   `notification.read` получает `tab: NotificationTab | null` (при `id === null`: `null` —
   прочитано всё, иначе — только типы вкладки). Колокольчик на `id === null && tab` убирает из
   открытой панели только строки этой вкладки.
3. **`?tab=moderation` в `loadNotificationsAction` у не-staff не проверяется**: это его же
   уведомления (бывшему модератору остаются старые задачи), фильтр ничего чужого не открывает.
   Прижатие к «Все» — только на странице (реш. 6 спеки).
4. **Подзаголовок уведомлений** («N новых / Всё прочитано») — по всем, не по вкладке. Кнопка
   «Прочитать все» видна, если на открытой вкладке есть непрочитанные.
5. **Сортировка избранного — пилюля с меню**, как `TagSortMenu` (в макете — «Сначала новые ▾»):
   `PostFavoriteSortMenu`, подписи «Сначала новые» (`added`) и «По дате публикации»
   (`published`). Класс пилюли обобщается: `.ui-tag-bar__sort` → `.ui-sort-pill` (старый класс
   убрать, `TagSortMenu` перевести).
6. **«Ещё ▾» обобщается внутри домена `posts`**: им пользуются только «Мои посты», «Все посты»
   и избранное — все в `posts`. `PostStatusMoreTab` → `PostMoreTab`, пункт
   `{ key: string, label: string, href: Route, count: number }`, `active?: string`.
7. **Неизвестный `?tag=`** — и несуществующий slug, и рубрика, которой нет среди моих
   отложенных опубликованных постов, — «Все» (slug ищется только в посчитанных рубриках).
8. **Поиск в «Пользователях»** — по `name` и `email`; email в базе латиницей, но `lower_ru`
   на нём безвреден, хелпер один.
9. **Хелпер `textLike` поднимается в `src/shared/textLike.ts`**: копии уже в трёх доменах
   (`loadMyPosts`, `authorsDirectory`, `loadMessagePicker`), теперь нужен и `users`, и
   `posts`. Копии заменяются на него. `loadFeed` (склейка трёх полей) не трогать.
10. **Старый `?filter=banned`** ничем не поддерживается (попадёт во «Все»); единственная
    ссылка на него — «назад» в `admin/users/[id]/page.tsx` — переходит на `?role=banned`.
11. **Поиск в «Всех постах» по автору** — подзапрос с явными алиасами в сыром SQL:
    `posts.user_id IN (SELECT u.id FROM users u WHERE lower_ru(u.name) LIKE ? ESCAPE '\')`.
    Подзапрос drizzle пишет колонки без таблицы (см. комментарий в `loadAdminUsers`).

## Шаги

### 1. `src/shared/textLike.ts`
```ts
import { sql, type SQL, type AnyColumn } from "drizzle-orm";
import { escapeLike } from "@/shared/escapeLike";

// Подстрока без регистра: lower() в SQLite кириллицу не понижает — lower_ru из globals/db.ts
export function textLike(column: AnyColumn | SQL, q: string): SQL {
  return sql`lower_ru(${column}) LIKE ${likePattern(q)} ESCAPE '\\'`;
}

// '%подстрока%' для сырого SQL (подзапросы с алиасами)
export function likePattern(q: string): string {
  return `%${escapeLike(q.toLocaleLowerCase('ru'))}%`;
}
```
Заменить локальные копии: `titleLike` в `domains/posts/shared/loadMyPosts.ts`, условие в
`domains/users/shared/authorsDirectory.ts:41`, `domains/messages/shared/loadMessagePicker.ts:53`.

### 2. Общий поиск — `src/components/general/OfficeSearch.tsx`
Серверный компонент (без `'use client'`, как нынешние копии), GET-форма.
```ts
type OfficeSearchProps = {
  action: Route,
  q: string | undefined,
  placeholder: string,
  label: string,                                   // aria-label поля
  hidden?: Record<string, string | undefined>,     // undefined и '' не пишутся
  clearHref: Route,                                // ссылка «×», видна при q
  className?: string                               // модификатор обёртки: ui-filter-bar__search, …
  iconSize?: number                                // 16 по умолчанию; у /authors — 17
}
```
Разметка — как в `MyPostsSearch` (`form.ui-search[role=search]`, `IconSearch`, `input[type=search]
name=q`, скрытые поля, `Link.ui-search__clear` с `IconX` и `aria-label="Сбросить поиск"`).

Перевести места вызова и удалить старые файлы:
- `app/office/posts/page.tsx` — `MyPostsSearch` → `OfficeSearch action="/office/posts"
  hidden={{ status }} clearHref={myPostsUrl({ status })} className="ui-filter-bar__search"`;
- `app/office/moderation/tags/page.tsx` — `TagSearch` → `hidden={{ sort: sort !== 'posts' ? sort : undefined }}`,
  `className="ui-tag-bar__search"`;
- `app/(public)/authors/page.tsx` — `AuthorsSearch` → `hidden={{ sort: …!== 'popular', tag }}`,
  `className="ui-authors-search"`, `iconSize={17}`.

Удалить: `domains/posts/components/MyPostsSearch.tsx`, `domains/tags/components/moderation/TagSearch.tsx`,
`domains/users/components/AuthorsSearch.tsx`.

### 3. «Ещё ▾» — `domains/posts/components/PostMoreTab.tsx`
Переименовать `PostStatusMoreTab.tsx` (git mv), пункты обобщённые:
```ts
type PostMoreTabProps = {
  items: { key: string, label: string, href: Route, count: number }[],
  active?: string
}
```
Подпись пилюли — `current?.label ?? 'Ещё'`. Импорт `POST_STATUS_TAB_LABELS` уходит в места
вызова: `office/posts/page.tsx` и `office/admin/posts/page.tsx` собирают
`{ key: status, label: POST_STATUS_TAB_LABELS[status], href, count }`.

### 4. Админ — Все посты
**dto** `domains/posts/dto/postAdminRequests.ts` — добавить `q` как в `myPostsFilterDto`:
```ts
q: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
```
Комментарий «Поиск — спека 44» обновить.

**url** `domains/posts/shared/adminPostsUrl.ts` — порядок `status`, `q`, `page`.

**загрузка** `domains/posts/shared/loadAdminPosts.ts`:
- `search = filter.q ? or(textLike(posts.title, q), sql\`${posts.userId} IN (SELECT u.id FROM users u WHERE lower_ru(u.name) LIKE ${likePattern(q)} ESCAPE '\\'\)\`) : undefined`;
- `all = countByStatus(undefined)`, `found = search ? countByStatus(search) : all` (функция
  получает `where`, как в `loadMyPosts`);
- `total` (подзаголовок) = `sum(all)`, `foundTotal = sum(found)`, `listed` — из `found`;
- `findMany.where = and(search, status)`;
- `authors` — без поиска, как сейчас.
- Вернуть `{ rows, counts: found, total, foundTotal, authors, page, pages }`.

**страница** `app/office/admin/posts/page.tsx`:
- `.ui-filter-bar` > (`nav.ui-tabs` + `OfficeSearch action="/office/admin/posts"
  placeholder="Найти по заголовку или автору" label="Поиск поста по заголовку или имени автора"
  hidden={{ status }} clearHref={adminPostsUrl({ status })} className="ui-filter-bar__search"`);
- «Все» — `foundTotal`; ссылки вкладок — `adminPostsUrl({ status, q: filter.q })` (реш. 5
  спеки: `q` сохраняется, `page` сбрасывается);
- пусто с `q` — `.ui-empty` `IconSearch` «По запросу «…» постов нет.» + `Link` «Сбросить
  поиск» (`adminPostsUrl({ status })`); без `q` — как сейчас.
- Комментарий страницы обновить («поиск ?q= — спека 44»).

### 5. Админ — Пользователи
**dto** `domains/users/dto/userAdminRequests.ts`:
```ts
export const ADMIN_USER_TABS = [ 'author', 'moderator', 'banned' ] as const;
export type AdminUserTab = (typeof ADMIN_USER_TABS)[number];

export const userAdminFilterDto = z.object({
  role: z.enum(ADMIN_USER_TABS).optional().catch(undefined),
  q: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})
```
`filter` удаляется.

**url** `domains/users/shared/adminUsersUrl.ts` — `role`, `q`, `page`.

**загрузка** `domains/users/shared/loadAdminUsers.ts`:
- `search = q ? or(textLike(users.name, q), textLike(users.email, q)) : undefined`;
- `all = countUsers(now)` (подзаголовок), `found = q ? countUsers(now, search) : all` (вкладки);
  `countUsers(now, where?)` — тот же select с `.where(where)`;
- `tabWhere(role, now)`: `author` → `like(users.roles, '%"author"%')`, `moderator` →
  `'%"moderator"%'`, `banned` → `banActiveSql(now)`, `undefined` → `undefined`
  (реш. 15: голую проверку `bannedAt` не писать);
- `listed` — `found.total` / `found.authors` / `found.moderators` / `found.banned` по `role`;
- список — `.where(and(search, tabWhere(filter.role, now)))`;
- вернуть `{ rows, all, found, page, pages }`.

**страница** `app/office/admin/users/page.tsx`:
- подзаголовок — из `all`;
- `.ui-filter-bar` > вкладки + `OfficeSearch action="/office/admin/users" placeholder="Имя или email"
  label="Поиск пользователя по имени или email" hidden={{ role }} clearHref={adminUsersUrl({ role })}`;
- вкладки (массив в конце файла): Все (`found.total`) / Авторы (`found.authors`) / Модераторы
  (`found.moderators`) / Заблокированные (полная/короткая подпись «Заблок.», `found.banned`),
  href — `adminUsersUrl({ role, q })`;
- пусто: с `q` — «По запросу «…» никого нет. Сбросить поиск»; без `q` по вкладкам —
  «Авторов нет.» / «Модераторов нет.» / «Заблокированных нет.» / «Пользователей нет.».

**ссылка назад** `app/office/admin/users/[id]/page.tsx:43` — `adminUsersUrl(banned ? { role: 'banned' } : {})`.

### 6. Уведомления — маппинг вкладок
`domains/notifications/shared/notificationTabs.ts` (без пометок: нужен серверу и клиенту):
```ts
export const NOTIFICATION_TABS = [ 'posts', 'comments', 'followers', 'moderation' ] as const;
export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TAB_LABELS: Record<NotificationTab, string> = {
  posts: 'Посты', comments: 'Комментарии', followers: 'Подписчики', moderation: 'Модерация'
};

// Пропуск нового типа ломает tsc (реш. 6); null — только во «Все»
export const NOTIFICATION_TAB_OF: Record<NotificationType, NotificationTab | null> = { … по таблице спеки … };

export function notificationTypesOf(tab: NotificationTab): NotificationType[]

// Вкладки человека: «Модерация» — у moderator и admin
export function notificationTabsFor(roles: readonly Role[]): NotificationTab[]
```
Re-export `NotificationTab` (тип) через `domains/notifications/exports/notificationResources.ts` —
нужен `shared/liveEvents.ts`.

### 7. Уведомления — dto, url, загрузка
**dto** `notificationRequests.ts`:
- `notificationPageDto` + `tab: z.enum(NOTIFICATION_TABS).optional()`;
- новый `notificationReadAllDto = z.object({ tab: z.enum(NOTIFICATION_TABS).optional() })`;
- `notificationFilterDto` (searchParams страницы) — `tab: z.enum(NOTIFICATION_TABS).optional().catch(undefined)`.

**url** `domains/notifications/shared/notificationsUrl.ts` — `notificationsUrl({ tab })`:
`/office/notifications` или `?tab=…`.

**ресурс** `notificationResources.ts`:
```ts
export const notificationUnreadTabsResource = z.object({ posts: z.number(), comments: z.number(), followers: z.number(), moderation: z.number() })
// notificationPageResource + unreadTabs
```

**загрузка** `shared/loadNotifications.ts`:
- `loadNotificationPage(userId, { beforeId, unreadOnly, tab } = {})` — объект вместо
  позиционных; `tab` → `inArray(notifications.type, notificationTypesOf(tab))`. Вернуть ещё
  `unreadTabs: countUnreadByTab(userId)`.
- `countUnreadByTab(userId)`: `select type, count() … where userId и readAt IS NULL group by type`,
  сумма в JS по `NOTIFICATION_TAB_OF` (строка группы — 1).
- Колокольчик (`unreadOnly`) зовёт тот же `loadNotificationsAction` — проверить, что вызов
  в `NotificationBell` передаёт объект `{ beforeId, unreadOnly: true }` (сигнатура action не
  меняется по форме — это уже объект dto).

### 8. Уведомления — actions и живой канал
`actions/notificationActions.ts`:
- `loadNotificationsAction` — `loadNotificationPage(auth.id, { beforeId, unreadOnly, tab })`;
- `readAllNotificationsAction.inputSchema(notificationReadAllDto)`: `where` + `tab ?
  inArray(type, notificationTypesOf(tab))`; `publishRead(auth.id, null, tab ?? null)`;
- `publishRead(userId, id, tab)` → событие `{ id, tab, unread, unreadTabs }`, возврат
  `{ unread, unreadTabs }`. `readNotificationAction` — `tab: null`.

`shared/liveEvents.ts`:
```ts
'notification.created': { notification: NotificationItemResource, unread: number, unreadTabs: Record<NotificationTab, number> },
// id — прочитано одно; null — «Прочитать все»: tab null — всё, иначе — вкладка (спека 44)
'notification.read': { id: number | null, tab: NotificationTab | null, unread: number, unreadTabs: Record<NotificationTab, number> },
```
`shared/publishNotifications.ts`: кэш по получателю — `{ unread, unreadTabs }`;
`publishNotificationsRead` — `tab: null` и `unreadTabs`.

`NotificationBell.tsx`, обработчик `notification.read`: `data.id === null` → `data.tab === null
? []` : фильтр строк, чей `NOTIFICATION_TAB_OF[type] !== data.tab`. `readAllNotificationsAction`
из колокольчика и `NotificationDigest` — вызывать с `{}` (теперь есть схема).

### 9. Уведомления — страница и список
`app/office/notifications/page.tsx`:
```ts
const allowed = notificationTabsFor(user.roles);
const { tab: raw } = notificationFilterDto.parse(await searchParams);
const tab = raw && allowed.includes(raw) ? raw : undefined;
return <NotificationList key={tab ?? 'all'} tab={tab} tabs={allowed}
  page={resource(notificationPageResource, loadNotificationPage(user.id, { tab }))} />;
```
`key` — чтобы при смене вкладки список не держал состояние прошлой.

`components/NotificationList.tsx` (props `tab?: NotificationTab`, `tabs: NotificationTab[]`):
- state `unreadTabs` (из `page`, событий и ответов `readOne` / `readAll` / `load`);
- вкладки под `OfficeHead`: `nav.ui-tabs[aria-label="Вид уведомлений"]` — «Все» + `tabs`,
  `Link href={notificationsUrl({ tab })}`, число `.ui-tabs__count` — у «Все» `unread`, у вкладки
  `unreadTabs[t]`; 0 — без числа (реш. 7). Вкладки видны и при пустом списке, кроме случая
  «у человека нет уведомлений вовсе» — тогда как сейчас `EmptyState` (признак: `!tab &&
  items.length === 0`);
- `notification.created`: `belongs = !tab || NOTIFICATION_TAB_OF[item.type] === tab`; строку
  добавлять только при `belongs`, замену группы (`isReplacedBy`) — тоже только при `belongs`;
  `unread` / `unreadTabs` — всегда;
- `notification.read`: `id !== null` — как сейчас; `id === null` — помечать прочитанными при
  `data.tab === null || data.tab === tab || (!tab && NOTIFICATION_TAB_OF[type] === data.tab)`;
- «Прочитать все»: видна при `(tab ? unreadTabs[tab] : unread) > 0`, `readAll.execute({ tab })`,
  оптимистично — все строки списка прочитаны;
- «Показать ещё» — `load.execute({ beforeId, tab })`;
- пустая вкладка — `.ui-empty` с `IconBell`: «На этой вкладке уведомлений нет.» + `Link`
  «Все уведомления» (`/office/notifications`).

### 10. Избранное
**dto** `domains/posts/dto/postFavoriteRequests.ts` (новый; если есть подходящий — дописать туда):
```ts
export const FAVORITE_SORTS = [ 'added', 'published' ] as const;
export const FAVORITE_SORT_LABELS = { added: 'Сначала новые', published: 'По дате публикации' };
export const favoriteFilterDto = z.object({
  tag: z.string().trim().max(80).optional().transform(v => v || undefined).catch(undefined),
  sort: z.enum(FAVORITE_SORTS).catch('added').default('added'),
})
```
**url** `domains/posts/shared/favoritesUrl.ts` — `tag`, `sort` (`added` не пишется).

**загрузка** `domains/posts/shared/loadFavorites.ts`:
- `loadFavorites(userId, { limit?, tagId?, sort? } = {})` — объект; вызовы в
  `authors/[id]/page.tsx` (`{ limit: LATEST }`) и `authors/[id]/favorites/page.tsx` поправить;
- `tagId` → `exists(select 1 from post_tags where post_id = postFavorites.postId and tag_id = ?)`
  (сырой SQL с алиасом, как в шаге 4);
- `sort === 'published'` → `orderBy(desc(posts.publishedAt), desc(posts.id))`; иначе как сейчас;
- новый `countFavoriteTags(userId)`: `select tags.id, slug, name, count() from post_favorites
  join posts (published) join post_tags join tags where user group by tags.id` → сортировка в
  JS: `n desc`, потом `name.localeCompare(b.name, 'ru')`.

**страница** `app/office/favorites/page.tsx` (`PageProps<'/office/favorites'>`):
- `filter = favoriteFilterDto.parse(...)`; `[ tagsCount, total, settings ]` — `countFavoriteTags`,
  `countFavorites`, настройки; `tag = tagsCount.find(t => t.slug === filter.tag)` (реш. плана 7);
  `list = loadFavorites(user.id, { tagId: tag?.id, sort: filter.sort })`;
- `total === 0` → `EmptyState` как сейчас; подзаголовок — из `total` (реш. 13 спеки);
- `.ui-filter-bar` > `nav.ui-tabs[aria-label="Рубрика"]`: «Все» (`total`), первые 6 рубрик
  (`FAVORITE_MAIN_TABS = 6`) ссылками `favoritesUrl({ tag: slug, sort })` с числом, остальные —
  `PostMoreTab` (`key: slug`, `label: name`); выбранная рубрика из «Ещё» горит в пилюле;
  справа `PostFavoriteSortMenu`;
- `list` пустым при выбранной рубрике быть не может (рубрика берётся из посчитанных), отдельной
  заглушки не нужно.

**сортировка** `domains/posts/components/PostFavoriteSortMenu.tsx` — клон `TagSortMenu` на
`FAVORITE_SORT_LABELS`, ссылки `favoritesUrl({ tag, sort })`, класс `.ui-sort-pill`.

**CSS** `src/theme/layout.css`: правило `.ui-tag-bar__sort` (и `:hover`, тёмная схема, если
есть) переименовать в `.ui-sort-pill`, `TagSortMenu` — на новый класс; в оглавлении файла
добавить `.ui-sort-pill`. В `.ui-filter-bar` пилюля сортировки — справа (`margin-left: auto`
у `.ui-filter-bar .ui-sort-pill`, если не встаёт сама).

### 11. Документы
- Спека: статус «план готов, следующая фаза — реализация»; README — строка 44: статус `план`.
- `CLAUDE.md` не трогать (общих правил не добавилось), кроме случая, если реализация найдёт
  новый подводный камень.

## Проверка

1. `npx tsc --noEmit`, `npm run lint`.
2. `grep -rn "MyPostsSearch\|TagSearch\|AuthorsSearch\|PostStatusMoreTab\|filter=banned\|ui-tag-bar__sort" src` — пусто.
3. Браузер (скил `app-run`, alice — admin):
   - `/office/admin/posts?q=<часть заголовка>` и `?q=<имя автора кириллицей в другом регистре>` —
     находит; числа вкладок меняются, подзаголовок нет; смена вкладки сохраняет `q`; «×» сбрасывает.
   - `/office/admin/users`: 4 вкладки, `?role=banned` — только действующие баны; `?q=alice` и
     `?q=<кириллица>`; `?filter=banned` — «Все»; «назад» со страницы забаненного — `?role=banned`.
   - `/office/notifications`: у alice есть «Модерация», у bob (`author`) — нет, `?tab=moderation`
     у bob — «Все»; числа = непрочитанные; «Показать ещё» на вкладке не подмешивает чужие типы;
     «Прочитать все» на «Комментариях» оставляет непрочитанными посты, колокольчик и меню
     обновились; во второй вкладке браузера новое уведомление (подписка, комментарий) меняет
     числа и добавляет строку только на своей вкладке.
   - `/office/favorites`: вкладки рубрик с числами, «Ещё ▾» при >6 рубрик, `?tag=nope` —
     «Все», сортировка «По дате публикации» меняет порядок, вкладка сохраняется.
   - `/authors` и `/office/moderation/tags`, `/office/posts` — поиск работает как раньше.
4. Телефонная ширина: вкладки прокручиваются, поле поиска под вкладками.
