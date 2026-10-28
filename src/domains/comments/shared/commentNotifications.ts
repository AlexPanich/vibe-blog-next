import 'server-only';
import { commentReports, posts } from "@/database/schema";
import type { DBTransaction } from "@/domains/comments/shared/commentGuards";
import { deleteReportNotifications, notify, staffIds } from "@/domains/notifications/exports/notify";
import { and, eq, isNull } from "drizzle-orm";

/*
  Ответ — автору родителя. Автору поста — comment.created, если ответ адресован не ему:
  тогда ему хватает comment.reply
*/
export function notifyCommentCreated(tx: DBTransaction, postId: number, commentId: number, parentAuthorId: number | null, actorId: number): number[] {
  const post = tx.select({ userId: posts.userId }).from(posts).where(eq(posts.id, postId)).get();
  const target = { actorId, postId, commentId };
  const ids = parentAuthorId === null ? [] : notify(tx, 'comment.reply', [ parentAuthorId ], target);

  if(post && post.userId !== parentAuthorId){
    ids.push(...notify(tx, 'comment.created', [ post.userId ], target));
  }

  return ids;
}

// Только первая открытая жалоба: дальше комментарий уже в очереди
export function notifyCommentReported(tx: DBTransaction, comment: { id: number, postId: number, userId: number }, actorId: number): number[] {
  const open = tx.select({ id: commentReports.id })
    .from(commentReports)
    .where(and(eq(commentReports.commentId, comment.id), isNull(commentReports.resolvedAt)))
    .limit(2)
    .all();

  if(open.length !== 1){
    return [];
  }

  return notify(tx, 'report.created', staffIds(tx).filter(id => id !== comment.userId), { actorId, postId: comment.postId, commentId: comment.id });
}

// Жалобы разобраны: жалобщикам — итог, у staff задача уходит
export function notifyReportsResolved(tx: DBTransaction, comment: { id: number, postId: number }, reporterIds: number[], actorId: number): number[] {
  deleteReportNotifications(tx, comment.id);

  return notify(tx, 'report.resolved', reporterIds, { actorId, postId: comment.postId, commentId: comment.id });
}
