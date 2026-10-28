'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { rateLimiters } from "@/globals/rateLimiter";
import { commentReports, comments, posts } from "@/database/schema";
import { aiIdSchema } from "@/domains/comments/dto/commentRequests";
import type { CommentReportState } from "@/domains/comments/dto/commentResources";
import { moderateComments, reportComment } from "@/domains/comments/policy";
import { ensurePostPublished, findCommentOrStale } from "@/domains/comments/shared/commentGuards";
import { ancestorAuthorIds, resolveOpenReports } from "@/domains/comments/shared/commentReports";
import { commentState } from "@/domains/comments/shared/commentState";
import { notifyCommentReported, notifyReportsResolved } from "@/domains/comments/shared/commentNotifications";
import { publishNotifications } from "@/domains/notifications/exports/notify";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/*
  Повторная жалоба идемпотентна, разобранная заново не открывается: пара комментарий–
  пользователь уникальна, а ответ говорит, в каком состоянии жалоба сейчас
*/
export const reportCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await consumeOrFail(rateLimiters.commentReport, String(auth.id));

    const { state, notificationIds } = db.transaction((tx): { state: CommentReportState, notificationIds: number[] } => {
      const comment = findCommentOrStale(tx, id);

      ensurePostPublished(tx, comment.postId);

      const post = tx.select({ userId: posts.userId }).from(posts).where(eq(posts.id, comment.postId)).get();
      const branch = { postAuthorId: post?.userId ?? 0, ancestorAuthorIds: ancestorAuthorIds(tx, comment.parentId) };

      // Право — по ветке, состояние — отдельно: скрытый, пока страница была открыта, — 409
      if(!reportComment(auth, { userId: comment.userId, state: 'visible' }, branch)){
        actionError(403, 'Пожаловаться может автор поста или комментария выше по ветке');
      }

      if(commentState(comment) !== 'visible'){
        actionError(409, 'Комментарий уже скрыт модератором');
      }

      const inserted = tx.insert(commentReports)
        .values({ commentId: id, userId: auth.id, postId: comment.postId })
        .onConflictDoNothing()
        .returning({ id: commentReports.id })
        .all();

      const report = tx.select({ resolvedAt: commentReports.resolvedAt })
        .from(commentReports)
        .where(and(eq(commentReports.commentId, id), eq(commentReports.userId, auth.id)))
        .get();

      return {
        state: report?.resolvedAt ? 'resolved' : 'sent',
        notificationIds: inserted.length > 0 ? notifyCommentReported(tx, comment, auth.id) : []
      };
    });

    publishNotifications(notificationIds);
    revalidatePath('/office/moderation/comments');

    return { state };
  });

/*
  «Оставить»: комментарий остаётся, все его открытые жалобы закрываются. Скрытие из очереди —
  обычный hideCommentAction, он закрывает жалобы сам
*/
export const keepCommentAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderateComments);

    const notificationIds = db.transaction(tx => {
      const comment = tx.select({ userId: comments.userId, postId: comments.postId }).from(comments).where(eq(comments.id, id)).get();

      if(comment?.userId === auth.id){
        actionError(403, 'Жалобы на свой комментарий разбирает другой модератор');
      }

      const reporterIds = resolveOpenReports(tx, id, 'kept', auth.id);

      if(!comment || reporterIds.length === 0){
        actionError(409, 'Жалобы уже разобраны');
      }

      return notifyReportsResolved(tx, { id, postId: comment.postId }, reporterIds, auth.id);
    });

    publishNotifications(notificationIds);
    revalidatePath('/office/moderation/comments');

    return { done: true };
  });
