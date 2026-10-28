# 18. Жалобы на комментарии — план

Спека: [18-comment-reports.md](18-comment-reports.md). Порядок: схема → домен → страница
поста → очередь → меню → документы → проверка. Уведомления (`report.created`,
`report.resolved`) — в плане спеки 20, здесь только места, куда они встанут.

## 1. Схема и миграция

- `COMMENT_REPORT_RESOLUTIONS = ['hidden', 'kept', 'deleted'] as const` в схеме.
- `comment_reports`: `id`, `commentId`, `userId`, `postId`, `createdAt`, `resolvedAt`,
  `resolvedBy` (→ `users.id`), `resolution` (enum); уникальный индекс
  `comment_reports_comment_user_uq (commentId, userId)`, индекс
  `comment_reports_open_idx (resolvedAt, createdAt)`; CHECK
  `comment_reports_resolution`: `(resolvedAt IS NULL) = (resolution IS NULL)`.
- Relations: `commentReports.comment / reporter / resolver`.
- Новая таблица — `CREATE TABLE`, пересборки нет; SQL всё равно просмотреть
  (`CLAUDE.md`). Бэкап → `migrate` → `touch next.config.ts`.

## 2. Домен `comments`

Жалобы — часть домена `comments`: очередь берёт его компоненты, раздел URL уходит в имя
файла (`commentReportActions.ts`).

- `policy.ts`:
  - `reportComment(user, comment, { postAuthorId, ancestorAuthorIds })` — чужой,
    `state === 'visible'`, и `user.id` — автор поста или среди авторов предков;
  - очередь и разбор — существующие `moderateComments` и правило «не свой» (как
    `hideComment`).
- `shared/commentAncestors.ts` (server): `ancestorAuthorIds(tx, comment)` — подъём по
  `parentId` без ограничения глубины; предки-заглушки (`deletedAt`) не считаются — своего
  текста там больше нет, скрытые считаются (next-2, 33, п. 2). Автор поста — из `posts`
  (для комментария картинки — тот же `postId`).
- `shared/commentReports.ts` (server), общие для всех мест закрытия жалоб:
  - `resolveOpenReports(tx, commentId, resolution, byUserId)` — `UPDATE … WHERE commentId
    = ? AND resolvedAt IS NULL`, возвращает id жалобщиков (для спеки 20);
  - `deleteReports(tx, commentIds)` — для удаления строк комментариев.
- `dto/commentResources.ts`:
  - `CommentViewer` += `reports: Record<number, 'sent' | 'resolved'>`;
  - `commentReportRowResource` для очереди: `commentId, postId, postTitle, imageId,
    content, state, author { id, name, avatarKey }, parent { authorName, excerpt } | null,
    reporters: { id, name }[], firstAt, lastAt`.
- `shared/loadCommentReports.ts` (server): открытые жалобы одним запросом с join на
  комментарий, автора, пост и родителя; группировка по `commentId` в JS, порядок — по
  `firstAt` asc. Обрезок родителя — 140 символов; у скрытого/удалённого родителя — без
  текста («скрыт» / «удалён»).
- `actions/commentReportActions.ts`:
  - `reportCommentAction(commentId)` — `consumeOrFail(rateLimiters.commentReport,
    userId)`; транзакция: `findCommentOrStale`, `ensurePostPublished`, `reportComment` по
    фактам из `ancestorAuthorIds` (нет права → 403, скрыт → 409); insert `ON CONFLICT DO
    NOTHING` — повтор идемпотентен, разобранная жалоба не открывается заново. Возвращает
    `'sent' | 'resolved'`;
  - `keepCommentAction(commentId)` — `breakIfCant(moderateComments)`; в транзакции: свой
    → 403, `resolveOpenReports(..., 'kept')`, 0 строк → 409 «Жалобы уже разобраны»;
  - скрытие из очереди — существующий `hideCommentAction`, без отдельного action.
- Правки существующего:
  - `hideCommentAction` — `resolveOpenReports(tx, id, 'hidden', auth.id)` в той же
    транзакции (п. 10 спеки);
  - `removeComment` — у каждой удалённой строки `deleteReports`, у заглушки
    `resolveOpenReports(..., 'deleted', null)`; цепочка родителей — тоже;
  - `deletePostImageAction` — `deleteReports(tx, commentIds)` рядом с реакциями;
  - `loadCommentViewerAction` — свои жалобы по ветке → `reports`.
- `rateLimiters.commentReport` — 30 в час по `userId`.
- `revalidatePath` после записи — `/posts/[id]`, картинка и `/office/moderation/comments`.

## 3. Страница поста

- `commentsContext` += `setReport(id, state)`.
- `CommentItem`: правило показа кнопки на клиенте — `reportComment(user, facts,
  { postAuthorId, ancestorAuthorIds })`, где предки собираются при обходе дерева:
  `CommentItem` передаёт детям накопленный набор авторов видимых и скрытых предков (без
  заглушек). `postAuthorId` — новый проп `CommentsBlock` (страница поста и картинки его
  знают).
- Кнопка — `Anchor` «Пожаловаться» в ряду действий, `dimmed`; после успеха — текст
  «Жалоба отправлена», разобранная — «Жалоба рассмотрена». Ошибка — общий вывод ошибки
  комментария.

## 4. Очередь `office/moderation/comments`

- `page.tsx` — `breakIfCant(moderateComments)`, `loadCommentReports()`, шапка «Жалобы:
  N», пусто — `.ui-empty` «Жалоб нет».
- `CommentReportRow` (client) — `.ui-row`-подобный блок без ссылки на всю строку:
  автор (аватар, имя; у `admin` — ссылка на `office/admin/users/[id]`), пост → ссылка на
  `/posts/[id]#comment-[id]` (или картинку), «ответ @имя: обрезок», текст `pre-wrap`,
  «Пожаловались: имена», `LocalDate` первой и последней жалобы. Действия: «Скрыть» —
  поле причины и `hideCommentAction`, «Оставить» — `keepCommentAction`; у своего
  комментария — «Ваш комментарий — разберёт другой модератор». После успеха строка
  уходит (`router.refresh()`).

## 5. Меню

- `officeMenuResource` += `counts: { reports?: number }`; `OfficeDesk` считает открытые
  комментарии с жалобами только для `moderateComments` — один `COUNT(DISTINCT
  commentId)` по индексу.
- Пункт «Жалобы» (`IconFlag`) в группе «Модерация», бейдж с числом, если > 0.

## 6. Документы

- `docs/lifecycles/report.md`: открыта → `hidden` / `kept` / `deleted`, кто жалуется,
  кто разбирает, повтор, связь со скрытием и удалением.
- `comment.md`: раздел «Жалобы», строки в «Кто что может».
- Спека: уточнение — предки-заглушки права не дают (п. 1). Спека → `done`, отклонения,
  `README.md`.

## 7. Проверка (`e2e/reports.cjs`, скил `app-run`)

- `bob` пишет пост-комментарий под постом `alice`; `some` отвечает `bob`; гость, третий
  пользователь — кнопки нет; `bob` (автор предка) и `alice` (автор поста) — есть; на
  своём — нет.
- Глубина: ответ на ответ на комментарий `bob` — у `bob` кнопка есть.
- `alice` жалуется дважды — одна строка в БД, «Жалоба отправлена».
- Ручной вызов `reportCommentAction` чужим пользователем — 403; на скрытый — 409.
- Очередь у `some` (moderator): одна строка, два жалобщика, «ответ bob: …».
- Свой комментарий в очереди у модератора — без кнопок, `keepCommentAction` вручную — 403.
- «Оставить» — строка ушла, комментарий на месте, у `alice` — «Жалоба рассмотрена».
- «Скрыть» из очереди с причиной — заглушка на посту, запись в `comment_moderations`,
  жалобы `hidden`; скрытие со страницы поста тоже закрывает жалобы.
- Удаление автором: лист — строки жалоб удалены; с ответами — `deleted`.
- Бейдж в меню меняется; у `bob` пункта нет; `office/moderation/comments` у `bob` — 403.
- 31-я жалоба за час — 429 (отдельный пользователь, см. спеку 15). Консоль без ошибок
  гидрации; подчистка.
