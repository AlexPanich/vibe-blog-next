import 'server-only';
import { db } from "@/globals/db";
import { postTags, posts, tagFollows, tags, userFollows, users } from "@/database/schema";
import { sortTags } from "@/domains/tags/exports/tagNames";
import { blockedWithQueries } from "@/domains/users/exports/userBlocks";
import { and, count, eq, notInArray } from "drizzle-orm";

// Авторы с опубликованными постами — для фильтра, по алфавиту
export async function feedAuthors(){
  const rows = await db.selectDistinct({ id: users.id, name: users.name })
    .from(users)
    .innerJoin(posts, and(eq(posts.userId, users.id), eq(posts.status, 'published')));

  return rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

// Рубрики со счётчиком опубликованных постов
export async function tagsWithCounts(){
  return sortTags(await db.select({
    id: tags.id,
    name: tags.name,
    slug: tags.slug,
    postsCount: count(posts.id)
  })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .leftJoin(posts, and(eq(posts.id, postTags.postId), eq(posts.status, 'published')))
    .groupBy(tags.id));
}

/*
  Мои подписки для чипов «Моей ленты»: авторы по алфавиту, рубрики — как везде (sortTags).
  Без авторов, с кем у меня блокировка, — их постов в ленте всё равно нет
*/
export async function feedFollows(userId: number){
  const blocked = blockedWithQueries(userId).map(query => notInArray(users.id, query));
  const [ authors, followedTags ] = await Promise.all([
    db.select({ id: users.id, name: users.name, avatarKey: users.avatarKey })
      .from(userFollows)
      .innerJoin(users, eq(users.id, userFollows.followingId))
      .where(and(eq(userFollows.followerId, userId), ...blocked)),
    db.select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(tagFollows)
      .innerJoin(tags, eq(tags.id, tagFollows.tagId))
      .where(eq(tagFollows.userId, userId))
  ]);

  return {
    authors: authors.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    tags: sortTags(followedTags)
  };
}
