# 40. Избранное в профиле — план

Спека — `40-public-favorites.md` (решения 1–5 подтверждены). Одна миграция (`0022`), lifecycle
`post.md` («Избранное») и `user.md` («Публичная страница») — правки.

## Решения плана (в спеке не было или уточнено)

1. **Вкладка — `?tab=favorites` на той же странице**, как типы через `?type=`. С `tab=favorites`
   параметр `type` игнорируется. Любое другое значение `tab` — обычные посты. Полный список —
   `/authors/<id>/favorites` (спека, п. 2).
2. **Публичные страницы сессию на сервере не читают** (`user.md`, блокировка), поэтому сервер не
   знает, что смотрит владелец. Отсюда:
   - при включённой настройке вкладку рендерит сервер — всем одинаково, владельцу тоже;
   - при выключенной сервер вкладку не рендерит и `?tab=favorites` показывает обычные посты, а
     `/authors/<id>/favorites` отдаёт 404 — всем, владельцу тоже;
   - владелец при выключенной настройке видит вкладку, которую дорисовывает клиент после
     гидрации: «Избранное» + пометка «видно только вам». Она ведёт на `office/favorites` — там его
     полный список уже есть. Числа на ней нет: клиент его не знает, а грузить ради бейджа — лишний
     запрос.
   - Ссылка на настройку (спека, п. 5) — в подзаголовке `office/favorites`: «видите только вы ·
     Показать в профиле» / «видно всем на вашей странице · Настроить» → `/office/profile#favorites`.
3. **Ряд вкладок.** Сейчас `AuthorPostTabs` прячет ряд, если кроме «Посты · N» вкладок нет. Теперь
   ряд есть, если есть вкладка типа, или открыт не «все посты», или есть публичная вкладка
   избранного, или (на клиенте) смотрит владелец с закрытым избранным. Последнее условие знает
   только клиент, поэтому `<nav>` рисует клиентский `AuthorTabsNav`: серверные ссылки приходят в
   `children`, флаг `visible` считает сервер. До гидрации `visible` решает сам — HTML сервера и
   первый рендер совпадают (скил `hydration`: `useUser().ready`).
4. **Пустое избранное при включённой настройке** — вкладки нет (спека, п. 2), а `?tab=favorites` и
   `/authors/<id>/favorites` ведут себя как при выключенной настройке (посты / 404).
5. **Блокировка** — вкладка и её содержимое уже внутри `UserBlockGate`. Страница
   `/authors/<id>/favorites` оборачивается в `UserBlockProvider` + `UserBlockGate` так же.
6. **Баннер, счётчики, «О себе»** на вкладке избранного — те же, что у постов: шапка
   `AuthorHead` общая, меняется только содержимое под вкладками.
7. **Настройка** — две карточки-радио, как «Кто может мне писать» (`.ui-account-options`),
   сохраняется сразу по выбору: «Только мне» / «Всем на моей странице». Секция профиля
   «Избранное», якорь `id="favorites"`.
8. **Где код.** Колонка — у `users`, но фича про избранное: action, загрузка и компоненты — в
   домене `posts` (там уже `postFavoriteActions.ts`, `loadFavorites`, `PostFavoriteGrid`). Форма
   настройки — `domains/posts/components/PostFavoritesPublicForm.tsx`, страница профиля
   (`app/`) импортирует её напрямую.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`, `users`, после `messagesFriendsOnly`:
  ```ts
  // Избранное видно всем на странице автора (спека 40); better-auth колонку не знает, пишет updateFavoritesPublicAction
  favoritesPublic: integer('favorites_public', { mode: 'boolean' }).notNull().default(false),
  ```
- `npx drizzle-kit generate --name favorites_public` → `drizzle/0022_favorites_public.sql`.
  Прочитать SQL: должен быть один `ALTER TABLE \`users\` ADD \`favorites_public\` integer DEFAULT false NOT NULL;`.
  Если генератор пересобирает `users` (`__new_users`) — заменить на этот `ADD COLUMN` руками
  (CLAUDE.md: на `users` ссылаются, `DROP` упадёт).
- Бэкап `cp storage/dev.db storage/dev.db.bak-40`, `npm run db:migrate`, проверить колонку через
  MCP `sql-dev` (`schema`), затем `touch next.config.ts`.

### 2. Загрузка — `domains/posts/shared/loadFavorites.ts`
- `loadFavorites(userId, limit?: number)` — `limit` в запрос `marks` (`.limit(limit)` только если
  задан). Порядок и фильтр `published` — как есть.
- `countFavorites(userId)` — `count()` с тем же `innerJoin` на опубликованные. Экспорт под
  `loadFavorites`. Настройку страница берёт из `getAuthor` (шаг 3), отдельный loader не нужен.

### 3. Автор — `domains/users/shared/getAuthor.ts`
- В `columns` добавить `favoritesPublic: true`. Это `users`-домен, но `app/` может импортировать
  что угодно; страница сама решает, что делать с флагом.

### 4. dto и action
- `domains/posts/dto/postRequests.ts` (рядом с прочими dto избранного, если их нет — в конец):
  `export const postFavoritesPublicDto = z.object({ favoritesPublic: z.boolean() })`.
- `domains/posts/actions/postFavoriteActions.ts`:
  ```ts
  export const updateFavoritesPublicAction = actionAuthClient
    .inputSchema(postFavoritesPublicDto)
    .action(async ({ parsedInput: { favoritesPublic }, ctx: { auth } }) => {
      db.update(users).set({ favoritesPublic }).where(eq(users.id, auth.id)).run();
      revalidatePath('/office/profile');
      revalidatePath('/office/favorites');
      revalidatePath('/authors/[id]', 'layout');

      return { favoritesPublic };
    });
  ```
  `'layout'` — чтобы задеть и `/authors/[id]/favorites`.

### 5. Форма настройки — `domains/posts/components/PostFavoritesPublicForm.tsx`
- Копия устройства `MessagesFriendsOnlyForm` (`'use client'`, `client-only`, `useAction`, радио
  `.ui-account-option`, оптимистичный `checked` по `action.input`).
- Варианты: `{ value: false, label: 'Только мне', text: 'Закладки видите только вы' }`,
  `{ value: true, label: 'Всем', text: 'Вкладка «Избранное» на вашей странице автора' }`.
- Пометка под карточками (`.ui-account-note`): «Видны только опубликованные посты.»
- `app/office/profile/page.tsx`: `favoritesPublic: true` в `columns`; новая секция после «Личных
  сообщений»:
  `<ProfileSection id="favorites" title="Избранное" hint="Кто видит ваши закладки" mobileTitle="Кто видит избранное">`.
  Если `ProfileSection` не принимает `id` — добавить проп и повесить на корневой элемент секции.
  Подзаголовок `OfficeHead` — «Как вас видят читатели, кто может вам писать и видеть избранное»
  или оставить; на усмотрение по длине строки на телефоне.

### 6. Вкладки — `domains/posts/components/AuthorPostTabs.tsx` + `AuthorTabsNav.tsx`
- Пропы `AuthorPostTabs`: `authorId`, `counts`, `active: PostType | 'favorites' | undefined`,
  `favorites: number | null` — число опубликованных в избранном при включённой настройке, иначе
  `null`.
- Ссылки: «Посты · N», типы (как есть), затем при `favorites` > 0 —
  `<Link href={`/authors/${authorId}?tab=favorites`} …>Избранное · { favorites }</Link>`.
- `visible = tabs.length > 0 || active !== undefined || (favorites ?? 0) > 0`.
- Вместо `<nav>` — `<AuthorTabsNav authorId={authorId} visible={visible} ownFavorites={favorites === null || favorites === 0}>{ ссылки }</AuthorTabsNav>`.
- `AuthorTabsNav.tsx` (`'use client'`, `client-only`):
  - `const { user, ready } = useUser(); const owner = ready && user?.id === authorId && ownFavorites;`
  - `if(!visible && !owner) return null;`
  - `<nav className="ui-author-tabs" aria-label="Посты автора">{ children }{ owner && <Link href="/office/favorites" className="ui-author-tabs__own">Избранное <small>видно только вам</small></Link> }</nav>`.
  - `ownFavorites` при пустом публичном избранном тоже `true`: владельцу полезно увидеть, где оно.
- Комментарий `AuthorPostTabs` дописать: вкладка избранного (спека 40), владелец — через
  `AuthorTabsNav`.
- CSS (`theme/layout.css`, рядом с `.ui-author-tabs`): `.ui-author-tabs__own small { margin-left: 0.5rem; font-size: 0.75rem; font-weight: 500; color: var(--ink-faint); }`.
  Сверить с вкладкой в макете Pencil (спека 30, шаг 6) — если там другой вид пометки, взять его.

### 7. Страница автора — `app/(public)/authors/[id]/page.tsx`
- Разбор: `const query = await searchParams; const favoritesTab = query.tab === 'favorites';`.
- В `Promise.all` — `author.favoritesPublic ? countFavorites(author.id) : null`.
- `const showFavorites = favoritesTab && (favoritesCount ?? 0) > 0` (решения 1, 4); `type`
  при `showFavorites` — `undefined`.
- Карточки: при `showFavorites` — `loadFavorites(author.id, LATEST)` и
  `cards = list.map(item => item.post)` (уже с `withCardData` и `tags`); иначе — текущий
  `latest`. Запрос `latest` при `showFavorites` не делать (условный элемент в `Promise.all` или
  отдельная ветка после — что читается проще).
- `<AuthorPostTabs … active={showFavorites ? 'favorites' : type} favorites={favoritesCount} />`.
- Пусто — не бывает (вкладки нет без опубликованных). «Ещё»: при `showFavorites` и
  `favoritesCount > LATEST` — `ButtonLink href={`/authors/${author.id}/favorites`}` «Всё
  избранное»; RSS-ссылка остаётся (она про посты автора, вкладки не касается).

### 8. Полный список — `app/(public)/authors/[id]/favorites/page.tsx`
- `export const dynamic = 'force-dynamic'` (params без searchParams — иначе Next закэширует).
- `getAuthor(idOrFail(...))`; `if(!author.favoritesPublic) notFound();`
  `const list = await loadFavorites(author.id); if(list.length === 0) notFound();`
- `generateMetadata`: `title: \`Избранное · ${author.name}\``, `robots: { index: false }` не нужен.
- Разметка: `.ui-backlink` → `/authors/<id>` «{ author.name }», `.ui-section-head` > `h1.ui-title`
  «Избранное», `.ui-kicker` — имя. Внутри `UserBlockProvider` + `UserBlockGate` (решение 5);
  сетка — `ui-post-grid ui-author-posts` с `PostCardBridge`, как на странице автора. Без «Добавлен …»
  и «Убрать» — это не `PostFavoriteGrid`, а чужой список.
- Лимит — нет. Если демо/реальность покажет больше ~100 — отдельная задача на пагинацию; в
  «Открытые вопросы» спеки не писать, это не решение пользователя.

### 9. `office/favorites` — `app/office/favorites/page.tsx`
- Читать `favoritesPublic` у текущего пользователя (`db.query.users.findFirst`, одна колонка).
- `sub` у `OfficeHead` (решение 2): при закрытом — «N отложенных постов — видите только вы ·
  Показать в профиле», при открытом — «… — видно всем на вашей странице · Настроить». Ссылки —
  `Link` на `/office/profile#favorites`. Если `sub` принимает только строку — передать ReactNode
  (проверить тип пропа, расширить до `React.ReactNode` при необходимости). Для открытого добавить и
  ссылку на `/authors/<id>?tab=favorites` («вашей странице»).
- `EmptyState` при пустом списке — без изменений.

### 10. Демо — `scripts/seed-demo/`
- `types.ts`: `SeedPerson.favoritesPublic?: boolean`.
- `fill.ts`: в `values` пользователей — `favoritesPublic: person.favoritesPublic ?? false`.
- `people.ts`: `favoritesPublic: true` у `dan` (у него гарантированные закладки) и у одного-двух
  авторов, у которых `fans` даёт закладки. Проверить через `sql-dev` после `npm run db:seed-dev`,
  что хотя бы у одного публичного больше 12 опубликованных закладок — иначе «Всё избранное» не
  проверить; при нехватке добавить `dan` закладок в явный список рядом со строкой 131.

### 11. Документы
- `docs/lifecycles/post.md`, «Избранное»: «закладка личная» → по умолчанию личная; владелец может
  открыть всё избранное разом (`office/profile`, `users.favorites_public`) — тогда на странице
  автора вкладка «Избранное · N» (опубликованные, новые сверху, 12 + `/authors/<id>/favorites`).
  Публичного счётчика на посте по-прежнему нет. Закрыто или пусто — вкладки нет, полная страница
  — 404; владелец видит вкладку «видно только вам» со ссылкой в кабинет.
- `docs/lifecycles/user.md`, «Публичная страница»: дописать вкладку избранного и ссылку на раздел
  `post.md`.
- `docs/specs/40-public-favorites.md`: статус — «реализовано, следующая фаза — проверка»;
  отклонения от плана, если были, — в конец.
- `docs/specs/30-redesign.md`, «Не сделано», строка про вкладку «Избранное» — дописать «→ сделано в
  40» после реализации.
- `docs/specs/README.md`: строка 40 — статус по итогам реализации.

### 12. Проверки
- `npx tsc --noEmit`, `npm run lint`.
- Ручная проверка (фаза 4, скил `app-run`):
  1. Гость на странице `dan` до включения: вкладки нет; `?tab=favorites` — посты;
     `/authors/<dan>/favorites` — 404.
  2. `dan` (вошёл): на своей странице — вкладка «Избранное · видно только вам» → `office/favorites`;
     подзаголовок там — «видите только вы · Показать в профиле» → секция профиля по якорю.
  3. Включить «Всем» — сохраняется без перезагрузки, после перезагрузки выбрано. У гостя —
     «Избранное · N», порядок как в `office/favorites`, только опубликованные; при N > 12 — «Всё
     избранное» с полным списком.
  4. Снять пост с публикации (модератор блокирует пост из избранного) — пропал из вкладки и
     счётчика; вернуть — снова есть.
  5. Убрать все закладки при включённой настройке — вкладки нет, полная страница — 404.
  6. Тот, кто заблокировал `dan`, — на странице и на `/favorites` только заглушка блокировки.
  7. Автор без типов постов и с закрытым избранным: у гостя ряда вкладок нет, у владельца — ряд из
     «Посты · N» и «Избранное · видно только вам». В консоли нет hydration-ошибок.
  8. Телефон (390px): ряд вкладок скроллится, пометка не ломает строку; секция профиля.
- Напомнить про `/clear` перед реализацией.
