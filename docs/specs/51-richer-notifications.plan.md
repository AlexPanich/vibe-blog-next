# 51. Уведомления богаче: оценки, подписчики, выдержки, группировка — план

Спека — `51-richer-notifications.md` (решения 1–14 обсуждены). Одна миграция (`0030`, руками),
lifecycle — `post.md`, `user.md`, `message.md`, `comment.md`. Образцы: миграция с CHECK в
`ADD COLUMN` — `0028_ban_duration.sql`; радио-пилюли — `MessagesFromForm` (`role="radiogroup"`);
замена висящей строки — `messageNotifications.ts`.

## Решения плана (в спеке не было или уточнено)

1. **Группировка — внутри `notify` по типу, вызывающие не меняются.** В `notify.ts` карта
   `GROUP_KEYS: Partial<Record<NotificationType, 'post' | 'user'>>`: `comment.created`,
   `comment.reply`, `post.rated` — `'post'`, `user.followed` — `'user'`. Для такого типа на
   каждого получателя (после «не себе» и блокировки): найти непрочитанную строку
   `userId = r AND type = t AND readAt IS NULL` (+ `postId = target.postId` для `'post'`);
   есть — удалить её, `groupCount = old.groupCount + 1`; нет — `1`. Вставка — как сейчас, с
   `groupCount`. `commentNotifications.ts` не трогаем: группа появится сама.
   `message.created` в карте нет — у сообщений своё правило (реш. 7 спеки, шаг 4).
2. **Тот же актор, что у висящей строки группы, счёт не увеличивает** (строка всё равно
   заменяется и поднимается). Иначе оценка через 24 часа тем же человеком или два его
   комментария подряд дали бы «Аня и ещё 1». Глубже не смотрим: актор хранится только
   последний. Отклонение от «+1» спеки — дописать в конец спеки.
3. **Индекс не нужен.** Поиск группы идёт по `notifications_user_read_idx (userId, readAt)`:
   строк на получателя не больше 200, непрочитанных — единицы.
4. **Антиспам — `notifications/shared/notificationThrottle.ts`**, отдаётся через `exports/notify.ts`:
   ```ts
   // Пара актор–цель (спека 51, реш. 4): rate — раз в сутки, follow — один раз навсегда
   export function notifyThrottled(tx, type: 'post.rated' | 'user.followed', recipientId: number, target: NotifyTarget, throttle: { kind: 'rate' | 'follow', targetId: number }): number[]
   ```
   Читает `notification_throttles` по PK; `follow` — строка есть → `[]`; `rate` — `notifiedAt`
   моложе 24 ч → `[]`. Иначе `notify(...)`, и **только если он вернул id** (блокировка режет) —
   upsert `notifiedAt = now`. Константы `THROTTLE_KINDS = ['rate', 'follow']` и
   `RATE_THROTTLE_MS = 24 * 3600_000` — в том же файле / схеме.
5. **Замена строки на клиенте — по `groupKey`.** Сейчас при замене (уже у сообщений) старая
   строка остаётся в открытом колокольчике и в истории до перезагрузки. В
   `notificationItemResource` поле `groupKey: string | null` — `${type}:p${postId}`,
   `${type}:u` (followed), `message.created:d${dialogId}`, у остальных `null`. Хелпер
   `isReplacedBy(old, incoming)` в `notifications/shared/notificationGroup.ts` (без `server-only`):
   `old.groupKey !== null && old.groupKey === incoming.groupKey && (!old.read || incoming.type === 'message.created')`.
   `NotificationBell` и `NotificationList` в `notification.created` выкидывают заменённые
   перед вставкой нового.
6. **Имя актора и текст — флаг `inline`.** Сейчас `NotificationNotice` / `NotificationDigest`
   рисуют «**Имя**: текст». Новые тексты продолжают имя («Аня оценила…», «Аня и ещё 2
   подписались…»), а выдержка и безродовые формы — через двоеточие («Аня: «выдержка»», «Аня:
   оценка 5 посту «X»»). `describeNotification` возвращает `inline: boolean`; компоненты:
   `{ actor }{ inline ? ' ' : ': ' }{ text }`. `NotificationRow` (имя отдельной строкой) и тост
   (имя в заголовке) не меняются. У всех старых типов `inline = false`.
7. **Тост группы — свежее событие (реш. 14).** В ресурсе `latest: { text, inline } | null` —
   текст той же строки, посчитанный как одиночный (`groupCount = 1`); `null`, если строка и
   так одиночная. `NotificationToasts` берёт `item.latest ?? item`.
8. **Обрезка по слову — в `core/text.ts`.** `cutWords` из `domains/posts/shared/postText.ts`
   переезжает в `src/core/text.ts` (домен `notifications` не может импортировать из `posts`),
   `postText.ts` импортирует оттуда. Выдержка: `cutWords(stripMarkdown(content), 80)` —
   `stripMarkdown` уже в `core/markdown.ts`. Пустая после очистки (одна картинка) — без выдержки.
9. **Формы, которых в таблице спеки нет:**
   - `post.rated`, оценка снята (`value` нет), без рода — «новая оценка посту «X»» (`inline = false`);
     с родом — «оценил / оценила пост «X»».
   - `message.created`, непрочитанных 0 — «написал / написала вам» (inline), без рода —
     «личные сообщения» (через двоеточие).
   - `comment.created` / `comment.reply` одиночная без выдержки (скрыт, удалён, `commentId`
     null) — нынешний текст «Новый комментарий к вашему посту «X»» / «Ответ на ваш комментарий…».
   - `comment.edited` с выдержкой — «Модератор изменил ваш комментарий к посту «X»: «выдержка»».
   - Группа с родом не считается (реш. 12): «и ещё N оценили…» при любом роде.
10. **Ссылки.** `post.rated` — `postHref` (как у других постовых, без якоря). `user.followed`:
    одиночная — `/authors/<actorId>` (страница есть у каждого пользователя); **группа —
    `/office/follows?tab=followers`**: несколько человек — список, а не профиль последнего
    (уточнение спеки). `message.created` — как сейчас.
11. **Уборка удалённого комментария (реш. 8)** — в `deleteCommentNotifications` два запроса:
    `DELETE ... WHERE commentId IN (...) AND groupCount = 1` и
    `UPDATE SET groupCount = groupCount - 1, commentId = NULL WHERE commentId IN (...) AND groupCount > 1`.
    `actorId` группы остаётся — актор удалённого комментария; ушедший из середины группы
    комментарий счёт не уменьшает (строка помнит только последний `commentId`). Это следствие
    реш. 8 спеки, пересчитывать группу не будем — дописать в конец спеки.
12. **Блокировка** (`deleteSocialNotificationsBetween`) удаляет строку группы, если её актор —
    заблокированный, вместе с остальными в счёте. Простое правило, оставляем.
13. **Число сообщений** — коррелированный подзапрос в `loadNotificationRows`:
    `(SELECT count(*) FROM messages m WHERE m.dialog_id = n.dialog_id AND m.user_id <> n.user_id AND m.read_at IS NULL)`
    только для `message.created` (для остальных `CASE ... ELSE 0`). Индекс
    `messages_dialog_idx (dialogId, id)` подходит.
14. **Публикация `post.rated` после commit.** `ratePostAction` сейчас уведомлений не шлёт:
    транзакция возвращает `notificationIds`, после неё — `publishNotifications(ids)`. Так же
    в `followUserAction`.

## Шаги

### 1. Схема и миграция
- `src/database/schema.ts`:
  - `NOTIFICATION_TYPES` += `'post.rated'`, `'user.followed'`.
  - `export const USER_GENDERS = [ 'm', 'f' ] as const; export type UserGender = ...`.
  - `users` после `nameGenitive`: `gender: text('gender', { enum: USER_GENDERS })` с
    комментарием «Род для глагола в уведомлениях (спека 51), только выбор человека»; в
    `check` — `users_gender_check`: `${t.gender} IS NULL OR ${t.gender} IN ('m', 'f')`.
  - `notifications` после `role`: `groupCount: integer('group_count').notNull().default(1)`
    с комментарием про группу (реш. 6 спеки); комментарий у `dialogId` — «одна строка на
    диалог» вместо «одно непрочитанное».
  - Новая таблица `notificationThrottles` (`actor_id` → users, `kind` text enum
    `THROTTLE_KINDS`, `target_id` integer, `notified_at` timestamp), PK `(actorId, kind, targetId)`,
    `check('notification_throttles_kind', kind IN ('rate', 'follow'))`.
- `npx drizzle-kit generate --name richer_notifications`. Сгенерированный SQL **заменить**
  (пересборка `users` упадёт):
  ```sql
  /* Написано руками: ADD COLUMN вместо пересборки users (на неё ссылаются другие таблицы) */
  ALTER TABLE `users` ADD `gender` text CHECK (`gender` IS NULL OR `gender` IN ('m', 'f'));--> statement-breakpoint
  ALTER TABLE `notifications` ADD `group_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
  CREATE TABLE `notification_throttles` ( ... как сгенерировал drizzle ... );
  ```
  Проверить, что в сгенерированном нет CHECK по `type` у `notifications` (спека, п. 4) —
  тогда новые типы миграции не требуют.
- `src/database/types.ts` — тип строки throttle, если там принято.
- Прогон на копии `storage/dev.db` через `npm run db:migrate`, потом на dev. `touch next.config.ts`,
  если dev-сервер не видит новые колонки (CLAUDE.md, HMR).

### 2. Ядро уведомлений — `domains/notifications/shared/`
- `notify.ts`:
  - `SOCIAL_TYPES` += `'post.rated'`, `'user.followed'`.
  - `GROUP_KEYS` и группировка (реш. 1, 2): вынести в приватную `groupCountFor(tx, type, userId, target)`,
    которая удаляет висящую строку и возвращает счёт. Вставка — пачкой, как сейчас, с `groupCount`.
    Комментарий над `notify` дополнить.
  - `deleteCommentNotifications` — реш. 11, комментарий над блоком уборки поправить.
- `notificationThrottle.ts` — `notifyThrottled` (реш. 4).
- `notificationGroup.ts` — `groupKeyOf(row)`, `isReplacedBy` (реш. 5), без меток (нужен и серверу, и клиенту).
- `exports/notify.ts` — + `notifyThrottled`.
- `src/core/text.ts` — `cutWords` (реш. 8); `domains/posts/shared/postText.ts` импортирует его
  оттуда; `PostOgImage.tsx` — тоже из `core/text.ts`.

### 3. Показ — `loadNotifications.ts`, `notificationText.ts`, `notificationLook.ts`, ресурс
- `loadNotificationRows`: + `groupCount`, `actorId`, `actorGender: users.gender`,
  `commentContent: comments.content`, `commentDeletedAt`, `commentHiddenAt`,
  `ratingValue: postRatings.value` (`leftJoin(postRatings, and(eq(type, 'post.rated'), eq(postRatings.postId, n.postId), eq(postRatings.userId, n.actorId)))`),
  `unreadMessages` (реш. 13).
- `notificationText.ts`:
  - `DescribedRow` + новые поля; результат — `{ text, inline, href, unavailable }`.
  - Приватные хелперы: `verb(gender, [m, f])`, `excerpt(row)` (null при скрытом / удалённом /
    без `commentId`), `others(groupCount)` — «и ещё N» (`N = groupCount − 1`).
  - Ветки по таблице спеки + реш. 9, числа — `plural` из `core/plural.ts`
    («сообщение / сообщения / сообщений», «новое / новых» — `plural(n, ['новое сообщение', 'новых сообщения', 'новых сообщений'])`).
  - Экспорт `describeLatest(row)` = `describeNotification({ ...row, groupCount: 1 })` для тоста.
  - Комментарий над `describeNotification`: «Текст без рода» → род только у одиночной строки.
- `toNotificationItem`: + `inline`, `groupKey`, `latest` (реш. 7; для `message.created` — `null`).
- `dto/notificationResources.ts`: `inline: z.boolean()`, `groupKey: z.string().nullable()`,
  `latest: z.object({ text, inline }).nullable()`.
- `notificationLook.ts` (реш. 13 спеки): `post.rated` — `IconStar`, `sun`, «Оценка поста»,
  «Открыть пост»; `user.followed` — `IconUserPlus`, `mint`, «Новый подписчик», «Профиль»;
  `message.created` — заголовок «Личные сообщения».

### 4. Сообщения — `domains/messages/shared/messageNotifications.ts`
- `notifyMessage`: удалять **любую** строку `message.created` этого диалога у получателя
  (прочитанную тоже), не только `unreadOf` — реш. 7 спеки, баг из 49. Комментарий над функцией.
- `dropMessageNotification` и `readMessageNotifications` — без изменений (по-прежнему по
  непрочитанной). Число в строке пересчитывается при показе; после прочтения диалога строка
  остаётся одна, с текстом без числа.

### 5. Оценка — `domains/posts/actions/postRatingActions.ts`
- В транзакции после upsert (`value > 0`):
  `return notifyThrottled(tx, 'post.rated', post.userId, { actorId: auth.id, postId: id }, { kind: 'rate', targetId: id })`;
  при `value === 0` — `[]` (реш. 1, 3 спеки).
- После транзакции — `publishNotifications(ids)` из `@/domains/notifications/exports/notify`
  (как в `commentReportActions.ts`).

### 6. Подписка — `domains/users/actions/userFollowActions.ts`
- После `insert ... onConflictDoNothing()`: если строка вставлена (`.returning()` не пуст —
  повторный клик по уже подписанному не уведомляет), `notifyThrottled(tx, 'user.followed', id, { actorId: auth.id }, { kind: 'follow', targetId: id })`.
  Транзакция возвращает id, после неё — `publishNotifications`. Отписка — ничего (реш. 3 спеки).

### 7. Клиент
- `NotificationBell.tsx`, `NotificationList.tsx` — в `notification.created`:
  `prev.filter(i => !isReplacedBy(i, item))` перед вставкой (реш. 5).
- `NotificationNotice.tsx`, `NotificationDigest.tsx` — разделитель по `inline` (реш. 6).
- `NotificationToasts.tsx` — текст `item.latest?.text ?? item.text` (реш. 7). Новые типы
  проходят как остальные социальные, исключение — только `message.created`.

### 8. Род в профиле
- `dto/authRequests.ts`, `userBioDto`: `gender: z.enum(USER_GENDERS).nullable()`.
- `actions/userAccountActions.ts`, `updateBioAction`: писать `gender` в тот же UPDATE.
  revalidate не нужен — род нигде на страницах не показывается.
- `app/office/profile/page.tsx`: колонка `gender: true`, проп `gender={profile?.gender ?? null}`.
- `UserBioForm.tsx`: после поля родительного падежа — радиогруппа из трёх пилюль
  «оценил / оценила / не указывать» с подписью «Как писать о вас в уведомлениях»
  (`role="radiogroup"` / `role="radio"` + `aria-checked`, разметка и классы — как `MessagesFromForm`;
  если классы там не общие — завести `.ui-pills` в `layout.css` из токенов). `useForm` +
  `gender: '' | 'm' | 'f'`, в action — `data.gender || null`. Описание: «Только для
  уведомлений, нигде не показывается».

### 9. Демо-сид — `scripts/seed-demo/`
- `people.ts`: `gender?: 'm' | 'f'` в `Person`; проставить примерно у двух третей (alice, anya,
  marat, bob, nina, timur, …), у части — нет. `fill.ts` пишет `gender` (и в `values`, и в
  сброс у `seed-dev`, иначе останется старый).
- `fill.ts`, блок оценок: для свежих постов Бориса и Ани — `post.rated`: у одного поста
  одиночная непрочитанная (`groupCount: 1`), у другого — группа (`groupCount: 4`, актор —
  последний оценивший, `createdAt` — его `at`), старые — прочитанные. Для каждой записанной —
  строка `notificationThrottles` (`kind: 'rate'`, `notifiedAt = createdAt`).
- Блок подписок: Борису — по `BOB_RECENT_FOLLOWS` одна группа `user.followed` (непрочитанная,
  `groupCount` = число свежих, актор — самый свежий), одиночная прочитанная — у Ани; throttle
  `follow` на **все** пары `followRows` (иначе отписка-подписка в демо снова уведомит).
- Комментарии: сейчас по уведомлению на комментарий. Свести к правилу группы: подряд идущие
  **непрочитанные** `comment.created` / `comment.reply` одного получателя к одному посту —
  одна строка с `groupCount`, `commentId` / `actorId` / `createdAt` последнего. Самое простое —
  копить в `Map` по ключу `userId:type:postId` и вставлять после обхода дерева. Прочитанные — как
  сейчас, по одной.
- Сообщения: в `dialog()` уведомление пишется и при `unread = 0`, если последнее сообщение
  входящее для собеседника (прочитанная строка, `readAt`), — одна строка на диалог; диалог
  `konstantin → bob` сделать с 3 непрочитанными (добавить реплик Константина в конец и `unread = 3`).
- Сид — одной транзакцией, новые импорты (`USER_GENDERS`) — относительные с `.ts`
  (CLAUDE.md, «Docker и деплой»).

### 10. Lifecycle
- `post.md`, «Оценки» (стр. ~228) и «Уведомления» (~316): автору — `post.rated` о новой и
  изменённой оценке, не чаще раза в сутки на пару человек–пост, снятие молчит; число —
  текущее; группа на пост.
- `user.md`, «Подписки» (~154): `user.followed` один раз на пару навсегда, рубрики — нет, отписка
  висящее не удаляет; «Уведомления» (~185): группировка, хвост 200 считает строки; новое поле
  рода (где — профиль, «Как писать о вас в уведомлениях», нигде не показывается).
- `message.md`, «Прочитанность и уведомления» (~81): одна строка на диалог всегда, число —
  непрочитанные входящие при показе.
- `comment.md`, «Уведомления» (~121): выдержка (~80 символов, без markdown, нет у скрытых и
  удалённых, есть у `comment.edited`), группа получатель+пост, уборка при удалении (реш. 11).
- Конец спеки — отклонения: реш. 2, 10 (ссылка группы подписчиков), 11.

### 11. Проверка
- `npx tsc --noEmit`, `npm run lint`, `npm run db:seed-dev` на dev-базе.
- В браузере (скил `app-run`, отдельной сессией): bob оценивает пост anya дважды (смена
  1→5) — одна строка, число 5; второй оценивший — «и ещё 1»; anya открывает колокольчик —
  старая строка заменилась без перезагрузки; подписка-отписка-подписка — одно уведомление;
  два сообщения с прочтением между ними — одна строка «написал вам 1 сообщение»; удаление
  комментария из группы — счёт −1; профиль — выбор рода меняет глагол.
