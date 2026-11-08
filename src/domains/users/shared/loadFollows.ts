import 'server-only';
import { db } from "@/globals/db";
import { postRatings, posts, tagFollows, userBlocks, userFollows, users } from "@/database/schema";
import { formatRating } from "@/domains/posts/exports/formatRating";
import { and, avg, count, eq, exists, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

export type FollowsTab = 'following' | 'followers' | 'tags' | 'blocked'

export type FollowPerson = Awaited<ReturnType<typeof loadFollowPeople>>[number]

// Числа на вкладках «Подписок» (спека 42)
export async function followCounts(userId: number): Promise<Record<FollowsTab, number>>{
  const n = (query: { n: number } | undefined) => query?.n ?? 0;

  return {
    following: n(db.select({ n: count() }).from(userFollows).where(eq(userFollows.followerId, userId)).get()),
    followers: n(db.select({ n: count() }).from(userFollows).where(eq(userFollows.followingId, userId)).get()),
    tags: n(db.select({ n: count() }).from(tagFollows).where(eq(tagFollows.userId, userId)).get()),
    blocked: n(db.select({ n: count() }).from(userBlocks).where(eq(userBlocks.userId, userId)).get())
  };
}

/*
  Люди вкладок «Подписки», «Подписчики», «Заблокированные»: «о себе», опубликованные посты
  и средняя оценка (по всем оценкам опубликованных, как на /authors). following — подписан
  ли я, friend — есть встречная подписка; у заблокированных обе false. Порядок — по имени
*/
export async function loadFollowPeople(userId: number, tab: Exclude<FollowsTab, 'tags'>){
  const back = alias(userFollows, 'back');
  const published = db.select({ userId: posts.userId, n: count().as('posts_n') })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .groupBy(posts.userId)
    .as('published');
  const ratings = db.select({ userId: posts.userId, average: avg(postRatings.value).as('rating_avg') })
    .from(postRatings)
    .innerJoin(posts, and(eq(posts.id, postRatings.postId), eq(posts.status, 'published')))
    .groupBy(posts.userId)
    .as('ratings');
  const { link, on, where } = side(userId, tab);
  const mine = tab === 'following';
  const rows = await db.select({
    id: users.id,
    name: users.name,
    avatarKey: users.avatarKey,
    bio: users.bio,
    postsCount: published.n,
    ratingAverage: ratings.average,
    friend: exists(db.select().from(back).where(and(
      eq(back.followerId, mine ? users.id : userId),
      eq(back.followingId, mine ? userId : users.id)
    )))
  })
    .from(link)
    .innerJoin(users, on)
    .leftJoin(published, eq(published.userId, users.id))
    .leftJoin(ratings, eq(ratings.userId, users.id))
    .where(where);

  return rows
    .map(({ ratingAverage, friend, postsCount, ...row }) => ({
      ...row,
      postsCount: postsCount ?? 0,
      rating: ratingAverage === null ? null : formatRating(Number(ratingAverage)),
      friend: tab !== 'blocked' && !!friend,
      following: tab === 'following' || (tab === 'followers' && !!friend)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

// Таблица связи и её сторона: в «Подписках» я подписчик, в «Подписчиках» — на меня, в блокировках — мои
function side(userId: number, tab: Exclude<FollowsTab, 'tags'>): { link: typeof userFollows | typeof userBlocks, on: SQL, where: SQL }{
  if(tab === 'following'){
    return { link: userFollows, on: eq(users.id, userFollows.followingId), where: eq(userFollows.followerId, userId) };
  }
  else if(tab === 'followers'){
    return { link: userFollows, on: eq(users.id, userFollows.followerId), where: eq(userFollows.followingId, userId) };
  }

  // Только свои блокировки: кто заблокировал меня, здесь не видно (спека 26)
  return { link: userBlocks, on: eq(users.id, userBlocks.blockedId), where: eq(userBlocks.userId, userId) };
}
