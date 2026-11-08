import 'server-only';
import { db } from "@/globals/db";
import { comments, postRatings, posts, type PostStatus } from "@/database/schema";
import { and, avg, count, countDistinct, eq, gte, isNull, ne } from "drizzle-orm";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/*
  Цифры автора для «Начала» (спека 42): посты по статусам, средняя оценка опубликованных
  (по всем оценкам, а не среднее средних) и комментарии читателей к его постам — без
  удалённых и без своих
*/
export function authorStats(userId: number, now = new Date()){
  const byStatus = db.select({ status: posts.status, n: count() })
    .from(posts)
    .where(eq(posts.userId, userId))
    .groupBy(posts.status)
    .all();
  const statuses = Object.fromEntries(byStatus.map(row => [ row.status, row.n ])) as Partial<Record<PostStatus, number>>;
  const rating = db.select({ average: avg(postRatings.value), posts: countDistinct(postRatings.postId) })
    .from(postRatings)
    .innerJoin(posts, eq(posts.id, postRatings.postId))
    .where(and(eq(posts.userId, userId), eq(posts.status, 'published')))
    .get();
  const readerComments = and(eq(posts.userId, userId), ne(comments.userId, userId), isNull(comments.deletedAt));
  const commentsTotal = countComments(readerComments);
  const commentsWeek = countComments(and(readerComments, gte(comments.createdAt, new Date(now.getTime() - WEEK))));

  return {
    statuses,
    total: byStatus.reduce((sum, row) => sum + row.n, 0),
    rating: { average: rating?.average == null ? null : Number(rating.average), posts: rating?.posts ?? 0 },
    comments: { total: commentsTotal, week: commentsWeek }
  };
}

function countComments(where: ReturnType<typeof and>){
  return db.select({ n: count() })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .where(where)
    .get()?.n ?? 0;
}
