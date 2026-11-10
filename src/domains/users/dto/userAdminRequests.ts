import z from "zod";
import { USER_ROLES } from "@/database/schema";
import { BAN_TERM_KEYS, DEFAULT_BAN_TERM } from "@/domains/users/shared/banTerms";

/*
  expected — роли, которые admin видел на странице: если в БД уже другие, изменение
  отклоняется, а не перезаписывает чужое решение
*/
export const userRolesDto = z.object({
  roles: z.array(z.enum(USER_ROLES)),
  expected: z.array(z.enum(USER_ROLES))
})

export type UserRolesDto = z.infer<typeof userRolesDto>

// term — ключ срока (спека 46), сам момент окончания считает action
export const userBanDto = z.object({
  comment: z.string().trim().min(1, 'Укажите причину блокировки').max(2000),
  term: z.enum(BAN_TERM_KEYS).default(DEFAULT_BAN_TERM)
})

export type UserBanDto = z.infer<typeof userBanDto>

export const userUnbanDto = z.object({
  comment: z.string().trim().max(2000)
})

export type UserUnbanDto = z.infer<typeof userUnbanDto>

/*
  Удаление аватара или обложки. expected — ключ картинки, который admin видел:
  пользователь мог уже сменить её
*/
export const userRemoveImageDto = z.object({
  comment: z.string().trim().max(500),
  expected: z.string()
})

// Вкладки «Пользователей» кроме «Все» (спека 44): роль или действующий бан
export const ADMIN_USER_TABS = [ 'author', 'moderator', 'banned' ] as const;

export type AdminUserTab = (typeof ADMIN_USER_TABS)[number];

/*
  Фильтр списка пользователей из searchParams (спеки 42, 44): вкладка, поиск по имени или
  email и номер страницы. Мусор в URL — значение по умолчанию, а не 404
*/
export const userAdminFilterDto = z.object({
  role: z.enum(ADMIN_USER_TABS).optional().catch(undefined),
  q: z.string().trim().max(100).optional().transform(v => v || undefined).catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type UserAdminFilterDto = z.infer<typeof userAdminFilterDto>

export const aiIdSchema = z.int().positive();
