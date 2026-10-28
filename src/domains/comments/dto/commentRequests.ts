import z from "zod";

export const aiIdSchema = z.int().positive();

export const COMMENT_MAX = 2000;

export const commentDto = z.object({
  content: z.string().trim().min(1, 'Напишите текст').max(COMMENT_MAX, `Не больше ${COMMENT_MAX} символов`)
})

export type CommentDto = z.infer<typeof commentDto>

export const commentCreateDto = commentDto.extend({
  parentId: z.int().positive().optional()
})

export type CommentCreateDto = z.infer<typeof commentCreateDto>

export const commentHideDto = z.object({
  reason: z.string().trim().min(1, 'Укажите причину').max(500)
})

export type CommentHideDto = z.infer<typeof commentHideDto>

// 0 — снять свою реакцию
export const commentReactDto = z.object({
  value: z.union([ z.literal(1), z.literal(-1), z.literal(0) ])
})

export type CommentReactDto = z.infer<typeof commentReactDto>

// Порция «К моим постам»: строки старше beforeId
export const receivedCommentsPageDto = z.object({
  beforeId: z.int().positive()
})

export type ReceivedCommentsPageDto = z.infer<typeof receivedCommentsPageDto>
