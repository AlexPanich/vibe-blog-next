import { relations, sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const USER_ROLES = ['author', 'moderator', 'admin'] as const;

export type Role = (typeof USER_ROLES)[number];

// Кто может написать мне первым (спека 45); ответ в своём диалоге можно всегда
export const MESSAGES_FROM = ['all', 'following', 'nobody'] as const;

export type MessagesFrom = (typeof MESSAGES_FROM)[number];

// Род для глагола в уведомлениях (спека 51): «оценил / оценила»; null — безродовая форма
export const USER_GENDERS = ['m', 'f'] as const;

export type UserGender = (typeof USER_GENDERS)[number];

// Антиспам уведомлений (спека 51): rate — пара человек–пост, follow — пара подписчик–автор
export const THROTTLE_KINDS = ['rate', 'follow'] as const;

export type ThrottleKind = (typeof THROTTLE_KINDS)[number];

export const POST_STATUSES = ['draft', 'moderating', 'published', 'rejected', 'hidden', 'blocked'] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_TYPES = ['simple', 'translate', 'travel'] as const;

export type PostType = (typeof POST_TYPES)[number];

export const MODERATION_DECISIONS = ['approved', 'rejected', 'blocked', 'unblocked'] as const;

export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export const COMMENT_MODERATION_DECISIONS = ['hidden', 'unhidden', 'edited'] as const;

export type CommentModerationDecision = (typeof COMMENT_MODERATION_DECISIONS)[number];

export const COMMENT_REPORT_RESOLUTIONS = ['hidden', 'kept', 'deleted'] as const;

export type CommentReportResolution = (typeof COMMENT_REPORT_RESOLUTIONS)[number];

// Причина жалобы на пост (спека 36); для other комментарий обязателен — в zod
export const POST_REPORT_REASONS = ['spam', 'abuse', 'copyright', 'misleading', 'other'] as const;

export type PostReportReason = (typeof POST_REPORT_REASONS)[number];

// withdrawn — автор увёл пост в черновик, закрывшего нет
export const POST_REPORT_RESOLUTIONS = ['blocked', 'kept', 'withdrawn'] as const;

export type PostReportResolution = (typeof POST_REPORT_RESOLUTIONS)[number];

export const AUTHOR_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type AuthorRequestStatus = (typeof AUTHOR_REQUEST_STATUSES)[number];

export const USER_ADMIN_ACTIONS = ['banned', 'unbanned', 'role_granted', 'role_revoked', 'avatar_removed', 'cover_removed'] as const;

export type UserAdminActionType = (typeof USER_ADMIN_ACTIONS)[number];

export const NOTIFICATION_TYPES = [
  'comment.created', 'comment.reply', 'comment.hidden', 'comment.unhidden', 'comment.edited',
  'post.approved', 'post.rejected', 'post.blocked', 'post.unblocked', 'post.published', 'post.submitted', 'post.featured',
  'report.created', 'report.resolved',
  'post_report.created', 'post_report.resolved',
  'user.unbanned', 'user.role_granted', 'user.role_revoked', 'user.avatar_removed', 'user.cover_removed',
  'message.created',
  'post.rated', 'user.followed',
  'author_request.created', 'author_request.rejected',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  // Внешний URL от GitHub — не показываем; свой аватар — avatarKey (файлы в storage/uploads)
  image: text('image'),
  avatarKey: text('avatar_key'),
  /*
    Обычный text, без mode json. Better auth сам делает сериализацию и парсинг
  */
  roles: text('roles').notNull().default('[]'),
  /*
    Текущее состояние бана, история — в userAdminActions. better-auth эти колонки не знает,
    проверка при входе — в databaseHooks в globals/auth.ts
  */
  bannedAt: integer('banned_at', { mode: 'timestamp' }),
  banReason: text('ban_reason'),
  // Срок бана (спека 46): null при bannedAt — навсегда. Бан истёк — поля чистит хук входа (globals/auth.ts)
  bannedUntil: integer('banned_until', { mode: 'timestamp' }),
  // «О себе» на странице автора; better-auth колонку не знает, пишет updateBioAction
  bio: text('bio'),
  /*
    Кто может начать со мной переписку (спека 45): все, мои подписки, никто. Staff обходит,
    ответ в диалоге, где я писал, — всегда. better-auth колонку не знает, пишет updateMessagesFromAction
  */
  messagesFrom: text('messages_from', { enum: MESSAGES_FROM }).notNull().default('all'),
  // Избранное видно всем на странице автора (спека 40); better-auth колонку не знает, пишет updateFavoritesPublicAction
  favoritesPublic: integer('favorites_public', { mode: 'boolean' }).notNull().default(false),
  // Своя обложка профиля (спека 41): webp по ширине, COVER_WIDTHS; better-auth колонку не знает, пишет uploadCoverAction
  coverKey: text('cover_key'),
  // «Ещё у Ани» под постом (спека 41): человек пишет сам, без склонения; пишет updateBioAction
  nameGenitive: text('name_genitive'),
  // Род для глагола в уведомлениях (спека 51), только выбор человека; нигде не показывается. Пишет updateBioAction
  gender: text('gender', { enum: USER_GENDERS }),
  // Последняя смена имени (спека 45): не чаще раза в сутки; null — не меняли. Пишет updateNameAction
  nameChangedAt: integer('name_changed_at', { mode: 'timestamp' }),
  // Когда последний раз открывал «К моим постам» (спека 43): позже — «Новый». null — всё новое
  commentsSeenAt: integer('comments_seen_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  check('users_name_genitive_check', sql`${t.nameGenitive} IS NULL OR length(${t.nameGenitive}) BETWEEN 1 AND 40`),
  check('users_messages_from_check', sql`${t.messagesFrom} IN ('all', 'following', 'nobody')`),
  check('users_gender_check', sql`${t.gender} IS NULL OR ${t.gender} IN ('m', 'f')`),
]);

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verifications = sqliteTable('verifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  // Подзаголовок (спека 35): обычный текст, пустой — NULL
  lead: text('lead'),
  status: text('status', { enum: POST_STATUSES }).notNull().default('draft'),
  /*
    Поля типа хранятся плоско и nullable, согласованность с type держит check ниже
  */
  type: text('type', { enum: POST_TYPES }).notNull().default('simple'),
  source: text('source'),
  lat: real('lat'),
  lng: real('lng'),
  /*
    Кто из модераторов взял пост на ревью — мягкая блокировка внутри moderating, а не статус.
    Любая смена статуса её снимает (changePostStatus)
  */
  reviewerId: integer('reviewer_id').references(() => users.id),
  // Обложка из галереи; null — первая картинка
  coverImageId: integer('cover_image_id'),
  reviewStartedAt: integer('review_started_at', { mode: 'timestamp' }),
  /*
    Первая публикация: ключ ленты «Новые» и разовая рассылка post.published (спеки 20, 22).
    Ставится при первом approve, restore и unblock её не меняют
  */
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  /*
    Ручной «Выбор редакции» (спека 39): когда и кто выбрал. Действует 7 дней (editorsPick.ts),
    ненулевой featuredAt — максимум у одного поста: новый выбор обнуляет прежний, уход из
    published — тоже (changePostStatus)
  */
  featuredAt: integer('featured_at', { mode: 'timestamp' }),
  featuredBy: integer('featured_by').references(() => users.id),
  /*
    Последняя отправка на модерацию (спека 49): ставит changePostStatus при каждом переходе в
    moderating. Ключ очереди; повторная отправка видна в истории модерации. null — не отправлялся
  */
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  // Последнее сохранение содержимого (спека 49): поля редактора и галерея; смена статуса не трогает
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('posts_status_idx').on(t.status),
  index('posts_status_submitted_idx').on(t.status, t.submittedAt),
  index('posts_type_idx').on(t.type),
  index('posts_status_published_idx').on(t.status, t.publishedAt),
  // text enum в SQLite ничего не проверяет, поэтому поля типа держит сама БД
  check('posts_type_fields_check', sql`
    (${t.type} = 'simple' AND ${t.source} IS NULL AND ${t.lat} IS NULL AND ${t.lng} IS NULL) OR
    (${t.type} = 'translate' AND ${t.source} IS NOT NULL AND ${t.lat} IS NULL AND ${t.lng} IS NULL) OR
    (${t.type} = 'travel' AND ${t.source} IS NULL AND ${t.lat} IS NOT NULL AND ${t.lng} IS NOT NULL)
  `),
  check('posts_lead_check', sql`${t.lead} IS NULL OR length(${t.lead}) BETWEEN 20 AND 200`),
  check('posts_featured_check', sql`(${t.featuredAt} IS NULL) = (${t.featuredBy} IS NULL)`),
]);

/*
  История решений модератора: одобрения и отклонения из очереди, блокировки и
  разблокировки. Записи не перезаписываются и не удаляются, поэтому у внешних ключей
  нет onDelete cascade
*/
export const postModerations = sqliteTable('post_moderations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  decision: text('decision', { enum: MODERATION_DECISIONS }).notNull(),
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('post_moderations_post_created_idx').on(t.postId, t.createdAt),
  check('post_moderations_required_comment', sql`${t.decision} NOT IN ('rejected', 'blocked') OR length(trim(coalesce(${t.comment}, ''))) > 0`),
]);

/*
  Журнал действий admin над пользователями. Записи не перезаписываются и не удаляются,
  поэтому у внешних ключей нет onDelete cascade
*/
export const userAdminActions = sqliteTable('user_admin_actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  actorId: integer('actor_id').notNull().references(() => users.id),
  action: text('action', { enum: USER_ADMIN_ACTIONS }).notNull(),
  role: text('role', { enum: USER_ROLES }),
  comment: text('comment'),
  // Срок из записи banned (спека 46): null — навсегда или не бан
  until: integer('until', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('user_admin_actions_user_created_idx').on(t.userId, t.createdAt),
  check('user_admin_actions_role', sql`(${t.action} IN ('role_granted', 'role_revoked')) = (${t.role} IS NOT NULL)`),
  check('user_admin_actions_ban_comment', sql`${t.action} <> 'banned' OR length(trim(coalesce(${t.comment}, ''))) > 0`),
  check('user_admin_actions_until', sql`${t.until} IS NULL OR ${t.action} = 'banned'`),
]);

export const userAdminActionsRelations = relations(userAdminActions, ({ one }) => ({
  user:  one(users, { fields: [userAdminActions.userId], references: [users.id], relationName: 'adminActionTarget' }),
  actor: one(users, { fields: [userAdminActions.actorId], references: [users.id], relationName: 'adminActionActor' })
}));

/*
  Справочник рубрик. nameKey — название в нижнем регистре для уникальности: lower() в SQLite
  меняет регистр только у ASCII, и индекс по lower(name) пропустил бы «Горы» и «горы»
*/
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nameKey: text('name_key').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/*
  cascade на tagId — для схемы: PRAGMA foreign_keys в проекте не включён, поэтому
  deleteTagAction чистит связи сам
*/
export const postTags = sqliteTable('post_tags', {
  postId: integer('post_id').notNull().references(() => posts.id),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, t => [
  primaryKey({ columns: [ t.postId, t.tagId ] }),
  index('post_tags_tag_idx').on(t.tagId),
]);

/*
  Оценки постов 1–5, одна на пару пост–пользователь. Агрегаты не храним — считаем запросом
*/
export const postRatings = sqliteTable('post_ratings', {
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  value: integer('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.postId, t.userId ] }),
  check('post_ratings_value', sql`${t.value} BETWEEN 1 AND 5`),
]);

/*
  Просмотры публичной страницы поста по дням (спека 43): агрегат, а не события. Не чистится —
  из него же «всего просмотров». День — 'YYYY-MM-DD' по часам сервера (postViewDay.ts)
*/
export const postViewsDaily = sqliteTable('post_views_daily', {
  postId: integer('post_id').notNull().references(() => posts.id),
  day: text('day').notNull(),
  views: integer('views').notNull().default(0),
}, t => [
  primaryKey({ columns: [ t.postId, t.day ] }),
]);

/*
  Дневная уникальность просмотра (спека 43): зритель — `u:<id>` или `g:<sha256>` гостя (соль,
  IP, UA, день). Хранится сегодня и вчера, старое удаляет запись просмотра (postViews.ts)
*/
export const postViewSeen = sqliteTable('post_view_seen', {
  postId: integer('post_id').notNull().references(() => posts.id),
  day: text('day').notNull(),
  viewerHash: text('viewer_hash').notNull(),
}, t => [
  primaryKey({ columns: [ t.postId, t.day, t.viewerHash ] }),
  index('post_view_seen_day_idx').on(t.day),
]);

/*
  Избранное: закладка принадлежит человеку, публичного счётчика нет
*/
export const postFavorites = sqliteTable('post_favorites', {
  userId: integer('user_id').notNull().references(() => users.id),
  postId: integer('post_id').notNull().references(() => posts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.userId, t.postId ] }),
]);

/*
  Галерея поста. Файлы — webp-варианты в storage/uploads по ключу fileKey
*/
/*
  Подписка человека на автора. Взаимная подписка — «друг», отдельной сущности нет
*/
export const userFollows = sqliteTable('user_follows', {
  followerId: integer('follower_id').notNull().references(() => users.id),
  followingId: integer('following_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.followerId, t.followingId ] }),
  index('user_follows_following_idx').on(t.followingId),
  check('user_follows_not_self', sql`${t.followerId} <> ${t.followingId}`),
]);

/*
  Блокировка (спека 26): userId закрылся от blockedId. Связь односторонняя, но запрет
  взаимодействия — в обе стороны; встречная блокировка — отдельная строка
*/
export const userBlocks = sqliteTable('user_blocks', {
  userId: integer('user_id').notNull().references(() => users.id),
  blockedId: integer('blocked_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.userId, t.blockedId ] }),
  index('user_blocks_blocked_idx').on(t.blockedId),
  check('user_blocks_not_self', sql`${t.userId} <> ${t.blockedId}`),
]);

/*
  Заявка на роль author (спека 28). Ожидающая — одна на пользователя; отозванная удаляется,
  решённые остаются историей: от последнего отказа считается пауза
*/
export const authorRequests = sqliteTable('author_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  text: text('text').notNull(),
  status: text('status', { enum: AUTHOR_REQUEST_STATUSES }).notNull().default('pending'),
  reason: text('reason'),
  decidedBy: integer('decided_by').references(() => users.id),
  decidedAt: integer('decided_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  uniqueIndex('author_requests_pending_uq').on(t.userId).where(sql`${t.status} = 'pending'`),
  index('author_requests_user_idx').on(t.userId, t.createdAt),
  index('author_requests_status_idx').on(t.status, t.createdAt),
  check('author_requests_status', sql`${t.status} IN ('pending', 'approved', 'rejected')`),
  check('author_requests_reason', sql`${t.status} <> 'rejected' OR length(trim(coalesce(${t.reason}, ''))) > 0`),
  check('author_requests_decided', sql`(${t.status} = 'pending') = (${t.decidedAt} IS NULL)`),
]);

export const authorRequestsRelations = relations(authorRequests, ({ one }) => ({
  user:    one(users, { fields: [authorRequests.userId], references: [users.id], relationName: 'authorRequestUser' }),
  decider: one(users, { fields: [authorRequests.decidedBy], references: [users.id], relationName: 'authorRequestDecider' })
}));

// Подписка на рубрику: удаляется вместе с рубрикой (deleteTagAction)
export const tagFollows = sqliteTable('tag_follows', {
  userId: integer('user_id').notNull().references(() => users.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.userId, t.tagId ] }),
  index('tag_follows_tag_idx').on(t.tagId),
]);

export const postImages = sqliteTable('post_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id),
  fileKey: text('file_key').notNull().unique(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  caption: text('caption'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('post_images_post_idx').on(t.postId),
]);

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(posts, { fields: [postImages.postId], references: [posts.id] }),
}));

/*
  Комментарии — дерево через parentId. Удалённый с ответами остаётся заглушкой (deletedAt,
  текст стёрт), скрытый модератором — с причиной; удалённый без ответов удаляется строкой
*/
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  parentId: integer('parent_id'),
  // Комментарий к картинке галереи; null — к самому посту
  imageId: integer('image_id'),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  // Последнюю правку сделал модератор (спека 24); правка автором сбрасывает
  editedBy: integer('edited_by').references(() => users.id),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  hiddenAt: integer('hidden_at', { mode: 'timestamp' }),
  hiddenBy: integer('hidden_by').references(() => users.id),
  hideReason: text('hide_reason'),
}, t => [
  index('comments_post_idx').on(t.postId),
  index('comments_user_idx').on(t.userId),
  index('comments_parent_idx').on(t.parentId),
  index('comments_image_idx').on(t.imageId),
  check('comments_hidden_reason', sql`${t.hiddenAt} IS NULL OR length(trim(coalesce(${t.hideReason}, ''))) > 0`),
]);

export const commentReactions = sqliteTable('comment_reactions', {
  commentId: integer('comment_id').notNull().references(() => comments.id),
  userId: integer('user_id').notNull().references(() => users.id),
  value: integer('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.commentId, t.userId ] }),
  check('comment_reactions_value', sql`${t.value} IN (1, -1)`),
]);

/*
  Журнал скрытий и возвратов. Записи не меняются и не удаляются
*/
export const commentModerations = sqliteTable('comment_moderations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: integer('comment_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  decision: text('decision', { enum: COMMENT_MODERATION_DECISIONS }).notNull(),
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('comment_moderations_comment_idx').on(t.commentId),
  check('comment_moderations_hidden_comment', sql`${t.decision} <> 'hidden' OR length(trim(coalesce(${t.comment}, ''))) > 0`),
]);

/*
  Жалобы на комментарии. При разборе не удаляются — закрываются с итогом (resolution);
  строки удаляются только вместе с самим комментарием. postId — снимок для очереди
*/
export const commentReports = sqliteTable('comment_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: integer('comment_id').notNull().references(() => comments.id),
  userId: integer('user_id').notNull().references(() => users.id),
  postId: integer('post_id').notNull().references(() => posts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  // null у deleted: жалобы закрыло удаление комментария автором, а не модератор
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolution: text('resolution', { enum: COMMENT_REPORT_RESOLUTIONS }),
}, t => [
  uniqueIndex('comment_reports_comment_user_uq').on(t.commentId, t.userId),
  index('comment_reports_open_idx').on(t.resolvedAt, t.createdAt),
  check('comment_reports_resolution', sql`(${t.resolvedAt} IS NULL) = (${t.resolution} IS NULL)`),
]);

export const commentReportsRelations = relations(commentReports, ({ one }) => ({
  comment:  one(comments, { fields: [commentReports.commentId], references: [comments.id] }),
  reporter: one(users, { fields: [commentReports.userId], references: [users.id], relationName: 'commentReporter' }),
  resolver: one(users, { fields: [commentReports.resolvedBy], references: [users.id], relationName: 'commentReportResolver' }),
}));

/*
  Жалобы на посты (спека 36). Как и у комментариев, при разборе не удаляются — закрываются
  с итогом; одна на пару пост–пользователь, после разбора тот же человек заново не жалуется
*/
export const postReports = sqliteTable('post_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  reason: text('reason', { enum: POST_REPORT_REASONS }).notNull(),
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  // null у withdrawn: жалобы закрыл уход поста в черновик, а не модератор
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolution: text('resolution', { enum: POST_REPORT_RESOLUTIONS }),
}, t => [
  uniqueIndex('post_reports_post_user_uq').on(t.postId, t.userId),
  index('post_reports_open_idx').on(t.resolvedAt, t.createdAt),
  check('post_reports_resolution', sql`(${t.resolvedAt} IS NULL) = (${t.resolution} IS NULL)`),
]);

export const postReportsRelations = relations(postReports, ({ one }) => ({
  post:     one(posts, { fields: [postReports.postId], references: [posts.id] }),
  reporter: one(users, { fields: [postReports.userId], references: [users.id], relationName: 'postReporter' }),
  resolver: one(users, { fields: [postReports.resolvedBy], references: [users.id], relationName: 'postReportResolver' }),
}));

/*
  Уведомления получателю. Текст и ссылка не хранятся — считаются при показе по тому, что
  получатель видит сейчас. Строки — факты и задачи: задачи (post.submitted, report.created)
  удаляются, когда их сделали; хвост — 200 на получателя
*/
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type', { enum: NOTIFICATION_TYPES }).notNull(),
  actorId: integer('actor_id').references(() => users.id),
  postId: integer('post_id').references(() => posts.id),
  commentId: integer('comment_id'),
  // message.created — одна строка на диалог (спека 51), прочитанная тоже заменяется
  dialogId: integer('dialog_id'),
  role: text('role', { enum: USER_ROLES }),
  /*
    Группа (спека 51): сколько событий собрала непрочитанная строка — комментарии и оценки
    к посту, подписчики. Актор, commentId и createdAt — последнего события
  */
  groupCount: integer('group_count').notNull().default(1),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('notifications_user_read_idx').on(t.userId, t.readAt),
  index('notifications_user_id_idx').on(t.userId, t.id),
  index('notifications_comment_idx').on(t.commentId),
  index('notifications_post_idx').on(t.postId),
  index('notifications_dialog_idx').on(t.dialogId),
  check('notifications_role', sql`(${t.type} IN ('user.role_granted', 'user.role_revoked')) = (${t.role} IS NOT NULL)`),
]);

/*
  Память антиспама уведомлений (спека 51): когда паре актор–цель последний раз уведомили.
  rate — targetId = пост, раз в сутки; follow — targetId = пользователь, один раз. Отдельно от
  post_ratings / user_follows: снятие оценки и отписка удаляют те строки
*/
export const notificationThrottles = sqliteTable('notification_throttles', {
  actorId: integer('actor_id').notNull().references(() => users.id),
  kind: text('kind', { enum: THROTTLE_KINDS }).notNull(),
  targetId: integer('target_id').notNull(),
  notifiedAt: integer('notified_at', { mode: 'timestamp' }).notNull(),
}, t => [
  primaryKey({ columns: [ t.actorId, t.kind, t.targetId ] }),
  check('notification_throttles_kind', sql`${t.kind} IN ('rate', 'follow')`),
]);

/*
  Личный диалог — один на пару, без групп. Пара хранится упорядоченной (low < high), чтобы
  уникальный индекс не пропустил второй диалог «в обратную сторону». Пустых диалогов нет:
  создаёт первое сообщение, удаление последнего удаляет диалог
*/
export const dialogs = sqliteTable('dialogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userLowId: integer('user_low_id').notNull().references(() => users.id),
  userHighId: integer('user_high_id').notNull().references(() => users.id),
  // В миллисекундах: порядок списка, сообщения одной секунды не должны путаться
  lastMessageAt: integer('last_message_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  uniqueIndex('dialogs_pair_uq').on(t.userLowId, t.userHighId),
  index('dialogs_high_idx').on(t.userHighId),
  check('dialogs_pair_order', sql`${t.userLowId} < ${t.userHighId}`),
]);

// Сообщение удаляется только автором и целиком, у обеих сторон; правки нет
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dialogId: integer('dialog_id').notNull().references(() => dialogs.id),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  // Только у входящих: прочитал получатель
  readAt: integer('read_at', { mode: 'timestamp' }),
}, t => [
  index('messages_dialog_idx').on(t.dialogId, t.id),
]);

// «Запретить писать»: restrictedId больше не может написать userId. Связь односторонняя
export const messageRestrictions = sqliteTable('message_restrictions', {
  userId: integer('user_id').notNull().references(() => users.id),
  restrictedId: integer('restricted_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.userId, t.restrictedId ] }),
  check('message_restrictions_not_self', sql`${t.userId} <> ${t.restrictedId}`),
]);

/*
  «Скрыть переписку» — игнор: диалог с ignoredId уходит из моего списка и счётчика, уведомлений
  о нём нет. Связь моя, а не диалога: собеседник о ней не знает
*/
export const messageIgnores = sqliteTable('message_ignores', {
  userId: integer('user_id').notNull().references(() => users.id),
  ignoredId: integer('ignored_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  primaryKey({ columns: [ t.userId, t.ignoredId ] }),
  check('message_ignores_not_self', sql`${t.userId} <> ${t.ignoredId}`),
]);

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, { fields: [comments.userId], references: [users.id], relationName: 'commentAuthor' }),
  post:   one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags)
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag:  one(tags, { fields: [postTags.tagId], references: [tags.id] })
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author:      one(users, { fields: [posts.userId], references: [users.id], relationName: 'postAuthor' }),
  reviewer:    one(users, { fields: [posts.reviewerId], references: [users.id], relationName: 'postReviewer' }),
  moderations: many(postModerations),
  postTags:    many(postTags),
  comments:    many(comments),
  images:      many(postImages)
}));

export const postModerationsRelations = relations(postModerations, ({ one }) => ({
  post:      one(posts, { fields: [postModerations.postId], references: [posts.id] }),
  moderator: one(users, { fields: [postModerations.userId], references: [users.id] })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user:     one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user:     one(users, { fields: [accounts.userId], references: [users.id] })
}));

export const usersRelations = relations(users, ({ many }) => ({
  posts:         many(posts, { relationName: 'postAuthor' }),
  comments:      many(comments, { relationName: 'commentAuthor' }),
  moderations:   many(postModerations),
  adminActions:  many(userAdminActions, { relationName: 'adminActionTarget' }),
  authorRequests: many(authorRequests, { relationName: 'authorRequestUser' }),
  sessions:      many(sessions),
  accounts:      many(accounts)
}));