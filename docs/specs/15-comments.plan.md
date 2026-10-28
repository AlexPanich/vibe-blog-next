# 15. Комментарии — план

Спека: [15-comments.md](15-comments.md). Порядок: схема → домен → страница поста →
кабинет → документы → проверка.

## 1. Схема и миграция

- `comments`: `id`, `postId`, `userId`, `parentId`, `content`, `createdAt`, `editedAt`,
  `deletedAt`, `hiddenAt`, `hiddenBy`, `hideReason`; индексы `comments_post_idx`,
  `comments_user_idx`, `comments_parent_idx`; CHECK `comments_hidden_reason`: `hiddenAt IS
  NULL OR length(trim(hideReason)) > 0`.
- `comment_reactions`: `commentId`, `userId`, `value` (CHECK `IN (1, -1)`), `createdAt`,
  PK `(commentId, userId)`.
- `comment_moderations`: `id`, `commentId`, `userId`, `decision` (`COMMENT_MODERATION_DECISIONS
  = ['hidden', 'unhidden']`), `comment`, `createdAt`; CHECK `hidden` — с комментарием.
- Relations: `comments.author / post / parent / replies / reactions`. Новые таблицы —
  `CREATE TABLE`, пересборки нет; SQL всё равно просмотреть (`CLAUDE.md`). Бэкап → `migrate`
  → `touch next.config.ts`.

## 2. Домен `comments`

- `policy.ts`:
  - `moderateComments(user)` — `moderator` / `admin`;
  - `manageComment(user, c)` — свой, не скрыт, не удалён (правка и удаление);
  - `reactComment(user, c)` — чужой, не скрыт, не удалён;
  - `hideComment(user, c)` — `moderateComments` и не свой.
- `dto/commentRequests.ts`: `commentDto { content: trim, 1–2000 }`, `commentCreateDto`
  (+ `parentId` опционально), `commentHideDto { reason: trim, 1–500 }`, `commentReactDto
  { value: 1 | -1 | 0 }`.
- `dto/commentResources.ts`: `commentResource` — `id, parentId, author { id, name },
  createdAt, editedAt, state ('visible' | 'hidden' | 'deleted'), content (пусто у
  скрытого и удалённого), likes, dislikes`; `commentTreeResource` — массив (плоский, дерево
  собирает клиент); `commentViewerResource` — `myReactions: Record<id, 1 | -1>`, `hidden:
  Record<id, { content, reason }>`; `myCommentResource` для кабинета.
- `shared/loadComments.ts` (server): комментарии поста одним запросом + агрегат реакций
  (`sum(value = 1)`, `sum(value = -1)` group by), маппинг в ресурс без скрытых текстов.
- `shared/commentTree.ts` (без маркеров): `buildTree(flat)` → корни с `replies`, порядок по
  `createdAt, id`; `INDENT_LEVELS = 5`.
- `actions/commentActions.ts`:
  - `createCommentAction(postId)` — `consumeOrFail(rateLimiters.commentCreate, userId)`;
    транзакция: пост `published`, родитель (если есть) того же поста, не скрыт и не удалён
    → insert;
  - `updateCommentAction(id)` — `UPDATE … WHERE userId = me AND hiddenAt IS NULL AND
    deletedAt IS NULL` и пост `published`, `editedAt = now`; 0 строк → 409 «Комментарий уже
    изменился»;
  - `deleteCommentAction(id)` — транзакция: свой, не скрыт; есть ответы → `deletedAt`,
    `content = ''`, реакции удалить; нет → удалить с реакциями и подняться по цепочке
    удалённых родителей без ответов;
  - `reactCommentAction(id)` — upsert/delete, проверка `reactComment` и статуса поста в
    транзакции; возвращает `likes, dislikes, mine`;
  - `loadCommentViewerAction(postId)` — свои реакции; тексты своих скрытых с причиной;
    модератору — все скрытые;
  - все пишущие — `revalidatePath('/posts/[id]', 'page')`.
- `actions/commentModerationActions.ts`: `hideCommentAction(id)` (`breakIfCant(moderateComments)`,
  `UPDATE … WHERE hiddenAt IS NULL AND userId <> me AND deletedAt IS NULL` + запись в журнал;
  возвращает `content, reason` для клиента модератора), `unhideCommentAction(id)` (`WHERE
  hiddenAt IS NOT NULL` + журнал). Устаревшая страница → 409.
- `rateLimiters.commentCreate` — 10 в минуту по `userId`.

## 3. Компоненты

- `CommentsBlock` (client): принимает `postId` и `comments: commentTreeResource` (страница
  открывается только у `published`); загрузка `viewer` после гидрации — как
  `PostRatingBlock` (`useRef`-метка); форма нового комментария сверху; дерево.
- `CommentItem` (client, рекурсивный): шапка (имя → `/authors/[id]`, `LocalDate`,
  «изменён»), текст `white-space: pre-wrap`, для `depth > INDENT_LEVELS` — «→ имя
  родителя»; действия по `useUser` + policy домена: «Ответить», «Изменить», «Удалить»
  (confirm), «Скрыть» (поле причины) / «Вернуть»; скрытый: всем «Скрыт модератором»,
  автору — свой текст и «Скрыт модератором: причина», модератору — текст приглушённо.
- `CommentReactions` — 👍/👎 (`IconThumbUp` / `IconThumbDown`), активная — заливкой; гостю и
  на своём — только счётчики.
- `CommentForm` — `Textarea` + «Отправить» / «Сохранить», `FieldError`, очистка после
  успеха; используется для нового, ответа и правки.
- `exports/CommentsBlock.ts`, `exports/loadComments.ts`.
- Страница `posts/[id]`: `TmpCommentsForm` → `CommentsBlock` (загрузка — `loadComments`).
  `TmpCommentsForm` больше не используется (файл учебный — оставить, как
  `PostLinkToggle`).
- Отступ: `.ui-comment` с `--depth`, `margin-left: calc(min(var(--depth), 5) * 1.25rem)`,
  на узком экране — `min(…, 3)`.

## 4. Кабинет

`office/comments/page.tsx` — свои неудалённые комментарии к опубликованным постам, свежие
сверху: заголовок поста (ссылка на `/posts/[id]#comment-[id]`), дата, текст, у скрытого —
причина. Пункт «Мои комментарии» в группе «Кабинет» (`IconMessage`).

## 5. Документы

- `docs/lifecycles/comment.md`: состояния (видимый, изменённый, скрытый, удалён-заглушка),
  кто что может, кто что видит, журнал, связь со статусом поста.
- `post.md` — раздел «Комментарии».
- `CLAUDE.md` — только если всплывёт неочевидное.
- Спека → `done`, отклонения, `README.md`.

## 6. Проверка (`e2e/comments.cjs`)

- Гость: блок, «Войдите, чтобы комментировать», счётчик.
- `bob` на посту alice: корень; `some` отвечает; `bob` отвечает `some` — дерево 3 уровня;
  ветка в 7 уровней — отступ перестаёт расти, «→ имя»; пустой текст — ошибка поля.
- Правка своего — «изменён»; чужого — кнопок нет; ручной вызов чужой правки → 409.
- Реакции: `some` лайкает `bob`, переключает на дизлайк, снимает; на своём — только счётчик.
- Модерация: `alice` (admin) скрывает ответ `some` без причины — ошибка, с причиной — заглушка у
  гостя, в HTML страницы гостя скрытого текста нет; `some` видит свой текст и причину;
  `alice` возвращает; журнал — две записи.
- Удаление: лист — исчез; с ответами — «Комментарий удалён», ответы на месте; затем удалить
  ответ — заглушка исчезла по цепочке.
- Пост ушёл из ленты (через БД) — комментарий → 409; вернули — дерево на месте.
- Лимит: 11-й комментарий за минуту — 429.
- «Мои комментарии» у `some`: свои, скрытый с причиной, ссылка ведёт к комментарию.
- Консоль без ошибок гидрации; подчистка.
