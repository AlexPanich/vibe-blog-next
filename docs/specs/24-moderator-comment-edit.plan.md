# 24. Правка чужого комментария модератором — план

Спека: [24-moderator-comment-edit.md](24-moderator-comment-edit.md). Порядок: схема →
action → журнал при удалении → UI → документы → проверка.

## 1. Схема и миграция

- `comments.edited_by` (→ `users`, nullable) — `ADD COLUMN`.
- `COMMENT_MODERATION_DECISIONS` += `edited`, `NOTIFICATION_TYPES` += `comment.edited` —
  только код, CHECK в БД нет.
- `drizzle-kit generate`, SQL просмотреть, бэкап → `migrate`.

## 2. Правка

- policy: `editComment(user, facts)` — видимый и (свой или `moderateComments`). `manageComment`
  остаётся для удаления.
- `updateCommentAction`: свой — как сейчас, `editedBy = null`; чужой — `moderateComments`,
  иначе 403; UPDATE с `hiddenAt IS NULL AND deletedAt IS NULL` (409), `editedBy = auth.id`,
  запись `edited` с прежним текстом, `notify('comment.edited', [ автор ])` после commit.
  Текст не изменился — ничего не пишем (ни журнал, ни уведомление).
- `notificationText.ts`: «Модератор изменил ваш комментарий к посту …».

## 3. Удаление

- `removeComment`: `UPDATE comment_moderations SET comment = NULL WHERE comment_id = ? AND
  decision = 'edited'` — и для заглушки, и для строки. Цепочка заглушек-родителей уже без
  текста — их записи стёрты, когда они стали заглушками.
- `deletePostImageAction`: то же для ветки картинки.

## 4. UI

- `commentResource.editedByModerator`, в `loadComments` — `editedBy IS NOT NULL`.
- `CommentItem`: «Изменить» по `editComment`, «Удалить» по `manageComment`; метка
  «изменён модератором».

## 5. Документы

- `comment.md`: схема состояний, «Кто что может», «Уведомления», «Журнал».
- Спека → `done`, отклонения, `README.md`.

## 6. Проверка (скил `app-run`)

- some правит комментарий bob → метка «изменён модератором» (и у гостя), у bob уведомление,
  журнал `edited` с прежним текстом; bob правит снова → «изменён».
- some у скрытого — нет «Изменить»; у своего — «Изменить» и «Удалить»; bob у чужого — нет.
- bob удаляет комментарий → `comment` в записи `edited` = NULL, строка журнала осталась.
- 409: правка скрытого из устаревшей формы.
