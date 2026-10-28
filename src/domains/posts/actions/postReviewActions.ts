'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { posts } from "@/database/schema";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { adminPosts, moderatePosts } from "@/domains/posts/policy";
import { and, eq, isNotNull, isNull, ne, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/*
  «Взять на ревью» — мягкая блокировка внутри moderating: другие модераторы видят, что пост
  смотрят, и решения принять не могут. Все три действия — условный UPDATE: состояние могло
  измениться, пока страница была открыта
*/

export const claimReviewAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderatePosts);
    setReviewer(id, auth.id, isNull(posts.reviewerId), 'Пост уже взял на ревью другой модератор — обновите страницу');

    return { done: true };
  });

export const releaseReviewAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderatePosts);
    setReviewer(id, null, eq(posts.reviewerId, auth.id), 'Ревью ведёте уже не вы — обновите страницу');

    return { done: true };
  });

/*
  Перехват — страховка от зависшего ревью: только admin, только чужое ревью
*/
export const takeoverReviewAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(adminPosts);
    setReviewer(id, auth.id, and(isNotNull(posts.reviewerId), ne(posts.reviewerId, auth.id)), 'Ревью уже изменилось — обновите страницу');

    return { done: true };
  });

function setReviewer(postId: number, reviewerId: number | null, condition: SQL | undefined, staleMessage: string){
  const changed = db.update(posts)
    .set({ reviewerId, reviewStartedAt: reviewerId ? new Date() : null })
    .where(and(eq(posts.id, postId), eq(posts.status, 'moderating'), condition))
    .returning({ id: posts.id })
    .all();

  if(changed.length === 0){
    actionError(409, staleMessage);
  }

  revalidatePath(`/office/moderation/posts/${postId}`);
}
