# 20. Уведомления — план

Спека: [20-notifications.md](20-notifications.md). Порядок: схема → домен `notifications`
→ шина и SSE → точки отправки → колокольчик → документы → проверка.

## 1. Схема и миграция

- `NOTIFICATION_TYPES` в схеме; `notifications`: `userId`, `type`, `actorId`, `postId`,
  `commentId`, `role`, `readAt`, `createdAt`; индексы `(userId, readAt)`, `(userId, id)`;
  CHECK `notifications_role` — `role` есть ровно у смены роли.
- `posts.announced_at` — `ADD COLUMN`. Бэкфилл: `announced_at = created_at` у постов с
  решением `approved` в истории — иначе старые посты разослались бы при повторной
  публикации.
- SQL просмотреть, бэкап → `migrate` → `touch next.config.ts`.

## 2. Домен `notifications`

- `shared/notify.ts` (server): `notify(tx, type, recipients, { actorId, postId, commentId,
  role })` — без себя и повторов, INSERT пачкой, хвост 200 на получателя. Возвращает id
  созданных — их публикует вызывающий после commit (`publishNotifications`).
- Уборка: `deleteCommentNotifications(tx, commentIds)`, `deleteReportNotifications(tx,
  commentId)`, `deleteSubmittedNotifications(tx, postId)`; `staffIds(tx)` — moderator и
  admin без бана.
- `shared/loadNotifications.ts`: строки получателя с актором, постом, комментарием;
  текст и ссылка считаются при показе (`notificationText.ts`).
- `actions/notificationActions.ts`: `loadNotificationsAction({ beforeId })` (20 + есть
  ли ещё), `unreadNotificationsAction`, `readNotificationAction(id)` (чужое — 404,
  повтор — идемпотентно), `readAllNotificationsAction`. Чтение публикует
  `notification.read`.
- `exports/` — `notify`, уборка, `publishNotifications`, `countUnread`, `NotificationBell`.

## 3. Шина и SSE

- `globals/liveBus.ts`: подписчики по `userId` в `globalThis`, `publish`, `subscribe`
  (не больше 5 — старший закрывается), `closeUser`. Ошибка отправки снимает подписчика.
- `shared/liveEvents.ts`: типы событий (`notification.created`, `notification.read`).
- `app/api/events/route.ts`: 401 без сессии, `text/event-stream`, `: ping` каждые 25 с,
  отписка по `request.signal`.
- Клиент: `LiveEventsProvider` внутри `ClientSideInitializer` (только у вошедшего), hook
  `useLiveEvent(type, handler)` и событие `open`.

## 4. Точки отправки

- comments: создание (`comment.created` / `comment.reply`), скрытие и возврат, жалоба
  (`report.created` при первой открытой), разбор (`report.resolved`, уборка
  `report.created`), удаление комментария и картинки — уборка.
- posts: `submit` → staff; approve / reject / block / unblock → автору; первое одобрение →
  `post.published` подписчикам автора и рубрик; уход из `moderating` — уборка
  `post.submitted` (в `changePostStatus`).
- users: роли, разбан, удаление аватара; бан закрывает потоки.

## 5. UI

- `NotificationBell` в `SiteHeader` рядом с `UserBox`: `Indicator` с числом (`99+`),
  popover — 20 строк, «Показать ещё», «Прочитать все». Строка — аватар, имя, текст,
  `LocalDate` относительно. В кабинете начальный счётчик — из layout.
- `LocalDate` получает режим `relative`.

## 6. Документы

- Lifecycle: раздел «Уведомления» в `post.md`, `comment.md`, `report.md`, `user.md`.
- Спека → `done`, отклонения, `README.md`.

## 7. Проверка (скил `app-run`)

- bob комментирует пост alice → у alice счётчик растёт без перезагрузки; ответ alice →
  bob получает `comment.reply`; клик — прочитано, переход к комментарию.
- Отправка на модерацию → some и alice (кроме автора); одобрение → автору, подписчикам
  `post.published` один раз; уборка `post.submitted`.
- Жалоба → staff; «Оставить» → жалобщику, `report.created` исчез у всех.
- Роли, разбан, аватар. «Прочитать все» синхронизирует вторую вкладку. Чужой id → 404.
- Консоль без ошибок гидрации; подчистка.
