# 23. Комментарии к моим постам — план

Спека: [23-comments-on-my-posts.md](23-comments-on-my-posts.md). Порядок: выборка → ресурс и
action → строка и список → страница с вкладками → документы → проверка.

## 1. Выборка

- `domains/comments/shared/loadReceivedComments.ts` (server):
  `loadReceivedComments(userId, beforeId?, limit)` — `comments` ⨝ `posts` (`posts.userId = я`)
  ⨝ `users` (автор комментария), `comments.userId <> я`, `deletedAt IS NULL`, курсор
  `comments.id < beforeId`, порядок `id DESC` (совпадает со «свежие сверху» и стабилен для
  курсора). `countReceivedComments(userId)` — то же без курсора.
- Текст скрытого на сервере заменяется `null` — в HTML не попадает (как `commentResource`).
- Ссылка — по правилу `postHref` уведомлений: пост `published` — на страницу поста (или
  картинки) с `#comment-<id>`, иначе — `/office/posts/<id>`. «Ответить» — только при
  опубликованном посте и видимом комментарии.

## 2. Ресурс и action

- `commentResources.ts`: `receivedCommentResource` — `id`, `content` (nullable), `hidden`,
  `createdAt`, `editedAt`, `href`, `canReply`, `onImage`, `postTitle`, `author` (`name`,
  `avatarKey`).
- `commentRequests.ts`: `receivedCommentsPageDto` — `beforeId`.
- `commentActions.ts`: `loadReceivedCommentsAction` (`actionAuthClient`) — порция 20 +
  `hasMore`, чужого здесь нет по построению запроса (фильтр по `auth.id`).

## 3. UI

- `ReceivedCommentRow` (server-safe, без хуков) — аватар, имя, пост и «к фото», текст или
  заглушка «Скрыт модератором», `LocalDate relative`, «изменён», «Ответить».
- `ReceivedCommentList` (client) — начальная порция с сервера, «Показать ещё» по
  `beforeId` последней строки, ошибка — «Повторить».
- `office/comments/page.tsx` — `?tab=received`, `.ui-filter` «Мои · N» / «К моим постам ·
  M», `tabDto` с `catch`, как в `office/follows`. «Мои» — без изменений по сути, только
  под вкладкой. Заголовок страницы — «Комментарии».

## 4. Документы

- `comment.md`, «Кто что видит»: автор поста — чужие комментарии ко всем своим постам в
  кабинете, скрытые — заглушкой, удалённые — нет.
- Спека → `done`, отклонения, `README.md`.

## 5. Проверка (скил `app-run`)

- alice (у неё посты, комментарии bob) — вкладка «К моим постам»: строки bob, нет своих,
  скрытый — заглушка без текста (и без текста в HTML), удалённых нет, ссылка ведёт к
  `#comment-<id>`, «к фото» у комментария картинки.
- Больше 20 — «Показать ещё» добавляет порцию без дублей (подготовить данные SQL-ом и
  убрать после).
- Счётчики вкладок, пустое состояние у some, битый `?tab=` — «Мои».
