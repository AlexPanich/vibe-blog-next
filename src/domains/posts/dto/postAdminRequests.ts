import z from "zod";
import { POST_STATUSES } from "@/database/schema";

/*
  Фильтр списка постов в админке, из searchParams: неизвестный статус — без фильтра
*/
export const postAdminFilterDto = z.object({
  status: z.enum(POST_STATUSES).optional().catch(undefined)
})

export type PostAdminFilterDto = z.infer<typeof postAdminFilterDto>
