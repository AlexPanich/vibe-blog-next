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

export const OFFICE_COMMENT_TABS = [ 'received', 'mine' ] as const;

export type OfficeCommentTab = typeof OFFICE_COMMENT_TABS[number]

// Порция вкладки кабинета: строки старше beforeId
export const officeCommentsPageDto = z.object({
  tab: z.enum(OFFICE_COMMENT_TABS),
  beforeId: z.int().positive()
})

export type OfficeCommentsPageDto = z.infer<typeof officeCommentsPageDto>

export const COMMENT_REPORT_TABS = [ 'open', 'resolved' ] as const;

export type CommentReportTab = typeof COMMENT_REPORT_TABS[number]

// Очередь жалоб: ?tab=resolved&page=N; мусор в url — первая страница открытых
export const commentReportFilterDto = z.object({
  tab: z.enum(COMMENT_REPORT_TABS).catch('open').default('open'),
  page: z.coerce.number().int().positive().catch(1).default(1)
})

export type CommentReportFilterDto = z.infer<typeof commentReportFilterDto>
