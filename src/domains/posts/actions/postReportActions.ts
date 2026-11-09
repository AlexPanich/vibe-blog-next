'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { rateLimiters } from "@/globals/rateLimiter";
import { postReports, posts } from "@/database/schema";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { postBlockDto } from "@/domains/posts/dto/postModerationRequests";
import { postReportDto } from "@/domains/posts/dto/postReportRequests";
import type { PostReportState } from "@/domains/posts/dto/postResources";
import { moderatePosts, reportPost } from "@/domains/posts/policy";
import { changePostStatus } from "@/domains/posts/shared/changePostStatus";
import { insertBlockModeration } from "@/domains/posts/shared/postBlocking";
import { notifyPostReported, notifyPostReportsResolved } from "@/domains/posts/shared/postReportNotifications";
import { reportStateOf, resolveOpenPostReports } from "@/domains/posts/shared/postReports";
import { publishNotifications } from "@/domains/notifications/exports/notify";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const QUEUE_PATH = '/office/moderation/reports/posts';

/*
  Жалоба на пост (спека 36). Повторная идемпотентна, разобранная заново не открывается: пара
  пост–пользователь уникальна, а ответ говорит, в каком состоянии жалоба сейчас
*/
export const reportPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postReportDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await consumeOrFail(rateLimiters.postReport, String(auth.id));

    const { state, notificationIds } = db.transaction((tx): { state: PostReportState, notificationIds: number[] } => {
      const post = tx.select({ id: posts.id, userId: posts.userId, status: posts.status }).from(posts).where(eq(posts.id, id)).get();

      if(!post){
        actionError(404, 'Пост не найден');
      }

      // Право — без статуса: снятый, пока страница была открыта, — 409, а не 403
      if(!reportPost(auth, { userId: post.userId, status: 'published' })){
        actionError(403, 'Нельзя пожаловаться на свой пост');
      }

      if(post.status !== 'published'){
        actionError(409, 'Пост уже снят с публикации');
      }

      const inserted = tx.insert(postReports)
        .values({ postId: id, userId: auth.id, reason: parsedInput.reason, comment: parsedInput.comment })
        .onConflictDoNothing()
        .returning({ id: postReports.id })
        .all();

      return {
        state: reportStateOf(tx, id, auth.id),
        notificationIds: inserted.length > 0 ? notifyPostReported(tx, post, auth.id) : []
      };
    });

    publishNotifications(notificationIds);
    revalidatePath(QUEUE_PATH);

    return { state };
  });

/*
  «Оставить»: пост остаётся как есть, все его открытые жалобы закрываются. Свой пост
  модератор не разбирает
*/
export const keepReportedPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderatePosts);

    const notificationIds = db.transaction(tx => {
      const post = tx.select({ userId: posts.userId, status: posts.status }).from(posts).where(eq(posts.id, id)).get();

      if(post?.userId === auth.id){
        actionError(403, 'Жалобы на свой пост разбирает другой модератор');
      }

      if(!post || (post.status !== 'published' && post.status !== 'hidden')){
        actionError(409, 'Жалобы уже разобраны');
      }

      const reporterIds = resolveOpenPostReports(tx, id, 'kept', auth.id);

      if(reporterIds.length === 0){
        actionError(409, 'Жалобы уже разобраны');
      }

      return notifyPostReportsResolved(tx, id, reporterIds, auth.id);
    });

    publishNotifications(notificationIds);
    revalidatePath(QUEUE_PATH);

    return { done: true };
  });

/*
  «Заблокировать пост» из очереди. Не blockPostAction: тот уводит на страницу модерации и не
  знает про свой пост и уже разобранные жалобы. Жалобы закрывает сам переход
  (settlePostReports) — здесь только проверка, что они ещё открыты, в той же транзакции
*/
export const blockReportedPostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postBlockDto)
  .action(async ({ parsedInput, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderatePosts);

    const post = await CONTAINER.postService.findOrFail(id);

    if(post.userId === auth.id){
      actionError(403, 'Жалобы на свой пост разбирает другой модератор');
    }

    // Статус успел смениться — changePostStatus вернёт 409
    const transition = post.status === 'hidden' ? 'blockArchived' : 'block';

    changePostStatus(post.id, transition, auth.id, tx => {
      const open = tx.select({ id: postReports.id })
        .from(postReports)
        .where(and(eq(postReports.postId, post.id), isNull(postReports.resolvedAt)))
        .get();

      if(!open){
        actionError(409, 'Жалобы уже разобраны');
      }

      insertBlockModeration(tx, post.id, auth.id, parsedInput.comment);
    });

    revalidatePath(QUEUE_PATH);
    revalidatePath(`/office/moderation/posts/${post.id}`);

    return { done: true };
  });
