# 22. Новые посты в ленте — план

Спека: [22-feed-live-new-posts.md](22-feed-live-new-posts.md). Порядок: дата публикации →
шина и SSE для гостей → отправка события → плашка → документы → проверка.

## 1. Дата публикации

- Миграция: `ALTER TABLE posts RENAME COLUMN announced_at TO published_at` и индекс
  `posts_status_published_idx (status, published_at)`. Писать руками, если drizzle-kit
  предложит пересборку таблицы (на `posts` ссылаются другие — `DROP` упадёт). Бэкфилл не
  нужен: 0015 заполнил колонку у `published` / `hidden` / `blocked` и у одобрявшихся.
  SQL просмотреть, бэкап → `migrate` → `touch next.config.ts`.
- Схема: `announcedAt` → `publishedAt`, комментарий — «первая публикация: ключ ленты
  „Новые“ и разовая рассылка подписчикам».
- Переименование по коду: `postNotifications.ts`, `homeBoard.ts`, `HomeScoreSheet.tsx`.
- `loadFeed.ts`: «Новые», «Старые», тай-брейкеры «Рейтинг» и «Автор», фильтр периода —
  `publishedAt` вместо `createdAt`.
- `authors/[id]/page.tsx` — последние посты автора по `publishedAt`. Кабинетные списки
  (`office/posts`, модерация, admin) остаются на `createdAt`: там и черновики.
- Дата на виду: `publishedAt` в `PostListResource` и ресурсе страницы поста;
  `PostCard` и `posts/[id]/page.tsx` выводят `publishedAt ?? createdAt`.

## 2. Шина и SSE

- `shared/liveEvents.ts`: `'post.published': { postId: number }`, список
  `LIVE_BROADCAST_EVENT_TYPES` (сейчас — только он). Адресные — остальные.
- `globals/liveBus.ts`:
  - гостевые подписчики — `Map<ip, LiveSubscriber[]>` в том же `globalThis`,
    `subscribeGuest(ip, s)` / `unsubscribeGuest(ip, s)`, `STREAMS_PER_GUEST_IP = 5`
    (шестой закрывает самый старый);
  - `broadcast(type, data, exceptUserIds)` — всем вошедшим, кроме перечисленных, и всем
    гостям; общая отправка с той же уборкой закрытых потоков, что в `publish`.
- `app/api/events/route.ts`: без пользователя — не 401, а гостевая подписка по IP из
  `getRequestIp()` (`shared/request.ts`). Обвязка потока (ping, abort, cancel) общая,
  различается только subscribe / unsubscribe.

## 3. Отправка события

- `changePostStatus`: разовая отметка публикации переезжает сюда из
  `postNotifications.ts` (`announce` → `markFirstPublished(tx, postId)` — `UPDATE … SET
  published_at = now WHERE published_at IS NULL`, вызывается при `approve`). Результат —
  флаг `firstPublished`, его получает `notifyPostTransition` вместо собственной проверки.
- После commit, рядом с `publishNotifications`: при `firstPublished` —
  `liveBus.broadcast('post.published', { postId }, [ authorId, actorId ])`. `authorId` —
  из `returning` первого UPDATE.

## 4. Клиент

- `LiveEventsProvider`: считает подписчиков широковещательных типов (`subscribe` /
  отписка меняют счётчик в state, `0 ↔ >0` — переключатель). Поток открыт, если
  `ready` и (вошёл или есть широковещательный подписчик). Ключ эффекта — `userId` и этот
  флаг: вход и выход переоткрывают поток. Гостю вешать слушатели только на
  `LIVE_BROADCAST_EVENT_TYPES` не обязательно — сервер другого не пришлёт.
- `FeedList`: проп `live` (страница `/posts` передаёт его, когда фильтр «чистый»:
  `sort === 'new'`, нет `search` / `type` / `author` / `period` / `tag`; хелпер
  `isPlainFeed(filter)` в `shared/` домена). Внутри — компонент `FeedNewPosts`, который
  подписывается на `post.published` только при `live` (иначе гость открыл бы поток зря):
  `Set` id, плашка «Новые посты (N) · Показать».
- «Показать» — та же `loadFeedAction` с `offset: 0`, но ответ **заменяет** `posts` и
  `total`, а не дописывается (второй `useAction` или флаг в ref — при реализации).
  Перезагрузка страницы не годится: `key` списка от `limit` не зависит, и новый `initial`
  с сервера состояние не сбросит. Затем `router.replace(feedUrl({ ...filter, limit:
  FEED_PAGE }), { scroll: false })`, `scrollIntoView` начала списка, `Set` очищается.
  Ошибка загрузки — плашка остаётся, кнопка повторяет.
- Плашка: `.ui-feed-fresh` в `layout.css` — `position: sticky` под шапкой, цвета из
  токенов, `aria-live="polite"`.
- `office/feed` `live` не передаёт.

## 5. Документы

- `post.md`: дата публикации (ставится при первом `approve`, не меняется при `restore`,
  `unblock` и повторном одобрении после снятия), сортировка ленты, раздел «Живой канал»
  — `post.published` всем, кроме автора и одобрившего, гостям тоже.
- `CLAUDE.md`, «Уведомления и живой канал»: широковещание, гостевой поток по IP, ленивое
  открытие у гостя.
- Спека 20, §4 «канал только у вошедшего» — пометка, что 22 это изменила.
- Спека → `done`, отклонения, `README.md`.

## 6. Проверка (скил `app-run`)

- Гость на `/posts`: в Network один `/api/events` открыт; на странице поста и на
  `/posts?sort=old` — потока нет.
- Bob отправляет пост, some одобряет → у гостя и у alice плашка «Новые посты (1)», у bob и
  some — нет. «Показать» → пост первым, «Показано 20 из M», `?limit` сброшен, прокрутка
  наверх.
- Bob архивирует и восстанавливает пост → плашки нет, пост на прежнем месте.
- Черновик, созданный раньше других, после одобрения — первый в «Новых»; дата в карточке
  — сегодняшняя.
- Фильтр (рубрика, поиск) → плашки нет. Шесть вкладок гостя → старейший поток закрыт.
- Вход и выход на открытой ленте — поток переоткрывается, адресные события (колокольчик)
  у вошедшего работают. Консоль без ошибок гидрации; `npx tsc --noEmit`, `npm run lint`.
