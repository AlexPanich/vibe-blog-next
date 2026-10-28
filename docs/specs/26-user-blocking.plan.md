# 26. Блокировка пользователя — план

Спека: [26-user-blocking.md](26-user-blocking.md). Порядок: схема → домен users (helpers,
actions) → точки запрета → скрытие на клиенте → вкладка → документы → проверка.

## 1. Схема

- `user_blocks` (`user_id`, `blocked_id` → `users`, `created_at`), PK пары, индекс
  `blocked_id`, CHECK `user_id <> blocked_id`. Новая таблица — `drizzle-kit generate`.

## 2. Домен `users`

- `shared/userBlocks.ts` (server): `USER_BLOCKS_LIMIT = 500`; `isBlockedBetween(tx, a, b)`;
  `blockedAmong(tx, userId, ids)` — кто из `ids` связан блокировкой с `userId` (в любую
  сторону); `blockedWith(userId)` — подзапрос id для `notInArray`; `blockState(me, other)` —
  `{ blocking, blockedBy }`.
- `actions/userBlockActions.ts`: `blockUserAction(id, { block })` — себя, staff — 403, нет
  пользователя — 404, лимит — 409; в транзакции: строка, снятие подписок в обе стороны,
  удаление социальных уведомлений между ними. Разблокировка — удаление своей строки.
  `myUserBlockAction(id)` — состояние для страницы автора.
- `exports/userBlocks.ts` — helpers для comments, messages, notifications, posts.

## 3. Запреты

- `followUserAction` — 403 при блокировке; `followState` += `blocked`.
- `writeBlockReason` (messages) — «Переписка недоступна: блокировка».
- `createCommentAction` — блокировка с автором поста или родителя — 403;
  `reactCommentAction` — с автором комментария — 403.
- `notify` — для социальных типов отбрасывает получателей, связанных блокировкой с
  `actorId`.

## 4. Клиент

- `CommentViewer` += `blocking` (я заблокировал) и `blockedWith` (в любую сторону) —
  id авторов ветки и автора поста. `CommentItem`: заглушка у `blocking`, без «Ответить» и
  реакций у `blockedWith`; `CommentsBlock`: вместо формы — пояснение, если автор поста в
  `blockedWith`.
- Страница автора: `UserBlockProvider` (одно состояние на страницу), `UserBlockGate`
  прячет части страницы у блокирующего, `UserBlockButton` с подтверждением. Подписка и
  кнопки сообщений при блокировке не рисуются (их состояние уже говорит «нельзя»).
- «Моя лента»: `notInArray(posts.userId, blockedWith(viewer))`.

## 5. Вкладка

- `office/follows?tab=blocked` — строки с «Разблокировать» (`UserBlockRow`).

## 6. Документы

- `user.md` — раздел «Блокировка»; `comment.md`, `message.md`, `post.md` («Моя лента»).
- Спека → `done`, README.

## 7. Проверка (скил `app-run`)

- bob блокирует alice? Нельзя — alice admin: нет кнопки, action 403. bob блокирует
  some? some — moderator, тоже нет. Нужен третий автор — завести тестового пользователя
  SQL-ом (`carol`), убрать после.
- carol блокирует bob: подтверждение, подписки сняты, страница bob у carol — заглушка; у
  bob страница carol — пометка, «Заблокировать в ответ», нет подписки и сообщений.
- Комментарии: у carol комментарии bob — заглушка; bob не может ответить carol и
  прокомментировать её пост; action — 403.
- Уведомления: bob комментирует пост alice в ветке carol — ответ carol bob не уведомляет.
- Вкладка «Заблокированные», «Разблокировать». Лимит не проверяется вручную.
