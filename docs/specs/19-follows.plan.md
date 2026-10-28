# 19. Подписки — план

Спека: [19-follows.md](19-follows.md). Порядок: схема → подписки на авторов → на рубрики
→ лента → кабинет → документы → проверка.

## 1. Схема и миграция

- `user_follows`: `followerId`, `followingId` (→ `users`), `createdAt`; PK пары, индекс
  `user_follows_following_idx`; CHECK `user_follows_not_self`.
- `tag_follows`: `userId`, `tagId`, `createdAt`; PK пары, индекс `tag_follows_tag_idx`.
- Новые таблицы — `CREATE TABLE`; SQL просмотреть. Бэкап → `migrate` → `touch
  next.config.ts`.

## 2. Авторы — домен `users`

- `shared/userFollows.ts` (server): `followState(viewerId, authorId)` → `{ following,
  friend }`, `followersCount(authorId)`.
- `actions/userFollowActions.ts`:
  - `followUserAction(id, { follow })` — себя → 403, нет пользователя → 404; подписка —
    лимит 200 (`count` в транзакции → 409 «Не больше 200 подписок»), `onConflictDoNothing`;
    отписка — всегда. Возвращает `{ following, friend, followersCount }`;
  - `myUserFollowAction(id)` — то же состояние для кнопки после гидрации.
  - `revalidatePath` — `/authors/[id]`, `/office/follows`, `/office/feed`.
- `components/UserFollowButton` (client): `authorId`, `followersCount` с сервера.
  Показывает «Подписчиков: N» (обновляется из ответа), «Ваш друг», кнопку
  «Подписаться» / «Отписаться». Гостю — «Войдите, чтобы подписаться»; на себе — только
  счётчик. Состояние — после гидрации, `useRef`-метка, как `PostFavoriteButton`.
- `exports/UserFollowButton.ts`.
- Страница автора: `followersCount` сервером, блок в шапке профиля.
- Страница поста: автор в мета-строке (аватар, имя → `/authors/[id]`), кнопка в `.ui-actions`.

## 3. Рубрики — домен `tags`

- `actions/tagFollowActions.ts`: `followTagAction(id, { follow })` (лимит 30, нет
  рубрики → 404), `myTagFollowAction(id)`.
- `components/TagFollowButton` (client) — «Подписаться на рубрику» / «Вы подписаны».
  `exports/TagFollowButton.ts`.
- `/posts` с ровно одной выбранной рубрикой — кнопка под фильтром рубрик.
- `deleteTagAction` — удалить `tag_follows` рубрики в той же транзакции.

## 4. Лента подписок — домен `posts`

- `postFeedFilterDto` += `follow: 'authors' | 'tags' | 'both'` (необязательно). Публичная
  `/posts` его отбрасывает; `office/feed` подставляет `authors` по умолчанию.
- `feedUrl`: при `follow` — путь `/office/feed`, `?follow=` только у `tags` / `both`.
  `FeedSearch` — `action` и скрытое поле по тому же правилу (через `feedUrl` базы).
- `loadFeed(filter, offset, limit, viewerId)`: при `follow` — `userId IN (подписки)`,
  `id IN (посты с подписанными рубриками)`, у `both` — оба условия; без `viewerId` —
  пустая выборка. `loadFeedAction` в режиме `follow` берёт `getAuthUser()`.
- Опции ленты (`feedAuthors`, `tagsWithCounts`) — из `/posts/page.tsx` в
  `domains/posts/shared/feedOptions.ts`, общие для двух страниц.
- `FeedFollowTabs` — «Авторы» / «Рубрики» / «Авторы и рубрики».
- `app/office/feed/page.tsx`: те же поиск, типы, контролы, рубрики, `FeedList`.
  Подписок нет — `.ui-empty` «Вы ещё ни на кого не подписаны» со ссылками на авторов и
  ленту; подписки есть, постов нет — «Ничего не нашлось» и сброс условий.

## 5. Кабинет

- `app/office/follows/page.tsx`, вкладки `?tab=following|followers|tags` (`.ui-filter`):
  - «Подписки» — авторы (аватар, имя → страница автора, «друг»), «Отписаться»;
  - «Подписчики» — то же, «Подписаться в ответ» → строка сразу «друг»;
  - «Рубрики» — название → `/posts?tag=`, «Отписаться».
  Пустые состояния — свои у каждой вкладки. Компоненты: `UserFollowRow` (users),
  `TagFollowRow` (tags); после действия — `router.refresh()`.
- Меню «Кабинет»: «Моя лента» (`IconNews`), «Подписки» (`IconUsersGroup`).

## 6. Документы

- `user.md` — раздел «Подписки»; `post.md` — лента подписок, удаление рубрики.
- Спека → `done`, отклонения, `README.md`.

## 7. Проверка (скил `app-run`)

- Гость на странице автора — счётчик, «Войдите»; bob → alice: «Подписаться», счётчик +1;
  alice → bob — у обоих «Ваш друг»; своя страница — без кнопки.
- Кнопка на странице поста; подписка на рубрику с `/posts?tag=`.
- `office/feed`: «Авторы» — только посты подписок; «Рубрики»; «Авторы и рубрики» —
  пересечение; догрузка порций в режиме подписок; поиск сохраняет режим.
- Без подписок — пустое состояние. `/posts?follow=authors` — обычная лента.
- `office/follows`: три вкладки, «Подписаться в ответ» → «друг», «Отписаться».
- Удаление рубрики снимает подписки. Лимиты — подменой числа в БД не гонять, проверить
  ручным вызовом не нужно (правило в транзакции).
- Консоль без ошибок гидрации; подчистка.
