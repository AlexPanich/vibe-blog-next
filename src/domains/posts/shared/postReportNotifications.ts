import 'server-only';
import { postReports } from "@/database/schema";
import { deletePostReportNotifications, notify, staffIds, type DBTransaction } from "@/domains/notifications/exports/notify";
import { and, eq, isNull } from "drizzle-orm";

/*
  Только первая открытая жалоба: дальше пост уже в очереди. Автору поста задача не уходит —
  свой пост он не разбирает и о жалобах не узнаёт (спека 36, п. 6); жалобщика убирает notify
*/
export function notifyPostReported(tx: DBTransaction, post: { id: number, userId: number }, actorId: number): number[] {
  const open = tx.select({ id: postReports.id })
    .from(postReports)
    .where(and(eq(postReports.postId, post.id), isNull(postReports.resolvedAt)))
    .limit(2)
    .all();

  if(open.length !== 1){
    return [];
  }

  return notify(tx, 'post_report.created', staffIds(tx).filter(id => id !== post.userId), { actorId, postId: post.id });
}

// Жалобы разобраны (blocked или kept): жалобщикам — итог, у staff задача уходит
export function notifyPostReportsResolved(tx: DBTransaction, postId: number, reporterIds: number[], actorId: number): number[] {
  deletePostReportNotifications(tx, postId);

  return notify(tx, 'post_report.resolved', reporterIds, { actorId, postId });
}
