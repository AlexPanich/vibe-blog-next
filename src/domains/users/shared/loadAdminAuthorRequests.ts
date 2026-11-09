import 'server-only';
import { db } from "@/globals/db";
import { authorRequests, comments, users } from "@/database/schema";
import type { AuthorRequestAdminFilterDto } from "@/domains/users/dto/authorRequestRequests";
import { parseRoles } from "@/domains/users/shared/userRoles";
import { isBanActive } from "@/shared/userBan";
import { asc, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

export const DECIDED_REQUESTS_PAGE = 20;

// «Недавно рассмотренные» под ожидающими — короткий хвост, остальное во вкладке
export const RECENT_DECIDED_REQUESTS = 5;

/*
  «Заявки в авторы» в админке (спека 42, шаг 20): числа для вкладок, ожидающие (все,
  давние сверху) и рассмотренные (свежие решения сверху). На вкладке «Ожидают» —
  последние RECENT_DECIDED_REQUESTS решений, на «Рассмотренных» — страница по
  DECIDED_REQUESTS_PAGE; страница за пределами списка прижимается к последней
*/
export async function loadAdminAuthorRequests(filter: AuthorRequestAdminFilterDto){
  const counts = countRequests();
  const pending = filter.tab === 'pending';
  const pages = Math.max(1, Math.ceil(counts.decided / DECIDED_REQUESTS_PAGE));
  const page = pending ? 1 : Math.min(filter.page, pages);

  const pendingRows = pending && counts.pending > 0
    ? selectRequests()
      .where(eq(authorRequests.status, 'pending'))
      .orderBy(asc(authorRequests.createdAt), asc(authorRequests.id))
      .all()
    : [];

  const decidedRows = counts.decided === 0 ? [] : selectRequests()
    .where(ne(authorRequests.status, 'pending'))
    .orderBy(desc(authorRequests.decidedAt), desc(authorRequests.id))
    .limit(pending ? RECENT_DECIDED_REQUESTS : DECIDED_REQUESTS_PAGE)
    .offset(pending ? 0 : (page - 1) * DECIDED_REQUESTS_PAGE)
    .all();

  return {
    pending: pendingRows.map(toRequest),
    decided: decidedRows.map(toRequest),
    counts,
    page,
    pages,
  };
}

export type AdminAuthorRequest = Awaited<ReturnType<typeof loadAdminAuthorRequests>>['pending'][number];

function countRequests(){
  const [ row ] = db.select({
    pending: sql<number>`count(case when ${authorRequests.status} = 'pending' then 1 end)`,
    decided: sql<number>`count(case when ${authorRequests.status} <> 'pending' then 1 end)`,
  })
    .from(authorRequests)
    .all();

  return row;
}

function selectRequests(){
  const decider = alias(users, 'decider');
  const commentsCount = db.select({ userId: comments.userId, n: count().as('n') })
    .from(comments)
    .where(isNull(comments.deletedAt))
    .groupBy(comments.userId)
    .as('comments_count');

  return db.select({
    id: authorRequests.id,
    text: authorRequests.text,
    status: authorRequests.status,
    reason: authorRequests.reason,
    createdAt: authorRequests.createdAt,
    decidedAt: authorRequests.decidedAt,
    deciderId: decider.id,
    deciderName: decider.name,
    userId: users.id,
    userName: users.name,
    userAvatarKey: users.avatarKey,
    userRoles: users.roles,
    userCreatedAt: users.createdAt,
    userBannedAt: users.bannedAt,
    userBannedUntil: users.bannedUntil,
    commentsCount: commentsCount.n,
  })
    .from(authorRequests)
    .innerJoin(users, eq(users.id, authorRequests.userId))
    .leftJoin(decider, eq(decider.id, authorRequests.decidedBy))
    .leftJoin(commentsCount, eq(commentsCount.userId, users.id))
    .$dynamic();
}

function toRequest(row: ReturnType<ReturnType<typeof selectRequests>['all']>[number]){
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    reason: row.reason,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
    decider: row.deciderId === null ? null : { id: row.deciderId, name: row.deciderName ?? '' },
    user: {
      id: row.userId,
      name: row.userName,
      avatarKey: row.userAvatarKey,
      roles: parseRoles(row.userRoles),
      createdAt: row.userCreatedAt,
      banned: isBanActive({ bannedAt: row.userBannedAt, bannedUntil: row.userBannedUntil }),
      commentsCount: row.commentsCount ?? 0,
    },
  };
}
