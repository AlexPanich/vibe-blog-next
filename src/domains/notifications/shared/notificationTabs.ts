import type { NotificationType, Role } from "@/database/schema";

// Вкладки истории уведомлений кроме «Все» (спека 44, реш. 6)
export const NOTIFICATION_TABS = [ 'posts', 'comments', 'followers', 'moderation' ] as const;

export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TAB_LABELS: Record<NotificationTab, string> = {
  posts: 'Посты',
  comments: 'Комментарии',
  followers: 'Подписчики',
  moderation: 'Модерация',
};

/*
  Вкладка типа уведомления. Пропуск нового типа ломает tsc (реш. 6); null — только во «Все»:
  у сообщений свой раздел со счётчиком, остальное — редкие разовые решения
*/
export const NOTIFICATION_TAB_OF: Record<NotificationType, NotificationTab | null> = {
  'post.approved': 'posts',
  'post.rejected': 'posts',
  'post.blocked': 'posts',
  'post.unblocked': 'posts',
  'post.published': 'posts',
  'post.featured': 'posts',
  'post.rated': 'posts',
  'comment.created': 'comments',
  'comment.reply': 'comments',
  'comment.edited': 'comments',
  'comment.hidden': 'comments',
  'comment.unhidden': 'comments',
  'user.followed': 'followers',
  'post.submitted': 'moderation',
  'report.created': 'moderation',
  'post_report.created': 'moderation',
  'author_request.created': 'moderation',
  'message.created': null,
  'report.resolved': null,
  'post_report.resolved': null,
  'user.unbanned': null,
  'user.role_granted': null,
  'user.role_revoked': null,
  'user.avatar_removed': null,
  'user.cover_removed': null,
  'author_request.rejected': null,
};

export function notificationTypesOf(tab: NotificationTab): NotificationType[] {
  return (Object.keys(NOTIFICATION_TAB_OF) as NotificationType[]).filter(type => NOTIFICATION_TAB_OF[type] === tab);
}

// Вкладки человека: «Модерация» — у moderator и admin
export function notificationTabsFor(roles: readonly Role[]): NotificationTab[] {
  const staff = roles.includes('moderator') || roles.includes('admin');

  return NOTIFICATION_TABS.filter(tab => tab !== 'moderation' || staff);
}

export function emptyNotificationTabs(): Record<NotificationTab, number> {
  return { posts: 0, comments: 0, followers: 0, moderation: 0 };
}
