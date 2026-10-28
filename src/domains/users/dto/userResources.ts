import z from "zod"
import { AUTHOR_REQUEST_STATUSES, USER_ROLES } from "@/database/schema"

export const authorResource = z.object({
  name: z.string(),
  avatarKey: z.string().nullable(),
  createdAt: z.date()
})

/*
  Карточка на странице авторов: число опубликованных постов
*/
export const authorCardResource = authorResource.extend({
  id: z.number(),
  postsCount: z.number(),
  // Взвешенная средняя по опубликованным постам; null — оценок нет
  ratingAverage: z.number().nullable()
})

export type AuthorCardResource = z.infer<typeof authorCardResource>

export type AuthorResource = z.infer<typeof authorResource>

/*
  Свой аккаунт в админке
*/
export const authUserResource = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),
  email: z.string()
})

export type AuthUserResource = z.infer<typeof authUserResource>
/*
  Форма ролей на странице пользователя в админке
*/
export const userRolesFormResource = z.object({
  id: z.number(),
  roles: z.array(z.enum(USER_ROLES))
})

export type UserRolesFormResource = z.infer<typeof userRolesFormResource>

/*
  Форма бана и разбана
*/
export const userBanFormResource = z.object({
  id: z.number()
})

export type UserBanFormResource = z.infer<typeof userBanFormResource>

/*
  Строка списков подписок в кабинете: following — подписан ли я, friend — подписка взаимная
*/
export const userFollowRowResource = z.object({
  id: z.number(),
  name: z.string(),
  avatarKey: z.string().nullable(),
  following: z.boolean(),
  friend: z.boolean()
})

export type UserFollowRowResource = z.infer<typeof userFollowRowResource>

// Строка «Заблокированных» (спека 26)
export const userBlockRowResource = z.object({
  id: z.number(),
  name: z.string(),
  avatarKey: z.string().nullable()
})

export type UserBlockRowResource = z.infer<typeof userBlockRowResource>

/*
  Строка заявки на роль автора в админке (спека 28): заявитель с тем, по чему решают, —
  дата регистрации и число комментариев; у рассмотренной — решение
*/
export const authorRequestRowResource = z.object({
  id: z.number(),
  text: z.string(),
  status: z.enum(AUTHOR_REQUEST_STATUSES),
  reason: z.string().nullable(),
  createdAt: z.date(),
  decidedAt: z.date().nullable(),
  deciderName: z.string().nullable(),
  user: z.object({
    id: z.number(),
    name: z.string(),
    avatarKey: z.string().nullable(),
    createdAt: z.date(),
    banned: z.boolean(),
    commentsCount: z.number()
  })
})

export type AuthorRequestRowResource = z.infer<typeof authorRequestRowResource>
