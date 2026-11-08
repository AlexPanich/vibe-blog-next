import z from "zod";
import { NOTIFICATION_TYPES } from "@/database/schema";

/*
  Строка панели. Текст и ссылка посчитаны на сервере для получателя; unavailable — пост
  есть, но получателю сейчас недоступен. type — тосту: для личных сообщений свой тост.
  createdAt — coerce: из SSE дата приходит строкой
*/
export const notificationItemResource = z.object({
  id: z.number(),
  type: z.enum(NOTIFICATION_TYPES),
  actor: z.object({
    name: z.string(),
    avatarKey: z.string().nullable()
  }).nullable(),
  text: z.string(),
  href: z.string().nullable(),
  unavailable: z.boolean(),
  read: z.boolean(),
  createdAt: z.coerce.date()
})

export type NotificationItemResource = z.infer<typeof notificationItemResource>

// Первая порция истории (office/notifications) и число непрочитанных для подзаголовка
export const notificationPageResource = z.object({
  items: z.array(notificationItemResource),
  hasMore: z.boolean(),
  unread: z.number()
})

export type NotificationPageResource = z.infer<typeof notificationPageResource>
