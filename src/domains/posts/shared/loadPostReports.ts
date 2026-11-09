import 'server-only';
import { db } from "@/globals/db";
import { postReports, posts, users } from "@/database/schema";
import type { PostReportRowResource } from "@/domains/posts/dto/postResources";
import { and, asc, count, desc, eq, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

export const RESOLVED_POST_REPORTS_PER_PAGE = 20;

/*
  Открытые жалобы, сгруппированные по посту. Карточки идут по первой жалобе — дольше всех
  ждущие сверху
*/
export async function loadOpenPostReports(): Promise<PostReportRowResource[]> {
  return loadGroups(isNull(postReports.resolvedAt), 'open');
}

/*
  Рассмотренные: группа — пост и момент разбора (одно решение закрывает все открытые жалобы
  разом; после «оставить» на тот же пост могут пожаловаться другие — это уже другая группа).
  Свежие решения сверху, порциями по RESOLVED_POST_REPORTS_PER_PAGE
*/
export async function loadResolvedPostReports(page: number): Promise<{ items: PostReportRowResource[], pages: number }> {
  const total = await countResolvedPostReportGroups();
  const pages = Math.max(1, Math.ceil(total / RESOLVED_POST_REPORTS_PER_PAGE));
  const groups = await db.select({ postId: postReports.postId, resolvedAt: postReports.resolvedAt })
    .from(postReports)
    .where(isNotNull(postReports.resolvedAt))
    .groupBy(postReports.postId, postReports.resolvedAt)
    .orderBy(desc(postReports.resolvedAt), desc(postReports.postId))
    .limit(RESOLVED_POST_REPORTS_PER_PAGE)
    .offset((Math.min(page, pages) - 1) * RESOLVED_POST_REPORTS_PER_PAGE);

  if(groups.length === 0){
    return { items: [], pages };
  }

  const where = or(...groups.map(g => and(eq(postReports.postId, g.postId), eq(postReports.resolvedAt, g.resolvedAt!))));

  return { items: await loadGroups(where!, 'resolved'), pages };
}

// Число карточек во вкладке «Рассмотренные»
export async function countResolvedPostReportGroups(){
  const groups = db.select({ postId: postReports.postId })
    .from(postReports)
    .where(isNotNull(postReports.resolvedAt))
    .groupBy(postReports.postId, postReports.resolvedAt)
    .as('groups');
  const row = await db.select({ n: count() }).from(groups).get();

  return row?.n ?? 0;
}

// Одним запросом: жалобы с постом, его автором, жалобщиком и тем, кто закрыл
async function loadGroups(where: SQL, order: 'open' | 'resolved'): Promise<PostReportRowResource[]> {
  const author = alias(users, 'author');
  const reporter = alias(users, 'reporter');
  const resolver = alias(users, 'resolver');

  const rows = await db.select({
    postId: postReports.postId,
    reason: postReports.reason,
    comment: postReports.comment,
    reportedAt: postReports.createdAt,
    resolvedAt: postReports.resolvedAt,
    resolution: postReports.resolution,
    resolverName: resolver.name,
    reporterId: reporter.id,
    reporterName: reporter.name,
    title: posts.title,
    status: posts.status,
    authorId: author.id,
    authorName: author.name,
    authorAvatarKey: author.avatarKey
  })
    .from(postReports)
    .innerJoin(posts, eq(posts.id, postReports.postId))
    .innerJoin(author, eq(author.id, posts.userId))
    .innerJoin(reporter, eq(reporter.id, postReports.userId))
    .leftJoin(resolver, eq(resolver.id, postReports.resolvedBy))
    .where(where)
    .orderBy(asc(postReports.createdAt), asc(postReports.id));

  const grouped = new Map<string, PostReportRowResource>();

  for(const row of rows){
    const key = `${row.postId}:${row.resolvedAt?.getTime() ?? ''}`;
    const reporterRow = { id: row.reporterId, name: row.reporterName, reason: row.reason, comment: row.comment, at: row.reportedAt };
    const existing = grouped.get(key);

    if(existing){
      existing.reporters.push(reporterRow);
      existing.lastAt = row.reportedAt;
      continue;
    }

    grouped.set(key, {
      postId: row.postId,
      title: row.title,
      status: row.status,
      author: { id: row.authorId, name: row.authorName, avatarKey: row.authorAvatarKey },
      reporters: [ reporterRow ],
      firstAt: row.reportedAt,
      lastAt: row.reportedAt,
      resolution: row.resolvedAt && row.resolution
        ? { kind: row.resolution, by: row.resolverName, at: row.resolvedAt }
        : null
    });
  }

  const items = [ ...grouped.values() ];

  if(order === 'resolved'){
    items.sort((a, b) => b.resolution!.at.getTime() - a.resolution!.at.getTime() || b.postId - a.postId);
  }

  return items;
}
