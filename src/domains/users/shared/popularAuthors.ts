import 'server-only';
import { db } from "@/globals/db";
import { posts, userFollows, users } from "@/database/schema";
import { count, desc, eq, sql } from "drizzle-orm";

/*
  «Авторы, на которых подписываются» на главной (спека 30): авторы с опубликованными
  постами по числу подписчиков, при равенстве — по числу постов
*/
export async function popularAuthors(limit: number){
  const published = db.select({ userId: posts.userId, n: count().as('posts_n') })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .groupBy(posts.userId)
    .as('published');
  const followers = db.select({ userId: userFollows.followingId, n: count().as('followers_n') })
    .from(userFollows)
    .groupBy(userFollows.followingId)
    .as('followers');
  const followersCount = sql<number>`coalesce(${followers.n}, 0)`;

  return db.select({
    id: users.id,
    name: users.name,
    avatarKey: users.avatarKey,
    bio: users.bio,
    postsCount: published.n,
    followersCount
  })
    .from(users)
    .innerJoin(published, eq(published.userId, users.id))
    .leftJoin(followers, eq(followers.userId, users.id))
    .orderBy(desc(followersCount), desc(published.n), desc(users.id))
    .limit(limit);
}
