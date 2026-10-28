import 'server-only';
import { db } from "@/globals/db";
import { commentReports, comments } from "@/database/schema";
import type { CommentReportResolution } from "@/database/schema";
import type { DBTransaction } from "@/domains/comments/shared/commentGuards";
import { and, countDistinct, eq, inArray, isNull } from "drizzle-orm";

/*
  Авторы предков по цепочке parentId, без ограничения глубины. Заглушки «удалён» права
  жаловаться не дают, скрытые — дают: скрыт предок, а не ответ под ним
*/
export function ancestorAuthorIds(tx: DBTransaction, parentId: number | null): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();

  while(parentId !== null && !seen.has(parentId)){
    seen.add(parentId);

    const parent = tx.select({ userId: comments.userId, parentId: comments.parentId, deletedAt: comments.deletedAt })
      .from(comments)
      .where(eq(comments.id, parentId))
      .get();

    if(!parent){
      break;
    }

    if(!parent.deletedAt){
      ids.push(parent.userId);
    }

    parentId = parent.parentId;
  }

  return ids;
}

/*
  Закрывает все открытые жалобы на комментарий одним решением. Возвращает, кто жаловался, —
  им уйдёт «жалоба рассмотрена» (спека 20)
*/
export function resolveOpenReports(tx: DBTransaction, commentId: number, resolution: CommentReportResolution, byUserId: number | null): number[] {
  return tx.update(commentReports)
    .set({ resolvedAt: new Date(), resolvedBy: byUserId, resolution })
    .where(and(eq(commentReports.commentId, commentId), isNull(commentReports.resolvedAt)))
    .returning({ userId: commentReports.userId })
    .all()
    .map(r => r.userId);
}

// Строки комментариев удаляются — жалобы на них тоже: foreign_keys выключен
export function deleteReports(tx: DBTransaction, commentIds: number[]){
  if(commentIds.length > 0){
    tx.delete(commentReports).where(inArray(commentReports.commentId, commentIds)).run();
  }
}

// Комментарии с открытыми жалобами — бейдж пункта меню
export async function countOpenCommentReports(){
  const row = await db.select({ n: countDistinct(commentReports.commentId) })
    .from(commentReports)
    .where(isNull(commentReports.resolvedAt))
    .get();

  return row?.n ?? 0;
}
