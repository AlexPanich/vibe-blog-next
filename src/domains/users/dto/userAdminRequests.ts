import z from "zod";
import { USER_ROLES } from "@/database/schema";

/*
  expected — роли, которые admin видел на странице: если в БД уже другие, изменение
  отклоняется, а не перезаписывает чужое решение
*/
export const userRolesDto = z.object({
  roles: z.array(z.enum(USER_ROLES)),
  expected: z.array(z.enum(USER_ROLES))
})

export type UserRolesDto = z.infer<typeof userRolesDto>

export const userBanDto = z.object({
  comment: z.string().trim().min(1, 'Укажите причину блокировки').max(2000)
})

export type UserBanDto = z.infer<typeof userBanDto>

export const userUnbanDto = z.object({
  comment: z.string().trim().max(2000)
})

export type UserUnbanDto = z.infer<typeof userUnbanDto>

/*
  expected — ключ аватара, который admin видел: пользователь мог уже сменить картинку
*/
export const userRemoveAvatarDto = z.object({
  comment: z.string().trim().max(500),
  expected: z.string()
})

/*
  Фильтр списка пользователей из searchParams (спека 42, шаг 18): вкладка и номер страницы.
  Мусор в URL — значение по умолчанию, а не 404. Вкладки по ролям и поиск — спека 44
*/
export const userAdminFilterDto = z.object({
  filter: z.enum([ 'banned' ]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type UserAdminFilterDto = z.infer<typeof userAdminFilterDto>

export const aiIdSchema = z.int().positive();
