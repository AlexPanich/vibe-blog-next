import 'server-only';
import { db } from "@/globals/db";
import { commentReports, comments, posts, users } from "@/database/schema";
import type { CommentReportRowResource } from "@/domains/comments/dto/commentResources";
import { commentState } from "@/domains/comments/shared/commentState";
import { isBanActive } from "@/shared/userBan";
import { and, asc, count, desc, eq, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const EXCERPT_LENGTH = 140;

export const RESOLVED_REPORTS_PER_PAGE = 20;

/*
  Открытые жалобы, сгруппированные по комментарию. Карточки идут по первой жалобе — дольше
  всех ждущие сверху, как очередь постов
*/
export async function loadOpenCommentReports(): Promise<CommentReportRowResource[]> {
  return loadGroups(isNull(commentReports.resolvedAt), 'open');
}

/*
  Рассмотренные: группа — комментарий и момент разбора (одно решение закрывает все открытые
  жалобы разом; после «оставить» на тот же комментарий может прийти новая жалоба — это уже
  другая группа). Свежие решения сверху, порциями по RESOLVED_REPORTS_PER_PAGE
*/
export async function loadResolvedCommentReports(page: number): Promise<{ items: CommentReportRowResource[], pages: number }> {
  const total = await countResolvedReportGroups();
  const pages = Math.max(1, Math.ceil(total / RESOLVED_REPORTS_PER_PAGE));
  const groups = await db.select({ commentId: commentReports.commentId, resolvedAt: commentReports.resolvedAt })
    .from(commentReports)
    .where(isNotNull(commentReports.resolvedAt))
    .groupBy(commentReports.commentId, commentReports.resolvedAt)
    .orderBy(desc(commentReports.resolvedAt), desc(commentReports.commentId))
    .limit(RESOLVED_REPORTS_PER_PAGE)
    .offset((Math.min(page, pages) - 1) * RESOLVED_REPORTS_PER_PAGE);

  if(groups.length === 0){
    return { items: [], pages };
  }

  const where = or(...groups.map(g => and(eq(commentReports.commentId, g.commentId), eq(commentReports.resolvedAt, g.resolvedAt!))));

  return { items: await loadGroups(where!, 'resolved'), pages };
}

// Число карточек во вкладке «Рассмотренные»
export async function countResolvedReportGroups(){
  const groups = db.select({ commentId: commentReports.commentId })
    .from(commentReports)
    .where(isNotNull(commentReports.resolvedAt))
    .groupBy(commentReports.commentId, commentReports.resolvedAt)
    .as('groups');
  const row = await db.select({ n: count() }).from(groups).get();

  return row?.n ?? 0;
}

type ParentFacts = {
  parentContent: string | null,
  parentHiddenAt: Date | null,
  parentDeletedAt: Date | null,
  parentAuthorName: string | null
}

// Одним запросом: жалобы с комментарием, постом, автором, родителем и тем, кто закрыл
async function loadGroups(where: SQL, order: 'open' | 'resolved'): Promise<CommentReportRowResource[]> {
  const author = alias(users, 'author');
  const reporter = alias(users, 'reporter');
  const resolver = alias(users, 'resolver');
  const parent = alias(comments, 'parent');
  const parentAuthor = alias(users, 'parent_author');

  const rows = await db.select({
    commentId: commentReports.commentId,
    reportedAt: commentReports.createdAt,
    resolvedAt: commentReports.resolvedAt,
    resolution: commentReports.resolution,
    resolverName: resolver.name,
    reporterId: reporter.id,
    reporterName: reporter.name,
    postId: posts.id,
    postTitle: posts.title,
    imageId: comments.imageId,
    content: comments.content,
    deletedAt: comments.deletedAt,
    authorId: author.id,
    authorName: author.name,
    authorAvatarKey: author.avatarKey,
    authorBannedAt: author.bannedAt,
    authorBannedUntil: author.bannedUntil,
    parentContent: parent.content,
    parentHiddenAt: parent.hiddenAt,
    parentDeletedAt: parent.deletedAt,
    parentAuthorName: parentAuthor.name
  })
    .from(commentReports)
    .innerJoin(comments, eq(comments.id, commentReports.commentId))
    .innerJoin(posts, eq(posts.id, commentReports.postId))
    .innerJoin(author, eq(author.id, comments.userId))
    .innerJoin(reporter, eq(reporter.id, commentReports.userId))
    .leftJoin(resolver, eq(resolver.id, commentReports.resolvedBy))
    .leftJoin(parent, eq(parent.id, comments.parentId))
    .leftJoin(parentAuthor, eq(parentAuthor.id, parent.userId))
    .where(where)
    .orderBy(asc(commentReports.createdAt), asc(commentReports.id));

  const grouped = new Map<string, CommentReportRowResource>();
  const now = new Date();

  for(const row of rows){
    const key = `${row.commentId}:${row.resolvedAt?.getTime() ?? ''}`;
    const existing = grouped.get(key);

    if(existing){
      existing.reporters.push({ id: row.reporterId, name: row.reporterName });
      existing.lastAt = row.reportedAt;
      continue;
    }

    grouped.set(key, {
      commentId: row.commentId,
      postId: row.postId,
      postTitle: row.postTitle,
      imageId: row.imageId,
      content: row.deletedAt ? null : row.content,
      author: {
        id: row.authorId,
        name: row.authorName,
        avatarKey: row.authorAvatarKey,
        ban: isBanActive({ bannedAt: row.authorBannedAt, bannedUntil: row.authorBannedUntil }, now) ? { until: row.authorBannedUntil } : null
      },
      parent: parentOf(row),
      reporters: [ { id: row.reporterId, name: row.reporterName } ],
      firstAt: row.reportedAt,
      lastAt: row.reportedAt,
      resolution: row.resolvedAt && row.resolution
        ? { kind: row.resolution, by: row.resolverName, at: row.resolvedAt }
        : null
    });
  }

  const items = [ ...grouped.values() ];

  if(order === 'resolved'){
    items.sort((a, b) => b.resolution!.at.getTime() - a.resolution!.at.getTime() || b.commentId - a.commentId);
  }

  return items;
}

function parentOf(row: ParentFacts): CommentReportRowResource['parent'] {
  if(row.parentContent === null || row.parentAuthorName === null){
    return null;
  }

  const state = commentState({ hiddenAt: row.parentHiddenAt, deletedAt: row.parentDeletedAt });
  const excerpt = state === 'visible' ? row.parentContent.slice(0, EXCERPT_LENGTH) : '';

  return { authorName: state === 'deleted' ? '' : row.parentAuthorName, state, excerpt };
}
