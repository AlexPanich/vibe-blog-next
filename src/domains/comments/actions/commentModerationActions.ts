'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { commentModerations, comments } from "@/database/schema";
import { aiIdSchema, commentHideDto } from "@/domains/comments/dto/commentRequests";
import { moderateComments } from "@/domains/comments/policy";
import { findCommentOrStale } from "@/domains/comments/shared/commentGuards";
import { resolveOpenReports } from "@/domains/comments/shared/commentReports";
import { notifyReportsResolved } from "@/domains/comments/shared/commentNotifications";
import { notify, publishNotifications } from "@/domains/notifications/exports/notify";
import { publishCommentsChanged } from "@/domains/comments/shared/publishComments";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/*
  breakIfCant проверяет только роль; состояние комментария — в том же UPDATE, что смена:
  устаревшая страница получает 409, а не 403 (как статусы постов)
*/

export const hideCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(commentHideDto)
  .action(async ({ parsedInput: { reason }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderateComments);

    const { content, branch, notificationIds } = db.transaction(tx => {
      const comment = findCommentOrStale(tx, id);

      if(comment.userId === auth.id){
        actionError(403, 'Свой комментарий скрыть нельзя — его можно удалить');
      }

      const updated = tx.update(comments)
        .set({ hiddenAt: new Date(), hiddenBy: auth.id, hideReason: reason })
        .where(and(eq(comments.id, id), isNull(comments.hiddenAt), isNull(comments.deletedAt)))
        .returning({ id: comments.id })
        .all();

      if(updated.length === 0){
        actionError(409, 'Комментарий уже скрыт');
      }

      tx.insert(commentModerations).values({ commentId: id, userId: auth.id, decision: 'hidden', comment: reason }).run();
      // И со страницы поста, и из очереди: скрытый комментарий в очереди не нужен
      const reporterIds = resolveOpenReports(tx, id, 'hidden', auth.id);

      return {
        content: comment.content,
        branch: { postId: comment.postId, imageId: comment.imageId },
        notificationIds: [
          ...notify(tx, 'comment.hidden', [ comment.userId ], { actorId: auth.id, postId: comment.postId, commentId: id }),
          ...notifyReportsResolved(tx, comment, reporterIds, auth.id)
        ]
      };
    });

    publishNotifications(notificationIds);
    publishCommentsChanged(branch);
    revalidateBranches();

    // Модератору текст скрытого нужен и дальше, а с сервера он больше не придёт
    return { content, reason };
  });

export const unhideCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderateComments);

    const { branch, notificationIds } = db.transaction(tx => {
      const comment = findCommentOrStale(tx, id);

      if(comment.userId === auth.id){
        actionError(403, 'Свой скрытый комментарий вернуть нельзя');
      }

      const updated = tx.update(comments)
        .set({ hiddenAt: null, hiddenBy: null, hideReason: null })
        .where(and(eq(comments.id, id), isNotNull(comments.hiddenAt), isNull(comments.deletedAt)))
        .returning({ id: comments.id })
        .all();

      if(updated.length === 0){
        actionError(409, 'Комментарий уже не скрыт');
      }

      tx.insert(commentModerations).values({ commentId: id, userId: auth.id, decision: 'unhidden' }).run();

      return {
        branch: { postId: comment.postId, imageId: comment.imageId },
        notificationIds: notify(tx, 'comment.unhidden', [ comment.userId ], { actorId: auth.id, postId: comment.postId, commentId: id })
      };
    });

    publishNotifications(notificationIds);
    publishCommentsChanged(branch);
    revalidateBranches();

    return { done: true };
  });

function revalidateBranches(){
  revalidatePath('/posts/[id]', 'page');
  revalidatePath('/posts/[id]/images/[imageId]', 'page');
  revalidatePath('/office/moderation/reports/comments');
}
