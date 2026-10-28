import z from "zod";
import { POST_TYPES } from "@/database/schema";

export const FEED_PAGE = 20;

export const FEED_MAX_LIMIT = 200;

export const FEED_SORTS = [ 'new', 'old', 'rating', 'author' ] as const;

export const FEED_PERIODS = [ 'week', 'month', 'year' ] as const;

// Лента подписок в кабинете: посты моих авторов, моих рубрик или и то и другое («И»)
export const FEED_FOLLOWS = [ 'authors', 'tags', 'both' ] as const;

export type FeedFollow = (typeof FEED_FOLLOWS)[number];

/*
  Условия ленты из searchParams. У каждого поля свой catch: битое значение не роняет
  остальные, а битая ссылка открывает ленту
*/
export const postFeedFilterDto = z.object({
  search: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  type: z.enum(POST_TYPES).optional().catch(undefined),
  sort: z.enum(FEED_SORTS).catch('new').default('new'),
  author: z.coerce.number().int().positive().optional().catch(undefined),
  period: z.enum(FEED_PERIODS).optional().catch(undefined),
  // Только в «Моей ленте»: публичная /posts его отбрасывает, кабинет подставляет authors
  follow: z.enum(FEED_FOLLOWS).optional().catch(undefined),
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
