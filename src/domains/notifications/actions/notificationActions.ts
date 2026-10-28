'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { liveBus } from "@/globals/liveBus";
import { notifications } from "@/database/schema";
import { notificationPageDto, notificationReadDto } from "@/domains/notifications/dto/notificationRequests";
import { countUnread, loadNotificationPage } from "@/domains/notifications/shared/loadNotifications";
import { and, eq, isNull } from "drizzle-orm";

export const loadNotificationsAction = actionAuthClient
  .inputSchema(notificationPageDto)
  .action(async ({ parsedInput: { beforeId, unreadOnly }, ctx: { auth } }) => {
    return loadNotificationPage(auth.id, beforeId, unreadOnly);
  });

// Счётчик после гидрации, переподключения и возврата на вкладку
export const unreadNotificationsAction = actionAuthClient
  .action(async ({ ctx: { auth } }) => {
    return { unread: countUnread(auth.id) };
  });

/*
  Чужое — 404, как отсутствующее; повторное «прочитать» ничего не меняет и не ошибка
*/
export const readNotificationAction = actionAuthClient
  .inputSchema(notificationReadDto)
  .action(async ({ parsedInput: { id }, ctx: { auth } }) => {
    const own = and(eq(notifications.id, id), eq(notifications.userId, auth.id));

    if(!db.select({ id: notifications.id }).from(notifications).where(own).get()){
      actionError(404, 'Уведомление не найдено');
    }

    db.update(notifications).set({ readAt: new Date() }).where(and(own, isNull(notifications.readAt))).run();

    return publishRead(auth.id, id);
  });

export const readAllNotificationsAction = actionAuthClient
  .action(async ({ ctx: { auth } }) => {
    db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, auth.id), isNull(notifications.readAt))).run();

    return publishRead(auth.id, null);
  });

// Другие вкладки того же человека синхронизируют счётчик
function publishRead(userId: number, id: number | null){
  const unread = countUnread(userId);
  liveBus.publish(userId, 'notification.read', { id, unread });

  return { unread };
}
