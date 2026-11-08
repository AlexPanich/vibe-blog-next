import z from "zod";
import { POST_STATUSES } from "@/database/schema";

/*
  Фильтр «Моих постов» из searchParams (спека 42, шаг 3): вкладка статуса, поиск по
  заголовку, номер страницы. Мусор в URL — значение по умолчанию, а не 404
*/
export const myPostsFilterDto = z.object({
  status: z.enum(POST_STATUSES).optional().catch(undefined),
  q: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type MyPostsFilterDto = z.infer<typeof myPostsFilterDto>
