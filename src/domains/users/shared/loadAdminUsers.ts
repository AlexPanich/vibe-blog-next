import 'server-only';
import { db } from "@/globals/db";
import { posts, users } from "@/database/schema";
import type { AdminUserTab, UserAdminFilterDto } from "@/domains/users/dto/userAdminRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { banActiveSql } from "@/shared/userBan";
import { textLike } from "@/shared/textLike";
import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";

export const ADMIN_USERS_PAGE = 20;

/*
  «Пользователи» в админке (спеки 42, 44): страница пользователей вкладки и поиска с числом
  постов, числа для вкладок (с учётом поиска) и для подзаголовка (без него). Страница за
  пределами списка прижимается к последней. «Заблокированные» — только с действующим
  баном (спека 46), now один на вызов
*/
export async function loadAdminUsers(filter: UserAdminFilterDto){
  const now = new Date();
  const search = filter.q ? or(textLike(users.name, filter.q), textLike(users.email, filter.q)) : undefined;
  const all = countUsers(now, undefined);
  const found = search ? countUsers(now, search) : all;
  const listed = listedCount(found, filter.role);
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
    .where(and(search, tabWhere(filter.role, now)))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(ADMIN_USERS_PAGE)
    .offset((page - 1) * ADMIN_USERS_PAGE)
    .all();

  return {
    rows: rows.map(row => ({ ...row, roles: parseRoles(row.roles) })),
    all,
    found,
    page,
    pages,
  };
}

export type AdminUserRow = Awaited<ReturnType<typeof loadAdminUsers>>['rows'][number];

/*
  Роли хранятся JSON-строкой с латинскими именами (serializeRoles), поэтому LIKE по
  '"author"' безопасен: кириллицы и регистра в нём нет
*/
function countUsers(now: Date, where: SQL | undefined){
  const [ row ] = db.select({
    total: count(),
    banned: sql<number>`count(case when ${banActiveSql(now)} then 1 end)`,
    authors: sql<number>`count(case when ${tabWhere('author', now)} then 1 end)`,
    moderators: sql<number>`count(case when ${tabWhere('moderator', now)} then 1 end)`,
  })
    .from(users)
    .where(where)
    .all();

  return row;
}

// «Заблокированные» — только banActiveSql (спека 44, реш. 15): голая проверка bannedAt захватила бы истёкшие
function tabWhere(role: AdminUserTab | undefined, now: Date){
  if(role === 'author'){
    return like(users.roles, '%"author"%');
  }
  else if(role === 'moderator'){
    return like(users.roles, '%"moderator"%');
  }
  else if(role === 'banned'){
    return banActiveSql(now);
  }
  else{
    return undefined;
  }
}

function listedCount(counts: ReturnType<typeof countUsers>, role: AdminUserTab | undefined){
  if(role === 'author'){
    return counts.authors;
  }
  else if(role === 'moderator'){
    return counts.moderators;
  }
  else if(role === 'banned'){
    return counts.banned;
  }
  else{
    return counts.total;
  }
}
