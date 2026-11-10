import z from "zod"
import { authorResource } from "@/domains/users/exports/userResources"
import { tagResource } from "@/domains/tags/exports/tagResources"
import { POST_OWNER_TRANSITIONS } from "@/domains/posts/shared/postStatuses"
import { POST_REPORT_REASONS, POST_REPORT_RESOLUTIONS, POST_STATUSES, POST_TYPES } from "@/database/schema"

export const postRatingResource = z.object({
  average: z.number().nullable(),
  count: z.number()
})

export type PostRatingResource = z.infer<typeof postRatingResource>

/*
  Тип поста и его поля — как в колонках: чужие для типа поля null
*/
export const postDetailsResource = z.object({
  type: z.enum(POST_TYPES),
  source: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  // Дней в пути (спека 37), только у travel
  travelDays: z.number().nullable()
})

export type PostDetailsResource = z.infer<typeof postDetailsResource>

/*
  Точка маршрута путешествия (спека 37), по порядку
*/
export const routePointResource = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().nullable()
})

export type RoutePointResource = z.infer<typeof routePointResource>

export const routePointsResource = z.array(routePointResource);

export type RoutePointsResource = z.infer<typeof routePointsResource>

export const postCoverResource = z.object({
  fileKey: z.string(),
  width: z.number(),
  height: z.number()
})

export type PostCoverResource = z.infer<typeof postCoverResource>

/*
  Картинка галереи; commentsCount — для значка на превью
*/
export const postImageResource = postCoverResource.extend({
  id: z.number(),
  caption: z.string().nullable(),
  commentsCount: z.number()
})

export type PostImageResource = z.infer<typeof postImageResource>

export const postGalleryResource = z.array(postImageResource);

export type PostGalleryResource = z.infer<typeof postGalleryResource>

export const postResource = z.object({
  id: z.number(),
  // Ссылка на профиль автора
  userId: z.number(),
  title: z.string(),
  createdAt: z.date(),
  // null — пост ещё не публиковался (избранное может пережить уход в черновик)
  publishedAt: z.date().nullable(),
  author: authorResource,
  tags: z.array(tagResource),
  rating: postRatingResource,
  cover: postCoverResource.nullable(),
  // Считаются при выдаче (postCards.withCardData), не хранятся; excerpt — lead или выдержка из текста
  excerpt: z.string(),
  readingMinutes: z.number(),
  commentsCount: z.number(),
  // Длина маршрута по прямой, км; null — не travel или одна точка
  routeKm: z.number().nullable(),
  ...postDetailsResource.shape
})

export type PostResource = z.infer<typeof postResource>

export const postListResource = z.array(postResource);

export type PostListResource = z.infer<typeof postListResource>

/*
  Избранное в кабинете: карточка и когда её отложили
*/
export const postFavoriteListResource = z.array(z.object({
  addedAt: z.date(),
  post: postResource
}));

export type PostFavoriteListResource = z.infer<typeof postFavoriteListResource>

/*
  Ссылка на пост в таблице постов автора
*/
export const postLinkResource = z.object({
  id: z.number()
})

export type PostLinkResource = z.infer<typeof postLinkResource>

/*
  Ссылка на пост в кабинете из таблицы постов автора (видна только самому автору)
*/
export const postEditLinkResource = z.object({
  id: z.number(),
  userId: z.number()
})

export type PostEditLinkResource = z.infer<typeof postEditLinkResource>

export const postOfficeResource = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  lead: z.string().nullable(),
  content: z.string(),
  tagIds: z.array(z.number()),
  // Последнее сохранение содержимого — «Сохранено …» в редакторе (спека 49)
  updatedAt: z.date(),
  points: routePointsResource,
  ...postDetailsResource.shape
})

/*
  Кнопки переходов автора на странице поста в кабинете
*/
export const postTransitionsResource = z.object({
  id: z.number(),
  transitions: z.array(z.enum(POST_OWNER_TRANSITIONS))
})

export type PostTransitionsResource = z.infer<typeof postTransitionsResource>

/*
  Форма решения модератора
*/
export const postModerateResource = z.object({
  id: z.number()
})

export type PostModerateResource = z.infer<typeof postModerateResource>

/*
  Авторы для фильтра ленты
*/
export const feedAuthorsResource = z.array(z.object({
  id: z.number(),
  name: z.string()
}))

export type FeedAuthorsResource = z.infer<typeof feedAuthorsResource>

/*
  Блок оценки на странице поста: своя оценка грузится на клиенте
*/
export const postRatingBlockResource = z.object({
  id: z.number(),
  userId: z.number(),
  rating: postRatingResource
})

export type PostRatingBlockResource = z.infer<typeof postRatingBlockResource>

// Кнопка «Пожаловаться» для вошедшего (спека 36): ещё не жаловался, ждёт разбора, разобрана
export type PostReportState = 'none' | 'sent' | 'resolved'

/*
  Карточка жалоб на пост (спека 36): все жалобы на пост одной группой — в открытых одна
  карточка на пост, в рассмотренных — пост и момент разбора. by — имя закрывшего, у withdrawn
  его нет
*/
export const postReportRowResource = z.object({
  postId: z.number(),
  title: z.string(),
  status: z.enum(POST_STATUSES),
  author: z.object({ id: z.number(), name: z.string(), avatarKey: z.string().nullable() }),
  reporters: z.array(z.object({
    id: z.number(),
    name: z.string(),
    reason: z.enum(POST_REPORT_REASONS),
    comment: z.string().nullable(),
    at: z.date()
  })),
  firstAt: z.date(),
  lastAt: z.date(),
  resolution: z.object({
    kind: z.enum(POST_REPORT_RESOLUTIONS),
    by: z.string().nullable(),
    at: z.date()
  }).nullable()
})

export type PostReportRowResource = z.infer<typeof postReportRowResource>

export const postReportListResource = z.array(postReportRowResource);

export type PostReportListResource = z.infer<typeof postReportListResource>
