'use server'

import 'server-only';
import { actionClient } from "@/globals/actionClient";
import { FEED_PAGE, postFeedPageDto } from "@/domains/posts/dto/postFeedRequests";
import { postListResource } from "@/domains/posts/dto/postResources";
import { loadFeed } from "@/domains/posts/shared/loadFeed";
import { resource } from "@/core/resource";
import { getAuthUser } from "@/shared/auth";

/*
  Следующая порция бесконечной ленты. Публичное чтение: отдельного лимита нет, от флуда
  защищает proxy. Лента подписок берёт пользователя из сессии — без неё порция пустая
*/
export const loadFeedAction = actionClient
  .inputSchema(postFeedPageDto)
  .action(async ({ parsedInput: { filter, offset } }) => {
    const viewerId = filter.follow ? (await getAuthUser())?.id ?? null : null;
    const { posts, total } = await loadFeed(filter, offset, FEED_PAGE, viewerId);

    return { posts: resource(postListResource, posts), total };
  });
