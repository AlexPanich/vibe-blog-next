'use server'

import 'server-only';
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { db } from "@/globals/db";
import { postRatings, posts } from "@/database/schema";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { postRateDto } from "@/domains/posts/dto/postRatingRequests";
import { ratePost } from "@/domains/posts/policy";
import { myRating, postRatingStats } from "@/domains/posts/shared/postRatings";
import { notifyThrottled, publishNotifications } from "@/domains/notifications/exports/notify";
import { liveBus } from "@/globals/liveBus";
import { postTopic } from "@/shared/liveEvents";
import { and, eq } from "drizzle-orm";

export const ratePostAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .inputSchema(postRateDto)
  .action(async ({ parsedInput: { value }, bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    /*
      Статус и права — в той же транзакции, что запись: пост мог уйти из ленты, пока жали звезду.
      Автору — post.rated о новой и изменённой оценке, не чаще раза в сутки на пару; снятие молчит (спека 51)
    */
    const notificationIds = db.transaction(tx => {
      const post = tx.select({ userId: posts.userId, status: posts.status }).from(posts).where(eq(posts.id, id)).get();

      if(!post || post.status !== 'published'){
        actionError(409, 'Пост больше не опубликован');
      }

      if(!ratePost(auth, post)){
        actionError(403, 'Свой пост оценивать нельзя');
      }

      const own = and(eq(postRatings.postId, id), eq(postRatings.userId, auth.id));

      if(value === 0){
        tx.delete(postRatings).where(own).run();

        return [];
      }

      tx.insert(postRatings)
        .values({ postId: id, userId: auth.id, value })
        .onConflictDoUpdate({ target: [ postRatings.postId, postRatings.userId ], set: { value, updatedAt: new Date() } })
        .run();

      return notifyThrottled(tx, 'post.rated', post.userId, { actorId: auth.id, postId: id }, { kind: 'rate', targetId: id });
    });

    publishNotifications(notificationIds);

    const stats = await postRatingStats(id);
    // Звёзды у всех, кто смотрит пост (спека 29); своя оценка — только в ответе
    liveBus.publishTopic(postTopic(id), 'post.rating', { postId: id, average: stats.average, count: stats.count });

    return { ...stats, mine: value };
  });

/*
  Своя оценка: публичная страница сессию на сервере не читает, поэтому клиент спрашивает сам
*/
export const myPostRatingAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    return { mine: await myRating(id, auth.id) };
  });
