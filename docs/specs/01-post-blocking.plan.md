# 01. Блокировка поста модератором — план

Спека: [01-post-blocking.md](01-post-blocking.md). Порядок шагов — по зависимостям:
схема → домен → actions → UI → документы.

## 1. Схема и миграция

`src/database/schema.ts`:

- `POST_STATUSES` += `'blocked'`.
- `MODERATION_DECISIONS` += `'blocked'`, `'unblocked'`.
- CHECK `post_moderations_reject_comment` → `post_moderations_required_comment`:
  `decision NOT IN ('rejected', 'blocked') OR length(trim(coalesce(comment, ''))) > 0`.
- Комментарий над `postModerations` дополнить: в истории не только решения по очереди,
  но и блокировки.

`npx drizzle-kit generate --name post_blocking`. Ожидаемо: пересоздание
`post_moderations` с переносом данных, `posts` не трогается (у `status` нет CHECK).
Просмотреть SQL до применения, затем `npx drizzle-kit migrate`.

## 2. Переходы и policy

`domains/posts/shared/postStatuses.ts`:

- в `POST_TRANSITIONS`: `block`, `blockArchived`, `unblock` (`by: 'moderator'`) и
  `redraftBlocked` (`by: 'owner'`);
- `POST_OWNER_TRANSITIONS` += `'redraftBlocked'`;
- `POST_STATUS_LABELS.blocked = 'Заблокирован'`.

`domains/posts/policy.ts` не меняется: `transitPost` и `ownerTransitions` работают по
таблице. Проверка: `ownerTransitions` для `blocked` отдаёт только `redraftBlocked`, а
`restore` недоступен (у него `from: 'hidden'`).

## 3. DTO

`domains/posts/dto/postModerationRequests.ts`:

- `postBlockDto` — `comment` обязателен, текст ошибки «Укажите причину блокировки»;
- `postUnblockDto` — как `postApproveDto`.

`domains/posts/dto/postModerationRequests.ts` (или рядом с `postAdminFilterDto`):

- `postModerationFilterDto` — `status: z.enum(['moderating', 'published', 'hidden',
  'blocked']).catch('moderating')`. Неизвестное значение — очередь.

## 4. Actions

`domains/posts/actions/postModerationActions.ts`:

- `blockPostAction`: `findOrFail` → transition = `post.status === 'hidden' ?
  'blockArchived' : 'block'` → `breakIfCant(transitPost(…, transition))` →
  `changePostStatus` с записью `decision: 'blocked'` в той же транзакции → redirect на
  страницу модерации поста.
- `unblockPostAction`: `unblock` + запись `'unblocked'`, комментарий или `null`.

Если пост в другом статусе (`moderating`, `draft`, …), `block` отработает как
обычный устаревший переход: `changePostStatus` вернёт 409, так что отдельная проверка
статуса не нужна.

`domains/posts/actions/postStatusActions.ts`:

- `redraftBlockedPostAction = ownerTransitionAction('redraftBlocked')`.

## 5. UI

### Общие компоненты домена

- `PostStatusTag` — без изменений; стиль `.ui-status[data-status='blocked']` в
  `theme/layout.css`: `--danger` контуром (без заливки), чтобы отличался от
  `rejected`.
- `PostModerationHistory` — подписи и иконки по `decision` через map вместо тернарника:
  `approved` / `unblocked` — обычная плашка, `rejected` / `blocked` — `ui-note--danger`.
- `PostTransitionButtons` — кнопка `redraftBlocked`: «Вернуть в черновик», `IconPencil`.
- Новый `PostBlockForm` (client): textarea причины + кнопка «Заблокировать», ошибки как
  в `PostModerationForm`.
- Новый `PostUnblockForm` (client): textarea комментария + кнопка «Разблокировать».
  Если формы окажутся почти одинаковыми, свести в одну с конфигом — решить по месту.
- Новый `PostModerateLink` (client): `UserGate` + `moderatePosts(user)` → ссылка
  «Модерировать» на `/office/moderation/posts/[id]`.

### Страницы

- `app/office/moderation/posts/page.tsx`: `postModerationFilterDto.parse(searchParams)`,
  вкладки `.ui-filter`, сортировка `asc` для `moderating`, `desc` для остальных.
  Заголовок и пустое состояние — по вкладке.
- `app/office/moderation/posts/[id]/page.tsx`: блок действий по статусу (спека §5.2),
  backlink на вкладку статуса поста (`moderating` — без параметра).
- `app/office/posts/[id]/page.tsx`: `STATUS_HINTS.blocked`; плашка причины для
  `rejected` и `blocked` из `getLastModeration`, с подписью по статусу.
- `app/(public)/posts/[id]/page.tsx`: `PostModerateLink` в `.ui-meta` или `.ui-actions`.

## 6. Документы

- `docs/lifecycles/post.md`: статус `blocked` в схеме и таблице статусов, раздел
  «Заблокирован», четыре перехода, строки в «Кто что видит», блокировки в «Истории
  модерации». Убрать фразу о том, что опубликованный пост меняет только автор, если она
  есть.
- Спека: статус → `done`, отклонения от плана — дописать в спеку.

## 7. Проверка

- `npx tsc --noEmit`, `npm run lint`.
- Через скил `app-run`:
  1. `some@example.com` (moderator): вкладка «Опубликованные» → пост → заблокировать без
     причины (ошибка поля) → с причиной → пост во вкладке «Заблокированные», публично
     404, в истории «Заблокировал».
  2. `bob@example.com` (author): пост со статусом «Заблокирован», причина видна,
     есть только «Вернуть в черновик» → вернуть → черновик, редактирование открыто.
  3. Блокировка из архива: автор убирает пост в архив → модератор блокирует со
     вкладки «В архиве» → у автора нет «Восстановить».
  4. Разблокировка без комментария → `published`, пост снова в ленте.
  5. Гонка: страница модерации открыта, автор снимает пост с публикации, модератор
     жмёт «Заблокировать» → «статус уже изменился»; после обновления — 404 (черновик).
     Уход в архив гонкой не является: блокировка проходит через `blockArchived`.
  6. Ссылка «Модерировать» на публичной странице: есть у модератора, нет у автора и
     гостя.
