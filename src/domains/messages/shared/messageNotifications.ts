import 'server-only';
import { messages, notifications } from "@/database/schema";
import { notify } from "@/domains/notifications/exports/notify";
import { isIgnored, type DBTransaction } from "@/domains/messages/shared/messageAccess";
import { and, eq, isNull, ne } from "drizzle-orm";

/*
  Одна строка message.created на диалог (спека 51, реш. 7): прежняя — и прочитанная тоже —
  заменяется новой, чтобы подняться наверх колокольчика и не копиться в истории. Число
  сообщений в тексте считается при показе. Скрытая переписка уведомлений не создаёт
*/
export function notifyMessage(tx: DBTransaction, dialogId: number, senderId: number, recipientId: number): number[] {
  if(isIgnored(tx, recipientId, senderId)){
    return [];
  }

  tx.delete(notifications).where(and(
    eq(notifications.type, 'message.created'),
    eq(notifications.userId, recipientId),
    eq(notifications.dialogId, dialogId)
  )).run();

  return notify(tx, 'message.created', [ recipientId ], { actorId: senderId, dialogId });
}

// Удалено входящее: уведомление уходит, если других непрочитанных в диалоге не осталось
export function dropMessageNotification(tx: DBTransaction, dialogId: number, recipientId: number){
  const left = tx.select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.dialogId, dialogId), ne(messages.userId, recipientId), isNull(messages.readAt)))
    .limit(1)
    .get();

  if(!left){
    tx.delete(notifications).where(unreadOf(dialogId, recipientId)).run();
  }
}

// Диалог открыт: его уведомление прочитано. Возвращает id — колокольчик синхронизируется
export function readMessageNotifications(tx: DBTransaction, dialogId: number, userId: number): number[] {
  return tx.update(notifications)
    .set({ readAt: new Date() })
    .where(unreadOf(dialogId, userId))
    .returning({ id: notifications.id })
    .all()
    .map(n => n.id);
}

export function deleteDialogNotifications(tx: DBTransaction, dialogId: number){
  tx.delete(notifications).where(and(eq(notifications.type, 'message.created'), eq(notifications.dialogId, dialogId))).run();
}

// Скрыл переписку: висящее уведомление о ней больше не нужно
export function deletePeerNotifications(tx: DBTransaction, userId: number, peerId: number){
  tx.delete(notifications).where(and(
    eq(notifications.type, 'message.created'),
    eq(notifications.userId, userId),
    eq(notifications.actorId, peerId)
  )).run();
}

function unreadOf(dialogId: number, userId: number){
  return and(
    eq(notifications.type, 'message.created'),
    eq(notifications.userId, userId),
    eq(notifications.dialogId, dialogId),
    isNull(notifications.readAt)
  );
}
