'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { liveBus } from "@/globals/liveBus";
import { notifications } from "@/database/schema";
import { notificationPageDto, notificationReadAllDto, notificationReadDto } from "@/domains/notifications/dto/notificationRequests";
import { countUnread, countUnreadByTab, loadNotificationPage } from "@/domains/notifications/shared/loadNotifications";
import { notificationTypesOf, type NotificationTab } from "@/domains/notifications/shared/notificationTabs";
import { and, eq, inArray, isNull } from "drizzle-orm";

export const loadNotificationsAction = actionAuthClient
  .inputSchema(notificationPageDto)
  .action(async ({ parsedInput: { beforeId, unreadOnly, tab }, ctx: { auth } }) => {
    // tab=moderation у не-staff не проверяется: это его же уведомления, фильтр чужого не открывает
    return loadNotificationPage(auth.id, { beforeId, unreadOnly, tab });
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

    return publishRead(auth.id, id, null);
  });

// На вкладке истории — только её уведомления (спека 44), без tab — все
export const readAllNotificationsAction = actionAuthClient
  .inputSchema(notificationReadAllDto)
  .action(async ({ parsedInput: { tab }, ctx: { auth } }) => {
    db.update(notifications).set({ readAt: new Date() }).where(and(
      eq(notifications.userId, auth.id),
      isNull(notifications.readAt),
      tab ? inArray(notifications.type, notificationTypesOf(tab)) : undefined
    )).run();

    return publishRead(auth.id, null, tab ?? null);
  });

// Другие вкладки того же человека синхронизируют счётчик и числа вкладок истории
function publishRead(userId: number, id: number | null, tab: NotificationTab | null){
  const unread = countUnread(userId);
  const unreadTabs = countUnreadByTab(userId);
  liveBus.publish(userId, 'notification.read', { id, tab, unread, unreadTabs });

  return { unread, unreadTabs };
}
