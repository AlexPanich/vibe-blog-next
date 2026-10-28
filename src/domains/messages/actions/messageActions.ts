'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { liveBus } from "@/globals/liveBus";
import { rateLimiters } from "@/globals/rateLimiter";
import { dialogs, messages, users } from "@/database/schema";
import { aiIdSchema, dialogPageDto, messageDto, messagePageDto } from "@/domains/messages/dto/messageRequests";
import type { MessageItemResource, MessagePeerResource } from "@/domains/messages/dto/messageResources";
import { dialogPair, findDialogBetween, findOwnDialog, isIgnored, isRestricted, writeBlockReason } from "@/domains/messages/shared/messageAccess";
import { countUnreadMessages, loadDialogRows, loadMessages } from "@/domains/messages/shared/loadMessages";
import { deleteDialogNotifications, dropMessageNotification, notifyMessage, readMessageNotifications } from "@/domains/messages/shared/messageNotifications";
import { publishNotifications, publishNotificationsRead } from "@/domains/notifications/exports/notify";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/*
  Диалог создаёт первое сообщение. Можно ли писать — в той же транзакции, что запись:
  устаревшая страница получает 409 с причиной
*/
export const sendMessageAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(messageDto)
  .action(async ({ parsedInput: { content }, bindArgsParsedInputs: [ recipientId ], ctx: { auth } }) => {
    await consumeOrFail(rateLimiters.messageSend, String(auth.id));

    if(!db.transaction(tx => findDialogBetween(tx, auth.id, recipientId))){
      await consumeOrFail(rateLimiters.dialogCreate, String(auth.id));
    }

    const sent = db.transaction(tx => {
      if(!tx.select({ id: users.id }).from(users).where(eq(users.id, recipientId)).get()){
        actionError(404, 'Пользователь не найден');
      }

      const reason = writeBlockReason(tx, auth, recipientId);

      if(reason){
        actionError(409, reason);
      }

      const now = new Date();
      const dialog = findDialogBetween(tx, auth.id, recipientId)
        ?? tx.insert(dialogs).values({ ...dialogPair(auth.id, recipientId), lastMessageAt: now }).returning().get();

      const message = tx.insert(messages)
        .values({ dialogId: dialog.id, userId: auth.id, content, createdAt: now })
        .returning({ id: messages.id, userId: messages.userId, content: messages.content, createdAt: messages.createdAt })
        .get();

      tx.update(dialogs).set({ lastMessageAt: now }).where(eq(dialogs.id, dialog.id)).run();

      return { dialogId: dialog.id, message, notificationIds: notifyMessage(tx, dialog.id, auth.id, recipientId) };
    });

    publishNotifications(sent.notificationIds);
    publishMessage(sent.dialogId, sent.message, { id: auth.id, name: auth.name, avatarKey: auth.avatarKey }, [ auth.id, recipientId ]);
    revalidatePath('/office/messages');

    return { dialogId: sent.dialogId, message: sent.message };
  });

/*
  Своё — полностью, у обеих сторон. Последнее в диалоге — диалог удаляется вместе с ним
*/
export const deleteMessageAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    const removed = db.transaction(tx => {
      const message = tx.select().from(messages).where(eq(messages.id, id)).get();

      if(!message){
        return actionError(409, 'Сообщение уже удалено — обновите страницу');
      }

      if(message.userId !== auth.id){
        actionError(403, 'Удалить можно только своё сообщение');
      }

      const dialog = findOwnDialog(tx, message.dialogId, auth.id)!;

      tx.delete(messages).where(eq(messages.id, id)).run();

      const last = tx.select({ createdAt: messages.createdAt }).from(messages).where(eq(messages.dialogId, dialog.id)).orderBy(desc(messages.id)).limit(1).get();

      if(!last){
        tx.delete(dialogs).where(eq(dialogs.id, dialog.id)).run();
        deleteDialogNotifications(tx, dialog.id);
      }
      else{
        tx.update(dialogs).set({ lastMessageAt: last.createdAt }).where(eq(dialogs.id, dialog.id)).run();
        dropMessageNotification(tx, dialog.id, dialog.peerId);
      }

      return { dialogId: dialog.id, peerId: dialog.peerId, dialogDeleted: !last };
    });

    for(const userId of [ auth.id, removed.peerId ]){
      liveBus.publish(userId, 'message.deleted', { dialogId: removed.dialogId, messageId: id, dialogDeleted: removed.dialogDeleted });
    }

    revalidatePath('/office/messages');

    return { dialogDeleted: removed.dialogDeleted };
  });

export const loadMessagesAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(messagePageDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ dialogId ], ctx: { auth } }) => {
    return db.transaction(tx => {
      if(!findOwnDialog(tx, dialogId, auth.id)){
        actionError(404, 'Диалог не найден');
      }

      return loadMessages(tx, dialogId, parsedInput);
    });
  });

/*
  Открытие диалога отмечает все входящие и его уведомление прочитанными; кнопки «прочитать» нет
*/
export const readDialogAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ dialogId ], ctx: { auth } }) => {
    const { changed, notificationIds } = db.transaction(tx => {
      if(!findOwnDialog(tx, dialogId, auth.id)){
        actionError(404, 'Диалог не найден');
      }

      const changed = tx.update(messages)
        .set({ readAt: new Date() })
        .where(and(eq(messages.dialogId, dialogId), ne(messages.userId, auth.id), isNull(messages.readAt)))
        .returning({ id: messages.id })
        .all().length;

      return { changed, notificationIds: readMessageNotifications(tx, dialogId, auth.id) };
    });

    publishNotificationsRead(auth.id, notificationIds);

    if(changed > 0){
      liveBus.publish(auth.id, 'message.read', { dialogId });
    }

    return { unread: countUnreadMessages(auth.id) };
  });

export const loadDialogsAction = actionAuthClient
  .inputSchema(dialogPageDto)
  .action(async ({ parsedInput, ctx: { auth } }) => {
    return loadDialogRows(auth.id, parsedInput);
  });

export const unreadMessagesAction = actionAuthClient
  .action(async ({ ctx: { auth } }) => {
    return { unread: countUnreadMessages(auth.id) };
  });

/*
  Кнопки на странице автора: публичная страница сессию на сервере не читает, клиент спрашивает сам
*/
export const messageStateAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ userId ], ctx: { auth } }) => {
    return db.transaction(tx => ({
      blockReason: writeBlockReason(tx, auth, userId),
      dialogId: findDialogBetween(tx, auth.id, userId)?.id ?? null,
      restricted: isRestricted(tx, auth.id, userId),
      ignored: isIgnored(tx, auth.id, userId)
    }));
  });

function publishMessage(dialogId: number, message: MessageItemResource, sender: MessagePeerResource, userIds: number[]){
  for(const userId of userIds){
    liveBus.publish(userId, 'message.created', { dialogId, message, sender });
  }
}
