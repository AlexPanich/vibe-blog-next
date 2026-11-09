import 'server-only';
import { db } from "@/globals/db";
import { posts, users } from "@/database/schema";
import type { UserAdminFilterDto } from "@/domains/users/dto/userAdminRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { banActiveSql } from "@/shared/userBan";
import { count, desc, eq, like, sql } from "drizzle-orm";

export const ADMIN_USERS_PAGE = 20;

/*
  «Пользователи» в админке (спека 42, шаг 18): страница пользователей вкладки с числом
  постов, числа для вкладок и подзаголовка. Страница за пределами списка прижимается к
  последней. «Заблокированные» — только с действующим баном (спека 46), now один на вызов
*/
export async function loadAdminUsers(filter: UserAdminFilterDto){
  const now = new Date();
  const counts = countUsers(now);
  const listed = filter.filter === 'banned' ? counts.banned : counts.total;
  const pages = Math.max(1, Math.ceil(listed / ADMIN_USERS_PAGE));
  const page = Math.min(filter.page, pages);

  // Join, а не подзапрос: в подзапросе drizzle пишет колонки без таблицы, и "id" уходит к posts
  const rows = listed === 0 ? [] : db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    emailVerified: users.emailVerified,
    avatarKey: users.avatarKey,
    roles: users.roles,
    bannedAt: users.bannedAt,
    bannedUntil: users.bannedUntil,
    createdAt: users.createdAt,
    postsCount: count(posts.id),
  })
    .from(users)
    .leftJoin(posts, eq(posts.userId, users.id))
    .where(filter.filter === 'banned' ? banActiveSql(now) : undefined)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(ADMIN_USERS_PAGE)
    .offset((page - 1) * ADMIN_USERS_PAGE)
    .all();

  return {
    rows: rows.map(row => ({ ...row, roles: parseRoles(row.roles) })),
    counts,
    page,
    pages,
  };
}

export type AdminUserRow = Awaited<ReturnType<typeof loadAdminUsers>>['rows'][number];

/*
  Роли хранятся JSON-строкой с латинскими именами (serializeRoles), поэтому LIKE по
  '"author"' безопасен: кириллицы и регистра в нём нет
*/
function countUsers(now: Date){
  const [ row ] = db.select({
    total: count(),
    banned: sql<number>`count(case when ${banActiveSql(now)} then 1 end)`,
    authors: sql<number>`count(case when ${like(users.roles, '%"author"%')} then 1 end)`,
    moderators: sql<number>`count(case when ${like(users.roles, '%"moderator"%')} then 1 end)`,
  })
    .from(users)
    .all();

  return row;
}
