import z from "zod";
import { COMMENT_STATES } from "@/domains/comments/shared/commentState";
import { COMMENT_REPORT_RESOLUTIONS } from "@/database/schema";

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
  Карточка жалоб (спека 18, вид — спека 42): жалобы на один комментарий — одна карточка со
  списком жалобщиков. У родителя текст только видимого — модератору нужен контекст, а не
  скрытое. Рассмотренные — та же карточка с итогом; у удалённого автором текста нет.
  author.ban — действующий бан автора сейчас (until null — навсегда), истёкший — null
*/
export const commentReportRowResource = z.object({
  commentId: z.number(),
  postId: z.number(),
  postTitle: z.string(),
  imageId: z.number().nullable(),
  content: z.string().nullable(),
  author: z.object({
    id: z.number(),
    name: z.string(),
    avatarKey: z.string().nullable(),
    ban: z.object({ until: z.date().nullable() }).nullable()
  }),
  parent: z.object({
    authorName: z.string(),
    state: z.enum(COMMENT_STATES),
    excerpt: z.string()
  }).nullable(),
  reporters: z.array(z.object({ id: z.number(), name: z.string() })),
  firstAt: z.date(),
  lastAt: z.date(),
  resolution: z.object({
    kind: z.enum(COMMENT_REPORT_RESOLUTIONS),
    by: z.string().nullable(),
    at: z.date()
  }).nullable()
})

export type CommentReportRowResource = z.infer<typeof commentReportRowResource>

export const commentReportListResource = z.array(commentReportRowResource);

export type CommentReportListResource = z.infer<typeof commentReportListResource>

/*
  Карточка комментария в кабинете (спека 23, вид — спека 42): вкладки «Мои» и «К моим постам».
  У чужого скрытого текста и причины нет — только пометка; своему скрытому приходят оба
*/
export const officeCommentResource = z.object({
  id: z.number(),
  content: z.string().nullable(),
  hidden: z.boolean(),
  hideReason: z.string().nullable(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  editedByModerator: z.boolean(),
  href: z.string(),
  canReply: z.boolean(),
  onImage: z.boolean(),
  postTitle: z.string(),
  author: z.object({ name: z.string(), avatarKey: z.string().nullable() })
})

export type OfficeCommentResource = z.infer<typeof officeCommentResource>

export const officeCommentListResource = z.array(officeCommentResource);

export type OfficeCommentListResource = z.infer<typeof officeCommentListResource>
