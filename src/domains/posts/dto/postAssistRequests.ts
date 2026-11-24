import z from "zod";
import { POST_TYPES } from "@/database/schema";
import { TAGS_PER_POST } from "@/domains/tags/exports/tagRequests";
import { POST_LEAD_MAX, POST_ROUTE_MAX, POST_SOURCE_MAX, POST_TITLE_MAX, ROUTE_LABEL_MAX } from "@/domains/posts/dto/postRequests";

/*
  Вход помощника автора (спека 55, п. 2) — текущее состояние формы, не сохранённый пост.
  title и lead могут быть пустыми: помощник их и предлагает. Длину и минимум content проверяет
  action (реш. 5 плана): ошибка нужна одним serverError. points — только для отсева дублей
  маршрута, в модель не уходят
*/
export const postAssistDto = z.object({
  type: z.enum(POST_TYPES),
  title: z.string().max(POST_TITLE_MAX),
  lead: z.string().max(POST_LEAD_MAX),
  content: z.string(),
  source: z.string().max(POST_SOURCE_MAX),
  tagIds: z.array(z.int().positive()).max(TAGS_PER_POST),
  points: z.array(z.object({ lat: z.number(), lng: z.number(), label: z.string().max(ROUTE_LABEL_MAX) })).max(POST_ROUTE_MAX)
})

export type PostAssistDto = z.infer<typeof postAssistDto>
