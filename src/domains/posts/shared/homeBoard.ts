import 'server-only';
import { db } from "@/globals/db";
import { posts, users } from "@/database/schema";
import { POST_TAGS_WITH, pickTags } from "@/domains/posts/shared/postTags";
import { withCovers } from "@/domains/posts/shared/postImages";
import { ratingAggregate, withRatings } from "@/domains/posts/shared/postRatings";
import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

/*
  Бланк партии на главной: номер хода — порядок первой публикации (publishedAt). Ушедшие из
  ленты посты номер сохраняют, но в бланк не попадают; nextMove — номер следующей публикации
*/
export async function latestMoves(limit: number){
  const numbered = db.select({
    id: posts.id,
    move: sql<number>`ROW_NUMBER() OVER (ORDER BY ${posts.publishedAt}, ${posts.id})`.as('move')
  })
    .from(posts)
    .where(isNotNull(posts.publishedAt))
    .as('numbered');

  const moves = await db.select({
    id: posts.id,
    move: numbered.move,
    title: posts.title,
    type: posts.type,
    publishedAt: posts.publishedAt,
    authorId: users.id,
    authorName: users.name,
    authorAvatarKey: users.avatarKey
  })
    .from(posts)
    .innerJoin(numbered, eq(numbered.id, posts.id))
    .innerJoin(users, eq(users.id, posts.userId))
    .where(eq(posts.status, 'published'))
    .orderBy(desc(numbered.move))
    .limit(limit);

  const [ { total } ] = await db.select({ total: count() }).from(posts).where(isNotNull(posts.publishedAt));

  return { moves, nextMove: total + 1 };
}

// Лучшие по средней оценке опубликованные посты, при равенстве — у кого оценок больше
export async function topRatedPosts(limit: number){
  const agg = ratingAggregate();
  const top = await db.select({ id: posts.id })
    .from(posts)
    .innerJoin(agg, eq(agg.postId, posts.id))
    .where(eq(posts.status, 'published'))
    .orderBy(desc(agg.average), desc(agg.total), desc(posts.id))
    .limit(limit);
  const ids = top.map(t => t.id);

  if(ids.length === 0){
    return [];
  }

  const rows = await db.query.posts.findMany({ where: and(inArray(posts.id, ids)), with: { author: true, ...POST_TAGS_WITH } });
  const ordered = ids.map(id => rows.find(r => r.id === id)!).filter(Boolean);

  return withCovers(await withRatings(ordered.map(post => ({ ...post, tags: pickTags(post) }))));
}
