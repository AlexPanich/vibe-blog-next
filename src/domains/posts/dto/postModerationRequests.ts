import z from "zod";
import type { PostStatus } from "@/database/schema";

export const postApproveDto = z.object({
  comment: z.string().trim().max(2000)
})

export type PostApproveDto = z.infer<typeof postApproveDto>

export const postRejectDto = z.object({
  comment: z.string().trim().min(1, 'При отклонении комментарий обязателен').max(2000)
})

export type PostRejectDto = z.infer<typeof postRejectDto>

export const postBlockDto = z.object({
  comment: z.string().trim().min(1, 'Укажите причину блокировки').max(2000)
})

export type PostBlockDto = z.infer<typeof postBlockDto>

export const postUnblockDto = z.object({
  comment: z.string().trim().max(2000)
})

export type PostUnblockDto = z.infer<typeof postUnblockDto>

export const POST_MODERATION_TABS = [ 'moderating', 'published', 'hidden', 'blocked' ] as const satisfies PostStatus[];

/*
  Вкладка модерации из searchParams: неизвестный статус — очередь
*/
export const postModerationFilterDto = z.object({
  status: z.enum(POST_MODERATION_TABS).catch('moderating')
})

export type PostModerationFilterDto = z.infer<typeof postModerationFilterDto>
