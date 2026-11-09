import 'server-only';
import { db } from "@/globals/db";
import { postRatings } from "@/database/schema";
import { avg, count, eq, inArray, sum } from "drizzle-orm";

export type RatingStats = { average: number | null, count: number };

/*
  Средняя и число оценок по постам — одним запросом на список
*/
export async function ratingStats(postIds: number[]): Promise<Map<number, RatingStats>> {
  if(postIds.length === 0){
    return new Map();
  }

  const rows = await db.select({ postId: postRatings.postId, average: avg(postRatings.value), count: count() })
    .from(postRatings)
    .where(inArray(postRatings.postId, postIds))
    .groupBy(postRatings.postId);

  return new Map(rows.map(row => [ row.postId, { average: Number(row.average), count: row.count } ]));
}

export async function withRatings<T extends { id: number }>(posts: T[]){
  const stats = await ratingStats(posts.map(p => p.id));

  return posts.map(post => ({ ...post, rating: stats.get(post.id) ?? EMPTY }));
}

export async function postRatingStats(postId: number): Promise<RatingStats> {
  return (await ratingStats([ postId ])).get(postId) ?? EMPTY;
}

/*
  Подзапрос агрегатов оценок по постам: для «Популярных» в ленте и выбора недели
*/
export function ratingAggregate(){
  return db.select({
    postId: postRatings.postId,
    average: avg(postRatings.value).as('rating_average'),
    sum: sum(postRatings.value).as('rating_sum'),
    total: count().as('rating_count')
  })
    .from(postRatings)
    .groupBy(postRatings.postId)
    .as('rating_agg');
}

export async function myRating(postId: number, userId: number){
  const row = await db.query.postRatings.findFirst({
    where: (r, { and }) => and(eq(r.postId, postId), eq(r.userId, userId))
  });

  return row?.value ?? 0;
}

const EMPTY: RatingStats = { average: null, count: 0 };
