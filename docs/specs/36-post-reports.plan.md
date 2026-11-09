# 36. Жалобы на посты — план

Спека — `36-post-reports.md` (решения 1–9 обсуждены). Одна миграция (`0025`, новая таблица —
`drizzle-kit generate` годится), lifecycle `report.md` и `post.md` — правки. Образец всего —
жалобы на комментарии (спека 18): `commentReportActions.ts`, `shared/commentReports.ts`,
`shared/loadCommentReports.ts`, `CommentReportCard.tsx`, страница
`app/office/moderation/comments/page.tsx`.

Порядок: макет → схема → домен `posts` (жалоба, разбор, побочные эффекты переходов) →
уведомления → страница поста → переезд очереди комментариев → очередь постов → меню →
демо → документы → проверка.

## Решения плана (в спеке не было или уточнено)

1. **Побочные эффекты переходов — в `changePostStatus`, а не в actions.** Спека требует, чтобы
   блокировка «любым путём» и уход в черновик закрывали жалобы. Все переходы идут через
   `changePostStatus` (`postStatuses.ts` — единственная таблица), поэтому там же, в транзакции
   после `also`, вызывается `settlePostReports(tx, postId, transition, actorId)`:
   - `block`, `blockArchived` → открытые жалобы `blocked` (закрыл — `actorId`), жалобщикам
     `post_report.resolved`, задачи `post_report.created` по посту удаляются;
   - `unpublish`, `redraftArchived` → `withdrawn` (`resolvedBy = null`), задачи удаляются,
     уведомлений нет;
   - остальные переходы — ничего (`archive`, `restore`, `unblock` жалоб не трогают).
   Ids уведомлений складываются с `notifyPostTransition` и публикуются после commit, как сейчас.
2. **Блокировка из очереди — свой action `blockReportedPostAction`, не `blockPostAction`.**
   `blockPostAction` делает `redirect` на страницу модерации и не знает про «свой пост» и
   «жалобы уже разобраны». Новый action в `postReportActions.ts`: тот же `postBlockDto`, та же
   запись в `post_moderations` (вынести вставку в `shared/postBlocking.ts` →
   `insertBlockModeration(tx, postId, userId, comment)`, её зовут оба action), переход по
   статусу (`hidden` → `blockArchived`, иначе `block`). В `also` — проверка «есть открытые
   жалобы», иначе 409 «Жалобы уже разобраны» (транзакция откатывается вместе с переходом).
   Жалобы закрывает уже `settlePostReports` (реш. 1). Возвращает `{ done: true }`, карточка
   делает `router.refresh()`.
3. **`withdrawn` для жалобщика — «Жалоба рассмотрена»**, повторно не жалуется (буква п. 3
   спеки: пара пост–пользователь уникальна). Пост, вернувшийся в ленту через ревью, —
   уже проверенный модератором текст.
4. **Ссылка на пост в карточке** — заголовок ведёт на `office/moderation/posts/[id]` (там
   история решений и статус), у `published` рядом «Открыть на сайте» → `/posts/[id]`.
   Модератор видит любой пост, кроме `draft`, — а в очереди `draft` не бывает: уход в
   черновик закрывает жалобы.
5. **Переключатель «Посты / Комментарии» — в каждой page, не в `layout.tsx`.** У раздела нет
   своей проверки доступа (`CLAUDE.md`), а числа в layout показались бы и без права.
   Компонент один на два домена → корень: `components/office/ReportKindTabs.tsx`
   (props: `active`, `counts: { posts, comments }`), числа считает page.
6. **Активный пункт меню на обоих подразделах.** Пункт «Жалобы» ведёт на
   `/office/moderation/reports/posts`, а `activeMenuItem` сравнивает по `href` — на
   `reports/comments` ничего бы не горело. В `OfficeMenuItem` — необязательное поле
   `match?: Route` (префикс активности; по умолчанию `href`), у «Жалоб» —
   `/office/moderation/reports`. `activeMenuItem` сравнивает `item.match ?? item.href`.
7. **Итог в `post_report.resolved` не хранится** — считается при показе: `loadNotifications`
   делает left join `post_reports` по `(postId, userId = получатель)` — пара уникальна, итог
   один. `DescribedRow` += `postReportResolution`.
8. **Коды причин** — `POST_REPORT_REASONS = ['spam', 'abuse', 'copyright', 'misleading',
   'other']`, подписи — `domains/posts/shared/postReportReasons.ts` (без `server-only`: нужны
   и диалогу, и карточке).
9. **Удаления поста в коде нет** (п. 9 спеки условный). Строки `post_reports` удаляются только
   в `scripts/seed-dev.ts` при очистке — добавить таблицу в список.
10. **Состояние кнопки грузится тем же запросом, что избранное.** `myPostFavoriteAction`
    заменяется на `loadPostViewerAction` → `{ favorite: boolean, report: 'none' | 'sent' |
    'resolved' }` — один запрос после гидрации (п. 8 спеки).

## Шаги

### 0. Макет (Pencil)

Документ — из спеки 42 (`~/.pencil/documents/36c8a4fe-…/untitled.pen`), через MCP `pencil`.
Дорисовать: кнопку «Пожаловаться» в ряду под текстом поста (вторичная, рядом с «Поделиться»;
состояния «Жалоба отправлена» / «Жалоба рассмотрена» — неактивные), пункт в меню «…»
мобильной панели, диалог жалобы, переключатель «Посты / Комментарии» над вкладками очереди и
карточку `PostReportCard` (открытая и рассмотренная). Реализация — по макету; если MCP
недоступен — по образцу `CommentReportCard` и сказать об этом человеку.

### 1. Схема и миграция

- `src/database/schema.ts`, рядом с `COMMENT_REPORT_RESOLUTIONS`:
  ```ts
  // Причина жалобы на пост (спека 36); для other комментарий обязателен — в zod
  export const POST_REPORT_REASONS = ['spam', 'abuse', 'copyright', 'misleading', 'other'] as const;

  export type PostReportReason = (typeof POST_REPORT_REASONS)[number];

  // withdrawn — автор увёл пост в черновик, закрывшего нет
  export const POST_REPORT_RESOLUTIONS = ['blocked', 'kept', 'withdrawn'] as const;

  export type PostReportResolution = (typeof POST_REPORT_RESOLUTIONS)[number];
  ```
- Таблица `postReports` (`post_reports`) после `commentReports`: `id`, `postId` → `posts.id`,
  `userId` → `users.id`, `reason` (enum, not null), `comment` (text, null), `createdAt`,
  `resolvedAt`, `resolvedBy` → `users.id` (null у `withdrawn`), `resolution` (enum).
  Индексы: `post_reports_post_user_uq (postId, userId)` unique, `post_reports_open_idx
  (resolvedAt, createdAt)`. CHECK `post_reports_resolution`: `(resolved_at IS NULL) =
  (resolution IS NULL)`. Комментарий к таблице — как у `commentReports`.
- Relations `postReports.post / reporter / resolver` (`relationName: 'postReporter'`,
  `'postReportResolver'`) и обратные поля в `usersRelations`, если там перечислены
  `commentReporter` / `commentReportResolver`.
- `NOTIFICATION_TYPES` += `'post_report.created', 'post_report.resolved'` (после
  `report.*`). CHECK в `notifications` типы не перечисляет — проверить в сгенерированном SQL,
  что пересборки `notifications` нет.
- `src/database/types.ts` += `PostReport`.
- `npx drizzle-kit generate --name post_reports` → прочитать SQL (только `CREATE TABLE` и
  индексы) → бэкап `storage/dev.db` → прогон на копии (`npm run db:migrate` с копией) →
  `npx drizzle-kit migrate` → `touch next.config.ts`.

### 2. Домен `posts`: policy, dto, общие функции

- `policy.ts`:
  ```ts
  /*
    Пожаловаться на пост (спека 36): любой вошедший, кроме автора, на опубликованный.
    Блокировка пользователей (спека 26) не мешает — это сигнал модератору, не автору
  */
  export function reportPost(user: AuthUser, post: Pick<Post, 'userId' | 'status'>){
    return post.status === 'published' && post.userId !== user.id;
  }
  ```
  Разбор — `moderatePosts` + «не свой» в action (как у комментариев). Re-export в
  `exports/postPolicy.ts` не нужен — внешних потребителей нет.
- `shared/postReportReasons.ts` — `POST_REPORT_REASON_LABELS: Record<PostReportReason,
  string>` (тексты спеки, п. 2) и `POST_REPORT_RESOLUTION_LABELS` («Пост заблокирован»,
  «Пост оставлен», «Автор снял пост в черновик»).
- `dto/postReportRequests.ts`:
  - `POST_REPORT_COMMENT_MAX = 500`;
  - `postReportDto` — `reason: z.enum(POST_REPORT_REASONS)`, `comment: z.string().trim()
    .max(500)` → пустая строка в `null`; `superRefine`: `other` без комментария — ошибка на
    поле `comment` «Опишите, что не так»;
  - `POST_REPORT_TABS = ['open', 'resolved']`, `postReportFilterDto` — копия
    `commentReportFilterDto` (мелкие dto дублируются по доменам — `architecture.md`).
- `dto/postResources.ts`:
  - `PostReportState = 'none' | 'sent' | 'resolved'`;
  - `postReportRowResource`: `postId, title, status, author { id, name, avatarKey },
    reporters: { id, name, reason, comment, at }[], firstAt, lastAt, resolution: { kind, by:
    string | null, at } | null`; `postReportListResource`.
- `shared/postReports.ts` (`server-only`):
  - `resolveOpenPostReports(tx, postId, resolution, byUserId): number[]` — `UPDATE … WHERE
    postId = ? AND resolvedAt IS NULL RETURNING userId`;
  - `settlePostReports(tx, postId, transition, actorId): number[]` — реш. 1; уведомления —
    из шага 3;
  - `countOpenPostReports()` — `countDistinct(postId)` по открытым (бейдж, переключатель);
  - `reportStateOf(tx | db, postId, userId): PostReportState`.
- `shared/loadPostReports.ts` (`server-only`) — по образцу `loadCommentReports.ts`:
  `loadOpenPostReports()`, `loadResolvedPostReports(page)`, `countResolvedPostReportGroups()`;
  один запрос: `post_reports` ⋈ `posts` ⋈ author ⋈ reporter ⟕ resolver, группировка в JS по
  `postId:resolvedAt`, открытые — по первой жалобе asc, рассмотренные — свежие сверху,
  `RESOLVED_POST_REPORTS_PER_PAGE = 20`.
- `shared/changePostStatus.ts` — вызов `settlePostReports` в транзакции после `also` и до
  `notifyPostTransition`, ids — в общий список.
- `shared/postBlocking.ts` — `insertBlockModeration` (реш. 2); `blockPostAction`
  переходит на него.
- `globals/rateLimiter.ts` — `postReport: memoryLimiter({ keyPrefix: 'post-report', points:
  10, duration: 60 * 60 })`.

### 3. Уведомления

- `domains/posts/shared/postReportNotifications.ts` (`server-only`):
  - `notifyPostReported(tx, post: { id, userId }, actorId)` — только если открытая жалоба
    одна (как `notifyCommentReported`): `post_report.created` всем `staffIds`, кроме автора
    поста и жалобщика, `{ actorId, postId }`;
  - `notifyPostReportsResolved(tx, postId, reporterIds, actorId)` — удаляет задачи и шлёт
    `post_report.resolved` жалобщикам;
  - `deletePostReportNotifications(tx, postId)` — в `notifications/shared/notify.ts` рядом с
    `deleteReportNotifications` и через `exports/notify.ts` (домен чужой).
- `notificationText.ts`:
  - `post_report.created` → `fixed('Жалоба на пост «…»', '/office/moderation/reports/posts')`;
  - `post_report.resolved` → «Жалоба на пост «…» рассмотрена: пост заблокирован» / «…: пост
    оставлен»; ссылка — обычный `postHref` (заблокированный — «пост недоступен»);
  - `report.created` → ссылка `/office/moderation/reports/comments`.
- `loadNotifications.ts` — left join `post_reports` (реш. 7).
- `notificationLook.ts` — две записи: `IconFlag` (или `IconShieldCheck`, как у `report.*`),
  тон `plum`, заголовки «Жалоба на пост» / «Жалоба рассмотрена», действия «Разобрать» /
  «Открыть».
- `npx tsc --noEmit` покажет остальные `Record<NotificationType, …>`, если есть.

### 4. Actions — `domains/posts/actions/postReportActions.ts`

- `reportPostAction(postId)` + `.inputSchema(postReportDto)`:
  `consumeOrFail(rateLimiters.postReport, String(auth.id))`; транзакция: пост
  (`posts.userId`, `status`), нет — 404-ошибка через `actionError(404)`; автор → 403 «Нельзя
  пожаловаться на свой пост»; не `published` → 409 «Пост уже снят с публикации»; insert
  `onConflictDoNothing().returning()`; состояние — `reportStateOf`; вставили —
  `notifyPostReported`. После commit — `publishNotifications`,
  `revalidatePath('/office/moderation/reports/posts')`. Возвращает `{ state }`.
- `keepReportedPostAction(postId)` — `breakIfCant(moderatePosts)`; в транзакции: свой →
  403 «Жалобы на свой пост разбирает другой модератор»; статус не `published`/`hidden` или
  `resolveOpenPostReports(..., 'kept', auth.id)` вернул 0 → 409 «Жалобы уже разобраны»;
  `notifyPostReportsResolved`. Revalidate как выше.
- `blockReportedPostAction(postId)` + `postBlockDto` — реш. 2; свой → 403 до перехода.
- `domains/posts/actions/postViewerActions.ts` → `loadPostViewerAction(postId)` (реш. 10);
  `myPostFavoriteAction` удалить, импорты поправить.

### 5. Страница поста

- `app/(public)/posts/[id]/page.tsx` — `PostActions` += `authorId={post.userId}`.
- `PostActions`:
  - состояние `report: PostReportState | null` из `loadPostViewerAction`;
  - кнопка показывается, только когда `ready && user && reportPost(user, { userId:
    authorId, status: 'published' })` — гостю и автору нет, до гидрации нет;
  - ряд `.ui-post-actions`: `ui-pill` «Пожаловаться» (`IconFlag`); `sent` / `resolved` —
    `disabled`, текст «Жалоба отправлена» / «Жалоба рассмотрена»;
  - мобильная панель `.ui-post-bar`: кнопка «…» (`IconDots`) с Mantine `Menu`, пункт
    «Пожаловаться» (в состоянии `sent`/`resolved` — неактивный с тем же текстом); нет права —
    кнопки «…» нет.
- `PostReportDialog` (client, `domains/posts/components/`): Mantine `Modal`, `RadioGroup` +
  `Radio` по `POST_REPORT_REASON_LABELS`, `Textarea` (счётчик `n / 500`, `required` при
  `other`), «Отправить». Форма — `useForm`, ошибки — `fieldError(validationErrors, …)`,
  `serverError` — текстом в диалоге. Успех → закрыть, `showToast('Жалоба отправлена…')`,
  `onSent(state)`.
- Стили — в `theme/layout.css` (токены из `tokens.css`), класс-модификатор пилюли для
  неактивного состояния — как у избранного.
- Скил `hydration` — свериться (кнопка зависит от пользователя).

### 6. Переезд очереди комментариев

- `git mv app/office/moderation/comments/page.tsx app/office/moderation/reports/comments/page.tsx`;
  `PageProps<'/office/moderation/reports/comments'>`, href вкладок и `Pager` — новый путь.
  Над вкладками — `ReportKindTabs active="comments"`.
- `revalidatePath('/office/moderation/comments')` → `…/reports/comments` в
  `commentModerationActions.ts`, `commentActions.ts`, `commentReportActions.ts` (2 места).
- Старый URL — без редиректа (спека, п. 4). `grep -rn "moderation/comments" src` должен
  быть пустым.

### 7. Очередь постов — `app/office/moderation/reports/posts/page.tsx`

- Копия устройства страницы комментариев: `breakIfCant(moderatePosts)`,
  `postReportFilterDto`, `OfficeHead title="Жалобы" sub="Посты, на которые пожаловались
  читатели"`, `ReportKindTabs active="posts"` с числами `countOpenPostReports()` /
  `countOpenCommentReports()`, вкладки «Открытые / Рассмотренные» с числами, пусто —
  `.ui-empty`, подсказка «разберёте — и жалоб не останется», `Pager` у рассмотренных.
- `PostReportCard` (client, `domains/posts/components/`, по образцу `CommentReportCard`,
  props через `resource()` — скил `resource`):
  - шапка: «N жалоб» (`plural`), последняя — `LocalDate`; у рассмотренной — итог, кто
    (`by`, у `withdrawn` — без имени) и когда;
  - пост: заголовок (реш. 4), автор с аватаром, `PostStatusTag`;
  - жалобщики списком: имя, причина, комментарий (`pre-wrap`), `LocalDate`;
  - действия открытой: «Заблокировать пост» → поле причины (обязательное, как в
    `PostBlockingForm`) и `blockReportedPostAction`; «Оставить» → `keepReportedPostAction`;
    свой пост — «Ваш пост — разберёт другой модератор», без кнопок. Успех →
    `router.refresh()`; ошибка — `serverError` текстом.
- `components/office/ReportKindTabs.tsx` — реш. 5; разметка — `.ui-tabs` (или вариант
  сегментов по макету), ссылки `Link`.

### 8. Меню и «Начало»

- `getOfficeMenu.ts`: `reports = (moderateComments ? countOpenCommentReports : 0) +
  (moderatePosts ? countOpenPostReports : 0)`; `countOpenPostReports` — через
  `domains/posts/exports/countModeratingPosts.ts` (или новый `exports/countOpenPostReports.ts`).
- `officeMenuItems.ts`: «Жалобы» → `href: '/office/moderation/reports/posts', match:
  '/office/moderation/reports'`; поле `match` и `activeMenuItem` — реш. 6.
- `OfficeStaffLine.tsx` — ссылка «Жалобы» → `/office/moderation/reports/posts`.

### 9. Демо

- `scripts/seed-demo/types.ts` — у поста `reports?: { by: string, reason: PostReportReason,
  comment?: string }[]`, `reportsResolved?: 'kept' | 'blocked'`.
- `posts-*.ts`: два опубликованных поста с открытыми жалобами (на одном — две, разные
  причины, одна `other` с комментарием), один с `kept`. Заблокированный пост
  (`posts-others.ts:839`) — с жалобой `blocked`, закрыл `some`.
- `fill.ts` — вставка `post_reports` и `post_report.created` staff по открытым (как у
  комментариев, строки 174–187), `post_report.resolved` жалобщикам по закрытым.
- `scripts/seed-dev.ts` — `schema.postReports` в список очистки.
- Новых файлов для рантайма нет — `Dockerfile` не трогать (если всё же появится — в `COPY`).

### 10. Документы

- `docs/lifecycles/report.md` — заголовок «Жалобы (report)», нынешний текст — раздел «Жалоба
  на комментарий» (URL → `office/moderation/reports/comments`), новый раздел «Жалоба на
  пост»: состояния (открыта → `blocked` / `kept` / `withdrawn`), кто жалуется, причины, лимит
  10/час, кто разбирает и где, таблица действий, побочные эффекты переходов поста,
  уведомления, хранение. Плюс реш. 3 (`withdrawn` — «рассмотрена»).
- `docs/lifecycles/post.md`: «Уведомления» — строки `post_report.created` /
  `post_report.resolved`; «Переходы» — побочный эффект `block`, `blockArchived`, `unpublish`,
  `redraftArchived` на жалобы; «Кто что видит» — staff: очередь жалоб
  `office/moderation/reports/posts`; любой вошедший, кроме автора, — кнопка «Пожаловаться» на
  `published`; автор о жалобах не узнаёт.
- Спека: статус → `done` после проверки, отклонения — в конец; `docs/specs/README.md` —
  строка 36.

### 11. Проверка (скил `app-run`, скрипт в scratchpad)

Перед — `npx tsc --noEmit`, `npm run lint`.

- Гость на посте — кнопки нет; `bob` на своём посте — нет; `alice` на посте `bob` — есть.
- Диалог: «Другое» без комментария — ошибка поля; 501 символ — ошибка; с причиной
  «Спам» — тост, кнопка «Жалоба отправлена»; после перезагрузки — то же.
- Повтор вручную (`reportPostAction`) — одна строка в `post_reports`.
- `some` (moderator) и `alice` (admin) получают `post_report.created`; вторая жалоба от
  другого пользователя — новых уведомлений нет; у жалобщика-staff своего уведомления нет.
- `reportPostAction` автором — 403; на `hidden` — 409; 11-я жалоба за час — 429
  (отдельный пользователь).
- Очередь `reports/posts` у `some`: одна карточка, два жалобщика с причинами; бейдж меню =
  посты + комментарии; пункт горит и на `reports/comments`; переключатель с числами.
- «Оставить» — карточка ушла в «Рассмотренные» (итог, кто, когда), у жалобщиков
  `post_report.resolved` «пост оставлен», задачи у staff удалены, у жалобщика — «Жалоба
  рассмотрена».
- «Заблокировать пост» с причиной — пост `blocked`, запись в `post_moderations`, автору
  `post.blocked`, жалобщикам «пост заблокирован».
- Блокировка со страницы модерации поста тоже закрывает жалобы (`blocked`); разблокировка их
  не открывает.
- Автор: `archive` — жалобы открыты, `restore` — те же открыты; `unpublish` — `withdrawn`,
  задачи у staff удалены, уведомлений жалобщикам нет.
- Модератор-автор (пост `some`, жалоба от `bob`): в очереди у `some` — без кнопок,
  `keepReportedPostAction` вручную — 403; у `alice` — с кнопками.
- Устаревшая вкладка: разобрать в одной, нажать «Оставить» в другой — 409 «Жалобы уже
  разобраны».
- `reports/posts` и `reports/comments` у `bob` — 403; `office/moderation/comments` — 404.
- Очередь комментариев на новом URL работает как раньше (скрыть/оставить), ссылка из
  `report.created` ведёт туда.
- Телефон (ширина 390): «…» в мобильной панели → «Пожаловаться» → диалог.
- Консоль без ошибок гидрации; тестовые жалобы — подчистить.

Закончил фазу — напомнить человеку про `/clear`.
