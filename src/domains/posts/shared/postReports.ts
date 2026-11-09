import 'server-only';
import { db } from "@/globals/db";
import { postReports } from "@/database/schema";
import type { PostReportResolution } from "@/database/schema";
import type { DBTransaction } from "@/domains/notifications/exports/notify";
import type { PostReportState } from "@/domains/posts/dto/postResources";
import { deletePostReportNotifications } from "@/domains/notifications/exports/notify";
import { notifyPostReportsResolved } from "@/domains/posts/shared/postReportNotifications";
import type { PostTransition } from "@/domains/posts/shared/postStatuses";
import { and, countDistinct, eq, isNull } from "drizzle-orm";

/*
  Закрывает все открытые жалобы на пост одним решением. Возвращает, кто жаловался, —
  им уйдёт «жалоба рассмотрена»
*/
export function resolveOpenPostReports(tx: DBTransaction, postId: number, resolution: PostReportResolution, byUserId: number | null): number[] {
  return tx.update(postReports)
    .set({ resolvedAt: new Date(), resolvedBy: byUserId, resolution })
    .where(and(eq(postReports.postId, postId), isNull(postReports.resolvedAt)))
    .returning({ userId: postReports.userId })
    .all()
    .map(r => r.userId);
}

/*
  Побочный эффект перехода на жалобы (спека 36, п. 5), в транзакции changePostStatus:
  блокировка любым путём закрывает их как blocked с итогом жалобщикам, уход в черновик — как
  withdrawn без закрывшего и без уведомлений. Архив, возврат из архива и разблокировка жалоб
  не трогают. Возвращает id уведомлений
*/
export function settlePostReports(tx: DBTransaction, postId: number, transition: PostTransition, actorId: number): number[] {
  if(transition === 'block' || transition === 'blockArchived'){
    const reporterIds = resolveOpenPostReports(tx, postId, 'blocked', actorId);

    return notifyPostReportsResolved(tx, postId, reporterIds, actorId);
  }

  if(transition === 'unpublish' || transition === 'redraftArchived'){
    resolveOpenPostReports(tx, postId, 'withdrawn', null);
    deletePostReportNotifications(tx, postId);
  }

  return [];
}

// Посты с открытыми жалобами — бейдж пункта меню и переключатель видов
export async function countOpenPostReports(){
  const row = await db.select({ n: countDistinct(postReports.postId) })
    .from(postReports)
    .where(isNull(postReports.resolvedAt))
    .get();

  return row?.n ?? 0;
}

// Состояние кнопки «Пожаловаться» у пользователя
export function reportStateOf(tx: DBTransaction | typeof db, postId: number, userId: number): PostReportState {
  const report = tx.select({ resolvedAt: postReports.resolvedAt })
    .from(postReports)
    .where(and(eq(postReports.postId, postId), eq(postReports.userId, userId)))
    .get();

  if(!report){
    return 'none';
  }

  return report.resolvedAt ? 'resolved' : 'sent';
}
