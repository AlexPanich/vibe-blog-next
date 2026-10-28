import 'server-only';
import { db } from "@/globals/db";
import { liveBus } from "@/globals/liveBus";
import { userTopic } from "@/shared/liveEvents";
import { isBlockedBetween } from "@/domains/users/shared/userBlocks";
import { userFollows } from "@/database/schema";
import { and, count, eq } from "drizzle-orm";

export const USER_FOLLOWS_LIMIT = 200;

/*
  Подписан ли зритель на автора и взаимно ли это — «друг» и есть взаимная подписка.
  blocked — между ними блокировка, подписаться нельзя (спека 26)
*/
export async function followState(viewerId: number, authorId: number){
  const rows = await db.select({ followerId: userFollows.followerId })
    .from(userFollows)
    .where(and(
      eq(userFollows.followerId, viewerId), eq(userFollows.followingId, authorId)
    ))
    .union(
      db.select({ followerId: userFollows.followerId })
        .from(userFollows)
        .where(and(eq(userFollows.followerId, authorId), eq(userFollows.followingId, viewerId)))
    );
  const following = rows.some(r => r.followerId === viewerId);

  return { following, friend: following && rows.some(r => r.followerId === authorId), blocked: isBlockedBetween(db, viewerId, authorId) };
}

export async function followersCount(authorId: number){
  const [ row ] = await db.select({ n: count() }).from(userFollows).where(eq(userFollows.followingId, authorId));

  return row.n;
}

// Число подписчиков у всех, кто смотрит автора (спека 29). После commit
export async function publishFollowersCount(authorIds: number[]){
  for(const userId of authorIds){
    liveBus.publishTopic(userTopic(userId), 'user.followers', { userId, followersCount: await followersCount(userId) });
  }
}
