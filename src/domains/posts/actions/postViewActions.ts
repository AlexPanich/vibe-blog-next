'use server'

import 'server-only';
import { actionClient } from "@/globals/actionClient";
import { aiIdSchema } from "@/domains/posts/dto/postRequests";
import { isBotAgent } from "@/domains/posts/shared/isBotAgent";
import { recordPostView } from "@/domains/posts/shared/postViews";
import { getAuthUser } from "@/shared/auth";
import { getUserIp } from "@/shared/request";
import { headers } from "next/headers";

/*
  Просмотр публичной страницы поста (спека 43): шлёт PostViewBeacon после гидрации, гости тоже.
  Ответа нет — клиенту не о чем сообщать. Отдельный rate limit не нужен: глобальный в proxy.ts,
  а накрутить можно максимум +1 в сутки на пару IP+UA
*/
export const recordPostViewAction = actionClient
  .bindArgsSchemas([ aiIdSchema ])
  .action(async ({ bindArgsParsedInputs: [ postId ] }) => {
    const userAgent = (await headers()).get('user-agent') ?? '';

    if(isBotAgent(userAgent)){
      return;
    }

    const user = await getAuthUser();
    recordPostView(postId, { userId: user?.id ?? null, ip: await getUserIp(), userAgent });
  });
