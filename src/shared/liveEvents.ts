import type { NotificationItemResource, NotificationTab } from "@/domains/notifications/exports/notificationResources";
import type { MessageItemResource, MessagePeerResource } from "@/domains/messages/exports/messageResources";

/*
  События живого канала (SSE, спека 20): имя → payload. Сервер шлёт их через liveBus, клиент
  слушает useLiveEvent. Payload идёт JSON-ом: даты приходят строками
*/
export type LiveEvents = {
  // unreadTabs — непрочитанные по вкладкам истории (спека 44), считает сервер
  'notification.created': { notification: NotificationItemResource, unread: number, unreadTabs: Record<NotificationTab, number> },
  // id — прочитано одно; null — «Прочитать все»: tab null — всё, иначе — вкладка (спека 44)
  'notification.read': { id: number | null, tab: NotificationTab | null, unread: number, unreadTabs: Record<NotificationTab, number> },
  // Обоим участникам: отправителю — для других его вкладок. sender — тосту получателя (спека 29)
  'message.created': { dialogId: number, message: MessageItemResource, sender: MessagePeerResource },
  // dialogDeleted — удалено последнее сообщение, диалога больше нет
  'message.deleted': { dialogId: number, messageId: number, dialogDeleted: boolean },
  // Только себе: вкладки перечитывают счётчик сообщений. null — скрыта переписка
  'message.read': { dialogId: number | null },
  // Широковещательное, гостям тоже: первая публикация поста, лента предлагает обновиться (спека 22)
  'post.published': { postId: number },
  // Тематические (спека 29): тем, у кого открыт пост, гостям тоже. Комментарии — сигнал «перечитай»
  'post.comments.changed': { postId: number, imageId: number | null },
  'comment.reactions': { postId: number, commentId: number, likes: number, dislikes: number },
  'post.rating': { postId: number, average: number | null, count: number },
  // Тема автора: число подписчиков у всех, кто смотрит его страницу или пост
  'user.followers': { userId: number, followersCount: number },
}

export type LiveEventType = keyof LiveEvents;

export const LIVE_EVENT_TYPES = [ 'notification.created', 'notification.read', 'message.created', 'message.deleted', 'message.read', 'post.published', 'post.comments.changed', 'comment.reactions', 'post.rating', 'user.followers' ] as const satisfies readonly LiveEventType[];

// Уходят всем через liveBus.broadcast; только на них гость открывает поток
export const LIVE_BROADCAST_EVENT_TYPES = [ 'post.published' ] as const satisfies readonly LiveEventType[];

export type LiveBroadcastEventType = (typeof LIVE_BROADCAST_EVENT_TYPES)[number];

// Уходят через liveBus.publishTopic подписчикам темы — вошедшим и гостям
export const LIVE_TOPIC_EVENT_TYPES = [ 'post.comments.changed', 'comment.reactions', 'post.rating', 'user.followers' ] as const satisfies readonly LiveEventType[];

export type LiveTopicEventType = (typeof LIVE_TOPIC_EVENT_TYPES)[number];

// Тема — то, что смотрит вкладка: пост или автор. Поток открывается с ?topics=post:12,user:3
export type LiveTopic = `post:${number}` | `user:${number}`;

// Больше тем — 400: на странице их одна-две
export const LIVE_TOPICS_LIMIT = 5;

export function postTopic(postId: number): LiveTopic {
  return `post:${postId}`;
}

export function userTopic(userId: number): LiveTopic {
  return `user:${userId}`;
}

// Только каноническая запись id, как idOrFail: иначе одна тема под разными именами
export function isLiveTopic(value: string): value is LiveTopic {
  const match = /^(?:post|user):([1-9]\d*)$/.exec(value);

  return match !== null && Number.isSafeInteger(Number(match[1]));
}
