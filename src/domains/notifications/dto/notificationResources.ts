import z from "zod";
import { NOTIFICATION_TYPES } from "@/database/schema";

/*
  Строка панели. Текст и ссылка посчитаны на сервере для получателя; unavailable — пост
  есть, но получателю сейчас недоступен. type — тосту: для личных сообщений свой тост.
  inline — текст продолжает имя актора, без двоеточия. groupKey — строки с одним ключом
  заменяют друг друга (isReplacedBy); latest — текст свежего события группы для тоста, у
  одиночной строки null (спека 51). createdAt — coerce: из SSE дата приходит строкой
*/
export const notificationItemResource = z.object({
  id: z.number(),
  type: z.enum(NOTIFICATION_TYPES),
  actor: z.object({
    name: z.string(),
    avatarKey: z.string().nullable()
  }).nullable(),
  text: z.string(),
  inline: z.boolean(),
  groupKey: z.string().nullable(),
  latest: z.object({
    text: z.string(),
    inline: z.boolean()
  }).nullable(),
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
