import 'server-only';
import { actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { commentModerations, commentReactions, comments, posts } from "@/database/schema";
import { deleteReports, resolveOpenReports } from "@/domains/comments/shared/commentReports";
import { deleteCommentNotifications } from "@/domains/notifications/exports/notify";
import { and, eq, inArray } from "drizzle-orm";

export type DBTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/*
  Проверки внутри транзакции записи: пост мог уйти из ленты, комментарий — измениться,
  пока страница была открыта. Устаревшая страница получает 409, а не 403
*/
export function ensurePostPublished(tx: DBTransaction, postId: number){
  const post = tx.select({ status: posts.status }).from(posts).where(eq(posts.id, postId)).get();

  if(post?.status !== 'published'){
    actionError(409, 'Пост больше не опубликован');
  }
}

export function findCommentOrStale(tx: DBTransaction, id: number){
  const comment = tx.select().from(comments).where(eq(comments.id, id)).get();

  if(!comment || comment.deletedAt){
    return actionError(409, 'Комментарий уже удалён — обновите страницу');
  }

  return comment;
}

/*
  Удаление своего: с ответами — заглушка без текста, без ответов — строка целиком, а за ней
  и заглушки-родители, у которых больше не осталось ответов. foreign_keys выключен —
  реакции и жалобы удаляются явно; жалобы на заглушку закрываются как deleted. Уведомления
  о комментарии уходят и у заглушки: текста, о котором они, больше нет. По той же причине
  стираются прежние тексты из журнала правок модератора
*/
export function removeComment(tx: DBTransaction, id: number){
  tx.delete(commentReactions).where(eq(commentReactions.commentId, id)).run();
  deleteCommentNotifications(tx, [ id ]);
  eraseEditedTexts(tx, [ id ]);

  if(hasReplies(tx, id)){
    tx.update(comments).set({ deletedAt: new Date(), content: '' }).where(eq(comments.id, id)).run();
    resolveOpenReports(tx, id, 'deleted', null);

    return;
  }

  deleteReports(tx, [ id ]);

  let parentId = tx.delete(comments).where(eq(comments.id, id)).returning({ parentId: comments.parentId }).get()?.parentId ?? null;

  while(parentId !== null){
    const parent = tx.select({ id: comments.id, parentId: comments.parentId, deletedAt: comments.deletedAt })
      .from(comments)
      .where(eq(comments.id, parentId))
      .get();

    if(!parent?.deletedAt || hasReplies(tx, parent.id)){
      break;
    }

    tx.delete(comments).where(eq(comments.id, parent.id)).run();
    deleteReports(tx, [ parent.id ]);
    deleteCommentNotifications(tx, [ parent.id ]);
    parentId = parent.parentId;
  }
}

/*
  Журнал правок модератора хранит прежний текст. Удаление комментария его стирает — кто и
  когда правил, остаётся (спека 24)
*/
export function eraseEditedTexts(tx: DBTransaction, commentIds: number[]){
  tx.update(commentModerations)
    .set({ comment: null })
    .where(and(inArray(commentModerations.commentId, commentIds), eq(commentModerations.decision, 'edited')))
    .run();
}

function hasReplies(tx: DBTransaction, id: number){
  return !!tx.select({ id: comments.id }).from(comments).where(eq(comments.parentId, id)).limit(1).get();
}
