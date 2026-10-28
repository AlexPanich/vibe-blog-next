import type { NotificationItemResource } from "@/domains/notifications/exports/notificationResources";
import type { MessageItemResource } from "@/domains/messages/exports/messageResources";

/*
  События живого канала (SSE, спека 20): имя → payload. Сервер шлёт их через liveBus, клиент
  слушает useLiveEvent. Payload идёт JSON-ом: даты приходят строками
*/
export type LiveEvents = {
  'notification.created': { notification: NotificationItemResource, unread: number },
  // id — прочитано одно; null — «Прочитать все»
  'notification.read': { id: number | null, unread: number },
  // Обоим участникам: отправителю — для других его вкладок
  'message.created': { dialogId: number, message: MessageItemResource },
  // dialogDeleted — удалено последнее сообщение, диалога больше нет
  'message.deleted': { dialogId: number, messageId: number, dialogDeleted: boolean },
  // Только себе: вкладки перечитывают счётчик сообщений. null — скрыта переписка
  'message.read': { dialogId: number | null },
  // Широковещательное, гостям тоже: первая публикация поста, лента предлагает обновиться (спека 22)
  'post.published': { postId: number },
}

export type LiveEventType = keyof LiveEvents;

export const LIVE_EVENT_TYPES = [ 'notification.created', 'notification.read', 'message.created', 'message.deleted', 'message.read', 'post.published' ] as const satisfies readonly LiveEventType[];

// Уходят всем через liveBus.broadcast; только на них гость открывает поток
export const LIVE_BROADCAST_EVENT_TYPES = [ 'post.published' ] as const satisfies readonly LiveEventType[];

export type LiveBroadcastEventType = (typeof LIVE_BROADCAST_EVENT_TYPES)[number];
