import z from "zod";
import { POST_REPORT_REASONS } from "@/database/schema";

export const POST_REPORT_COMMENT_MAX = 500;

// Жалоба на пост (спека 36): для «Другое» комментарий обязателен, пустой — null
export const postReportDto = z.object({
  reason: z.enum(POST_REPORT_REASONS, 'Выберите причину'),
  comment: z.string()
    .trim()
    .max(POST_REPORT_COMMENT_MAX, `Не больше ${POST_REPORT_COMMENT_MAX} символов`)
    .transform(v => v === '' ? null : v)
})
  .superRefine((value, ctx) => {
    if(value.reason === 'other' && value.comment === null){
      ctx.addIssue({ code: 'custom', path: [ 'comment' ], message: 'Опишите, что не так' });
    }
  });

export type PostReportDto = z.input<typeof postReportDto>

export const POST_REPORT_TABS = [ 'open', 'resolved' ] as const;

export type PostReportTab = typeof POST_REPORT_TABS[number]

// Очередь жалоб на посты: ?tab=resolved&page=N; мусор в url — первая страница открытых
export const postReportFilterDto = z.object({
  tab: z.enum(POST_REPORT_TABS).catch('open').default('open'),
  page: z.coerce.number().int().positive().catch(1).default(1)
})

export type PostReportFilterDto = z.infer<typeof postReportFilterDto>
