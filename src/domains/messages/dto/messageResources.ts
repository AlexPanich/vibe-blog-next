import z from "zod";

/*
  createdAt — coerce: из SSE дата приходит строкой
*/
export const messageItemResource = z.object({
  id: z.number(),
  userId: z.number(),
  content: z.string(),
  createdAt: z.coerce.date()
})

export type MessageItemResource = z.infer<typeof messageItemResource>

export const messagePeerResource = z.object({
  id: z.number(),
  name: z.string(),
  avatarKey: z.string().nullable()
})

export type MessagePeerResource = z.infer<typeof messagePeerResource>

/*
  Строка списка: собеседник, обрезок последнего сообщения, непрочитанные входящие
*/
export const dialogRowResource = z.object({
  id: z.number(),
  peer: messagePeerResource,
  lastMessage: z.object({
    content: z.string(),
    mine: z.boolean()
  }).nullable(),
  lastMessageAt: z.coerce.date(),
  unread: z.number()
})

export type DialogRowResource = z.infer<typeof dialogRowResource>

/*
  Диалог целиком для страницы: blockReason — почему писать нельзя (вместо поля ввода),
  restricted — я запретил собеседнику писать, ignored — переписка скрыта из моего списка
*/
export const dialogViewResource = z.object({
  id: z.number().nullable(),
  meId: z.number(),
  peer: messagePeerResource,
  messages: z.array(messageItemResource),
  hasMore: z.boolean(),
  blockReason: z.string().nullable(),
  restricted: z.boolean(),
  ignored: z.boolean()
})

export type DialogViewResource = z.infer<typeof dialogViewResource>
