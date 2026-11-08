import z from "zod"
import { USER_ROLES } from "@/database/schema"

export const authorResource = z.object({
  name: z.string(),
  avatarKey: z.string().nullable(),
  createdAt: z.date()
})

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
  Человек в списках «Подписок» (спека 42): «о себе», опубликованные посты и средняя оценка
  строкой («4,8»), null — оценок нет
*/
const followPersonResource = z.object({
  id: z.number(),
  name: z.string(),
  avatarKey: z.string().nullable(),
  bio: z.string().nullable(),
  postsCount: z.number(),
  rating: z.string().nullable()
})

/*
  Строка «Подписок» и «Подписчиков»: following — подписан ли я, friend — подписка взаимная
*/
export const userFollowRowResource = followPersonResource.extend({
  following: z.boolean(),
  friend: z.boolean()
})

export type UserFollowRowResource = z.infer<typeof userFollowRowResource>

export const userFollowRowListResource = z.array(userFollowRowResource)

export type UserFollowRowListResource = z.infer<typeof userFollowRowListResource>

// Строка «Заблокированных» (спека 26)
export const userBlockRowResource = followPersonResource

export type UserBlockRowResource = z.infer<typeof userBlockRowResource>
