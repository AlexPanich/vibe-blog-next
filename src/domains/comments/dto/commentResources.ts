import z from "zod";
import { COMMENT_STATES } from "@/domains/comments/shared/commentState";

/*
  Комментарий для всех: у скрытого и удалённого текста нет — он не должен попасть в HTML
*/
export const commentResource = z.object({
  id: z.number(),
  parentId: z.number().nullable(),
  userId: z.number(),
  authorName: z.string(),
  authorAvatarKey: z.string().nullable(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  // Последнюю правку сделал модератор (спека 24) — кто именно, не показываем
  editedByModerator: z.boolean(),
  state: z.enum(COMMENT_STATES),
  content: z.string(),
  likes: z.number(),
  dislikes: z.number()
})

export type CommentResource = z.infer<typeof commentResource>

export const commentListResource = z.array(commentResource);

export type CommentListResource = z.infer<typeof commentListResource>

/*
  «Своё» после гидрации: реакции, текст и причина своих скрытых (модератору — все скрытые),
  свои жалобы. Блокировки (спека 26): blocking — кого я заблокировал (их комментарии у меня
  скрыты), blockedWith — с кем блокировка в любую сторону (не ответить, не отреагировать)
*/
export type CommentViewer = {
  myReactions: Record<number, 1 | -1>,
  hidden: Record<number, { content: string, reason: string }>,
  reports: Record<number, CommentReportState>,
  blocking: number[],
  blockedWith: number[]
}

export type CommentReportState = 'sent' | 'resolved'

/*
  Строка очереди жалоб: жалобы на один комментарий — одна строка со списком жалобщиков.
  У родителя текст только видимого — модератору нужен контекст, а не скрытое
*/
export const commentReportRowResource = z.object({
  commentId: z.number(),
  postId: z.number(),
  postTitle: z.string(),
  imageId: z.number().nullable(),
  content: z.string(),
  author: z.object({ id: z.number(), name: z.string(), avatarKey: z.string().nullable() }),
  parent: z.object({
    authorName: z.string(),
    state: z.enum(COMMENT_STATES),
    excerpt: z.string()
  }).nullable(),
  reporters: z.array(z.object({ id: z.number(), name: z.string() })),
  firstAt: z.date(),
  lastAt: z.date()
})

export type CommentReportRowResource = z.infer<typeof commentReportRowResource>

export const commentReportListResource = z.array(commentReportRowResource);

export type CommentReportListResource = z.infer<typeof commentReportListResource>

/*
  Строка «К моим постам» в кабинете (спека 23). У скрытого текста нет — только заглушка
*/
export const receivedCommentResource = z.object({
  id: z.number(),
  content: z.string().nullable(),
  hidden: z.boolean(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  editedByModerator: z.boolean(),
  href: z.string(),
  canReply: z.boolean(),
  onImage: z.boolean(),
  postTitle: z.string(),
  author: z.object({ name: z.string(), avatarKey: z.string().nullable() })
})

export type ReceivedCommentResource = z.infer<typeof receivedCommentResource>

export const receivedCommentListResource = z.array(receivedCommentResource);

export type ReceivedCommentListResource = z.infer<typeof receivedCommentListResource>
