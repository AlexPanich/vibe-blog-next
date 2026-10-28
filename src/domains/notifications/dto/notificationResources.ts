import z from "zod";

/*
  Строка панели. Текст и ссылка посчитаны на сервере для получателя; unavailable — пост
  есть, но получателю сейчас недоступен. createdAt — coerce: из SSE дата приходит строкой
*/
export const notificationItemResource = z.object({
  id: z.number(),
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
