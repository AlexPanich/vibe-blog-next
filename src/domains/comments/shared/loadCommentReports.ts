import 'server-only';
import { db } from "@/globals/db";
import { commentReports, comments, posts, users } from "@/database/schema";
import type { CommentReportRowResource } from "@/domains/comments/dto/commentResources";
import { commentState } from "@/domains/comments/shared/commentState";
import { asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

const EXCERPT_LENGTH = 140;

/*
  Открытые жалобы одним запросом, сгруппированные по комментарию. Строки идут по первой
  жалобе — дольше всех ждущие сверху, как очередь постов
*/
export async function loadCommentReports(): Promise<CommentReportRowResource[]> {
  const author = alias(users, 'author');
  const reporter = alias(users, 'reporter');
  const parent = alias(comments, 'parent');
  const parentAuthor = alias(users, 'parent_author');

  const rows = await db.select({
    commentId: commentReports.commentId,
    reportedAt: commentReports.createdAt,
    reporterId: reporter.id,
    reporterName: reporter.name,
    postId: posts.id,
    postTitle: posts.title,
    imageId: comments.imageId,
    content: comments.content,
    authorId: author.id,
    authorName: author.name,
    authorAvatarKey: author.avatarKey,
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
    .leftJoin(parent, eq(parent.id, comments.parentId))
    .leftJoin(parentAuthor, eq(parentAuthor.id, parent.userId))
    .where(isNull(commentReports.resolvedAt))
    .orderBy(asc(commentReports.createdAt), asc(commentReports.id));

  const grouped = new Map<number, CommentReportRowResource>();

  for(const row of rows){
    const existing = grouped.get(row.commentId);

    if(existing){
      existing.reporters.push({ id: row.reporterId, name: row.reporterName });
      existing.lastAt = row.reportedAt;
      continue;
    }

    grouped.set(row.commentId, {
      commentId: row.commentId,
      postId: row.postId,
      postTitle: row.postTitle,
      imageId: row.imageId,
      content: row.content,
      author: { id: row.authorId, name: row.authorName, avatarKey: row.authorAvatarKey },
      parent: parentOf(row),
      reporters: [ { id: row.reporterId, name: row.reporterName } ],
      firstAt: row.reportedAt,
      lastAt: row.reportedAt
    });
  }

  return [ ...grouped.values() ];
}

type ParentFacts = {
  parentContent: string | null,
  parentHiddenAt: Date | null,
  parentDeletedAt: Date | null,
  parentAuthorName: string | null
}

function parentOf(row: ParentFacts): CommentReportRowResource['parent'] {
  if(row.parentContent === null || row.parentAuthorName === null){
    return null;
  }

  const state = commentState({ hiddenAt: row.parentHiddenAt, deletedAt: row.parentDeletedAt });
  const excerpt = state === 'visible' ? row.parentContent.slice(0, EXCERPT_LENGTH) : '';

  return { authorName: state === 'deleted' ? '' : row.parentAuthorName, state, excerpt };
}
