'use server'

import 'server-only';
import { CONTAINER } from "@/globals/container";
import { actionAuthClient, actionError } from "@/globals/actionClient";
import { aiEnabled } from "@/globals/ai";
import { rateLimiters } from "@/globals/rateLimiter";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { moderatePosts } from "@/domains/posts/policy";
import { hasLiveAiReview, startPostAiReview } from "@/domains/posts/shared/postAiReview";
import { consumeOrFail } from "@/shared/rateLimitAction";
import { revalidatePath } from "next/cache";

/*
  «Проверить заново» на странице ревью (спека 54, п. 3): новый разбор текущей отправки. Любой
  staff, даже если ревью ведёт другой модератор: разбор ничего не решает. Порядок — права,
  лимит, загрузка, 409. Проверка живого pending и вставка идут без await между ними
*/
export const rerunPostAiReviewAction = actionAuthClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ id ], ctx: { auth } }) => {
    await CONTAINER.boucerService.breakIfCant(moderatePosts);
    await consumeOrFail(rateLimiters.aiReview, String(auth.id));

    const post = await CONTAINER.postService.findOrFail(id);

    if(!aiEnabled){
      actionError(409, 'ИИ-разбор выключен');
    }

    if(post.status !== 'moderating' || !post.submittedAt){
      actionError(409, 'Пост уже не на модерации — обновите страницу');
    }

    if(hasLiveAiReview(post.id, post.submittedAt, new Date())){
      actionError(409, 'Разбор уже идёт');
    }

    startPostAiReview(post.id, post.submittedAt);
    revalidatePath(`/office/moderation/posts/${post.id}`);

    return { done: true };
  });
