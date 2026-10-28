# 29. Живая страница поста, тосты, уведомления — план

Спека: [29-live-updates.md](29-live-updates.md). Порядок: выход → колокольчик и история →
тосты → темы в шине → страница поста → документы → проверка.

## 1. Выход

- `contexts/UserContext.tsx`: в значении — `setUser(user: AuthUser | null)`.
  `ClientSideInitializer` отдаёт сеттер `sessionUser`.
- `domains/users/hooks/useLogout.ts`: после `signOut()` с `success` — `setUser(null)`,
  затем `router.push('/auth/login')`.
- Пройти компоненты с меткой `loadedFor` (`PostRatingBlock`, `PostFavoriteButton`,
  `CommentsBlock`, `UserFollowButton`, `TagFollowButton` и др.): при `user === null`
  метка сбрасывается, «своё» — в начальное, чтобы повторный вход в той же вкладке
  перечитал его.
- `PostFavoriteButton` и подобные: `loading` только при `isPending`; ошибка загрузки —
  текстом.
- Проверить «гость → вход» без перезагрузки: куда ведёт `LoginForm`, обновляется ли шапка.

## 2. Колокольчик и история

- `loadNotifications`: параметр `unreadOnly` (`readAt IS NULL`). Колокольчик — с ним,
  история — без.
- `NotificationBell`: `open()` убирает строку из `items`; `notification.read` — тоже
  (по `id` или всё при `null`); `notification.created` при открытой панели — как сейчас.
  Кнопка «Отметить прочитанными» в `ui-notifications__head`, ссылка «Все уведомления» в
  подвале.
- Страница `app/office/notifications/page.tsx` + компонент списка в домене
  (`NotificationList`): первая порция с сервера, «Показать ещё» — `loadNotificationsAction`
  с `beforeId`, клик по строке — `readNotificationAction`. `NotificationRow` вынести из
  колокольчика и использовать в обоих местах.
- `OfficeMenu`: пункт «Уведомления» с бейджем — счётчик в `officeMenuResource.counts`.

## 3. Тосты

- `npm i @mantine/notifications@^9`; стили — в обоих root layout рядом со стилями core;
  `<Notifications position="bottom-right" limit={3} />` внутри `MantineProvider` в
  `ClientSideInitializer`.
- `NotificationItemResource.type`; `toNotificationItem` заполняет.
- `messageActions.ts`: `message.created` с `sender` (имя и аватар отправителя уже есть у
  action — `auth`), тип события в `liveEvents.ts`.
- Компоненты тостов — в доменах, наружу через `exports/`:
  `notifications/components/NotificationToasts.tsx` и
  `messages/components/MessageToasts.tsx`. Оба: `useUser`, `useLiveEvent`, проверка
  `document.visibilityState`. Сообщения — `usePathname() !== /office/messages/{dialogId}` и
  `message.userId !== user.id`. Уведомления — пропуск `type === 'message.created'`, клик —
  `router.push(href)` + `readNotificationAction`.
- Монтирование — в `SiteHeader` рядом с колокольчиком.

## 4. Темы в шине

- `shared/liveEvents.ts`: `post.comments.changed`, `comment.reactions`, `post.rating`,
  `LIVE_TOPIC_EVENT_TYPES`; тип темы `post:${number}`.
- `globals/liveBus.ts`: у подписчика (и гостевого) — `topics: Set<string>`;
  `publishTopic(topic, type, data)` обходит обе карты. Вызов — после commit.
- `app/api/events/route.ts`: разбор `?topics=` — `post:<канонический id>`, не больше 5,
  лишнее — 400.
- `LiveEventsProvider`: `subscribe(type, handler, topic?)`; счётчик тем в state; ключ
  эффекта — пользователь + отсортированный список тем; гостевой поток открыт и при
  наличии тем.

## 5. Страница поста

- Отправка: `commentActions.ts`, `commentModerationActions.ts` — `post.comments.changed`
  после каждого изменения; реакция — `comment.reactions` с пересчитанными счётчиками;
  `postRatingActions.ts` — `post.rating` с `average` / `count`, которые action уже
  возвращает.
- `CommentsBlock`: дерево — в state из props; на событие своей ветки (`postId`,
  `imageId`) — `loadCommentsAction` с задержкой ~300 мс, ответ заменяет список. Action —
  новый, на `loadComments`, с той же проверкой доступа к посту, что у страницы.
- `CommentReactions` / `CommentItem`: счётчики из события поверх props.
- `PostRatingBlock`: `stats` из события.

## 6. Документы

- Спека 20: п. 2, 3, 12 — пометки «изменено спекой 29».
- `CLAUDE.md`, раздел «Уведомления и живой канал»: темы, тосты.
- `docs/specs/README.md`: статус 29.

## 7. Проверка

`app-run`, два окна: alice и bob, плюс гость.

- Выход из публичной части: шапка — гостевая, на посте нет спиннеров; вход обратно.
- Колокольчик: клик убирает строку, «Отметить прочитанными» очищает, вторая вкладка
  синхронна; история показывает всё, пункт меню и бейдж.
- Тосты: уведомление о комментарии; сообщение от bob, когда alice в другом месте, в
  списке диалогов и в чужой переписке — тост; в переписке с bob — нет; один тост на
  сообщение, а не два.
- Пост открыт у alice, bob и гостя: комментарий, ответ, лайк, дизлайк, оценка от bob
  появляются у остальных; скрытие модератором (some) — текст у других пропадает.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
