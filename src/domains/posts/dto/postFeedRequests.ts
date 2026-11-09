import z from "zod";
import { POST_TYPES } from "@/database/schema";

export const FEED_PAGE = 20;

export const FEED_MAX_LIMIT = 200;

export const FEED_SORTS = [ 'new', 'popular', 'discussed', 'old', 'author' ] as const;

export const FEED_PERIODS = [ 'all', 'week', 'month', 'year' ] as const;

/*
  Условия ленты из searchParams. У каждого поля свой catch: битое значение не роняет
  остальные, а битая ссылка открывает ленту
*/
export const postFeedFilterDto = z.object({
  search: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  type: z.enum(POST_TYPES).optional().catch(undefined),
  // Старые ссылки «Лучших» (sort=rating) открывают «Популярные» (спека 34, п. 6)
  sort: z.preprocess(v => v === 'rating' ? 'popular' : v, z.enum(FEED_SORTS)).catch('new').default('new'),
  author: z.coerce.number().int().positive().optional().catch(undefined),
  // Без периода действует умолчание сортировки — shared/feedPeriod.ts
  period: z.enum(FEED_PERIODS).optional().catch(undefined),
  // «Моя лента» в кабинете: ставит страница, в URL его нет (?follow= отбрасывается)
  follow: z.boolean().optional().catch(undefined),
  // ?tag=a&tag=b приходит массивом, ?tag=a — строкой
  tag: z.union([ z.string(), z.array(z.string()) ])
    .optional()
    .transform(v => v === undefined ? [] : [ ...new Set(Array.isArray(v) ? v : [ v ]) ])
    .catch([]),
  // Сколько уже загружено: кратно порции, не больше потолка — ссылкой не запросить всё
  limit: z.coerce.number().int()
    .transform(n => Math.min(FEED_MAX_LIMIT, Math.max(FEED_PAGE, Math.ceil(n / FEED_PAGE) * FEED_PAGE)))
    .catch(FEED_PAGE)
    .default(FEED_PAGE)
})

export type PostFeedFilterDto = z.infer<typeof postFeedFilterDto>

/*
  Догрузка порции: те же условия, что в URL, плюс смещение
*/
export const postFeedPageDto = z.object({
  filter: postFeedFilterDto.omit({ limit: true }),
  offset: z.int().min(0)
})

export type PostFeedPageDto = z.infer<typeof postFeedPageDto>
